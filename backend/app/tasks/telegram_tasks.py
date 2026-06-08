import asyncio
import re
import aiohttp
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update, func
from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.db.models import User, TelegramMarketingConfig, TelegramService, TelegramLog
from app.tasks.email_sender import celery


def run_async(coro):
    """Runs a coroutine synchronously, handles cases where an event loop is already running."""
    try:
        asyncio.run(coro)
    except RuntimeError:
        # Loop is already running (e.g. in tests); close the coroutine to prevent "never awaited" warnings
        coro.close()

# Helper for UTC time
def utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)

# Dynamic service rotation selection helper
async def get_next_service(db, user_id: int, active_services: list) -> TelegramService:
    if not active_services:
        return None
        
    # Group active services by category (case-insensitive check)
    imei_services = [s for s in active_services if s.category.lower() == "imei service"]
    server_services = [s for s in active_services if s.category.lower() == "server service"]
    remote_services = [s for s in active_services if s.category.lower() == "remote service"]

    # 1. Fetch total count of successful Telegram posts for this user
    count_query = (
        select(func.count())
        .select_from(TelegramLog)
        .where(TelegramLog.user_id == user_id, TelegramLog.status == "Success")
    )
    count_res = await db.execute(count_query)
    total_success = count_res.scalar() or 0

    # 2. Sequence definition: 2 IMEI, 3 Server, 2 Remote (total cycle length = 7)
    CYCLE_CATEGORIES = [
        "IMEI Service",   # 0
        "IMEI Service",   # 1
        "Server Service", # 2
        "Server Service", # 3
        "Server Service", # 4
        "Remote Service", # 5
        "Remote Service"  # 6
    ]

    cycle_index = total_success % 7
    target_category = None

    # Check for active services in categories, falling back to the next in the cycle if empty
    for i in range(7):
        candidate_idx = (cycle_index + i) % 7
        candidate_cat = CYCLE_CATEGORIES[candidate_idx]
        
        if candidate_cat == "IMEI Service" and imei_services:
            target_category = "IMEI Service"
            break
        elif candidate_cat == "Server Service" and server_services:
            target_category = "Server Service"
            break
        elif candidate_cat == "Remote Service" and remote_services:
            target_category = "Remote Service"
            break

    # If all targeted categories are empty, check if we have any other active services
    if not target_category:
        if active_services:
            # Fallback to the first active service if none matches the standard categories
            return active_services[0]
        return None

    # Determine which services list to use
    if target_category == "IMEI Service":
        cat_services = imei_services
    elif target_category == "Server Service":
        cat_services = server_services
    else:
        cat_services = remote_services

    # Sort the services to ensure deterministic rotation order
    cat_services = sorted(cat_services, key=lambda s: (s.id or 0, s.title.lower()))

    # 3. Find the last successfully posted service in this specific category to decide next
    last_log_query = (
        select(TelegramLog)
        .where(
            TelegramLog.user_id == user_id,
            TelegramLog.status == "Success",
            func.lower(TelegramLog.category) == target_category.lower()
        )
        .order_by(TelegramLog.timestamp.desc())
        .limit(1)
    )
    res = await db.execute(last_log_query)
    last_log = res.scalars().first()

    if not last_log:
        return cat_services[0]

    # Attempt to match title of last run within this category
    for idx, s in enumerate(cat_services):
        if s.title.lower() == last_log.service_title.lower():
            next_idx = (idx + 1) % len(cat_services)
            return cat_services[next_idx]

    return cat_services[0]

# Security Guard - inspect copy for leakage
def contains_leakage(text: str, config: TelegramMarketingConfig) -> tuple[bool, str]:
    sensitive_patterns = [
        (r"gsk_[a-zA-Z0-9]{32,}", "Groq Cloud API Key"),
        (r"[0-9]{8,10}:[a-zA-Z0-9_\-]{35}", "Telegram Bot Token"),
        (r"postgres://[a-zA-Z0-9]+:[a-zA-Z0-9]+@[a-zA-Z0-9_\-\.]+:[0-9]+/?[a-zA-Z0-9]*", "Database URL"),
        (r"postgresql\+asyncpg://[a-zA-Z0-9]+:[a-zA-Z0-9]+@[a-zA-Z0-9_\-\.]+:[0-9]+/?[a-zA-Z0-9]*", "Database Connection URL"),
        (r"JWT_SECRET", "JWT Secret Configuration")
    ]
    
    # Check general patterns
    for pattern, name in sensitive_patterns:
        if re.search(pattern, text):
            return True, name
            
    # Check specific configuration values
    if config.telegram_bot_token and config.telegram_bot_token in text:
        return True, "Active Telegram Bot Token"
    if config.groq_api_key and config.groq_api_key in text:
        return True, "Active Groq API Key"
        
    return False, ""

# Generate promotion via Groq
async def generate_groq_content(config: TelegramMarketingConfig, service: TelegramService, group_services: list[TelegramService]) -> str:
    groq_url = "https://api.groq.com/openai/v1/chat/completions"
    
    system_prompt = (
        "You are an expert copywriter. Write a clean, high-conversion promotional text "
        "suited for Telegram channels. You MUST format the output EXACTLY matching the structure and style "
        "shown in the example below, adapting it to the specific service title, registration domain, and list of group services provided. "
        "Do NOT include any long problem descriptions or context paragraphs.\n\n"
        "--- TEMPLATE STRUCTURE AND EXAMPLE ---\n"
        "🚀 Multi Pro Tool [Official Distributor]\n\n"
        "⚡️ Multi Pro Tool Auth Flash/EFS/FRP/EDL [MTK & QC Auth] For Existing user Refill Credits\n"
        "------------------------------\n\n"
        "Multi Pro Tool offers a powerful solution for instant remote network unlocking. With our super-fast API-based system, you can quickly resolve this issue and get back to your business.\n\n"
        "🔥 Don't miss out on unlocking revenue - act now\n"
        "Register today: iPhoneUnlock.org\n"
        "─────────────────────\n"
        "Best Price ⚡️ Fast Delivery ⚡️ Global Access International Unlocking Server ✅\n"
        "-------------------------------------\n\n"
        "CRITICAL RULES:\n"
        "1. Format the headline strictly as: 🚀 [Group Name] [Official Reseller] or 🚀 [Group Name] [Official Distributor] (replacing [Group Name] with the actual group name provided. Use 'Reseller' or 'Distributor' from context details/keywords, default to 'Reseller' if not specified). Do NOT include any pipe characters (|) or parentheses like ( We Are Official ... ) in the headline under any circumstances.\n"
        "2. Do NOT write any problem descriptions or long context paragraphs. The text must only contain the headline, the services list verbatim (each service prefixed with ⚡️ and followed by the divider ------------------------------), the dynamic AI-generated short solution description paragraph, the dynamic urgency line (which you generate starting with 🔥), the registration/order line (use 'Register today: [URL]' or 'SUBMIT YOUR ORDER: [URL]'), the separator, and the footer.\n"
        "3. The services list block must be output verbatim as provided. Do NOT add any extra divider lines at the end of the services list or before the solution description paragraph.\n"
        "4. Generate a dynamic, high-conversion short solution description paragraph (approx 2 sentences, e.g. '[Tool/Service] offers a powerful solution for [action]. With our [adjective] API-based system, you can quickly resolve this issue and get back to your business.') directly below the services list.\n"
        "5. Generate a dynamic, high-conversion urgency call-to-action line starting with 🔥, tailored to the service (e.g. 🔥 Don't miss out on unlocking revenue - act now) directly below the short solution description paragraph.\n"
        "6. Use either 'Register today: [URL]' or 'SUBMIT YOUR ORDER: [URL]' as the call-to-action link format, replacing [URL] with the exact Target URL / Website provided in the user prompt. Do NOT use any other domains.\n"
        "7. Do NOT include any markdown formatting like bold (**), italics, or markdown headers (#).\n"
        "8. Do NOT output any system notes, code blocks, or intro/outro explanations.\n"
        "9. The line '─────────────────────' (exactly 21 box-drawing horizontal lines) and the footer 'Best Price ⚡️ Fast Delivery ⚡️ Global Access International Unlocking Server ✅' must be included verbatim at the end."
    )
    
    service_titles_str = "\n".join([f"⚡️ {s.title}\n------------------------------" for s in group_services])
    user_prompt = (
        f"Generate a Telegram post utilizing the specified template structure.\n"
        f"Service Title: {service.title}\n"
        f"Group Name: {service.group or 'General'}\n"
        f"Angle & Hook: {service.angle}\n"
        f"Target URL / Website: {config.website_url or 'iPhoneUnlock.org'}\n"
        f"Focus points & keywords: {service.focus}\n\n"
        f"Below is the list of active services in this group that you MUST include verbatim as the service list block:\n"
        f"{service_titles_str}"
    )
    
    headers = {
        "Authorization": f"Bearer {config.groq_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 300
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(groq_url, headers=headers, json=payload, timeout=20) as response:
            if response.status != 200:
                raw_err = await response.text()
                raise Exception(f"Groq API returned HTTP {response.status}: {raw_err}")
                
            res_json = await response.json()
            return res_json["choices"][0]["message"]["content"].strip()

# Dispatch to Telegram channel
async def dispatch_telegram_message(config: TelegramMarketingConfig, message: str) -> None:
    telegram_url = f"https://api.telegram.org/bot{config.telegram_bot_token}/sendMessage"
    
    payload = {
        "chat_id": config.telegram_channel,
        "text": message,
        "parse_mode": "HTML"
    }
    
    # Simple sanitization
    clean_msg = message.replace("<script>", "").replace("</script>", "")
    payload["text"] = clean_msg
    
    async with aiohttp.ClientSession() as session:
        async with session.post(telegram_url, json=payload, timeout=15) as response:
            if response.status != 200:
                raw_err = await response.text()
                raise Exception(f"Telegram API returned HTTP {response.status}: {raw_err}")

# Synchronous job runner wrapper called from API or scheduler
async def execute_telegram_post_job(db, config_id: int) -> tuple[bool, str]:
    config_res = await db.execute(select(TelegramMarketingConfig).where(TelegramMarketingConfig.id == config_id))
    config = config_res.scalars().first()
    if not config:
        return False, "Configuration profile not found."
        
    # Get active services
    services_res = await db.execute(
        select(TelegramService).where(TelegramService.user_id == config.user_id, TelegramService.active == True)
    )
    active_services = list(services_res.scalars().all())
    if not active_services:
        # Log failure
        new_log = TelegramLog(
            user_id=config.user_id,
            timestamp=utc_now_naive(),
            service_title="N/A",
            category="N/A",
            status="Failed",
            message="Dispatch aborted: No active services created in your profile."
        )
        db.add(new_log)
        await db.commit()
        return False, "No active services configured in your profile."
        
    service = await get_next_service(db, config.user_id, active_services)
    
    if not config.telegram_bot_token or not config.telegram_channel or not config.groq_api_key:
        new_log = TelegramLog(
            user_id=config.user_id,
            timestamp=utc_now_naive(),
            service_title=service.title,
            category=service.category,
            status="Failed",
            message="Dispatch aborted: Missing Telegram credentials or Groq API Keys in Settings."
        )
        db.add(new_log)
        await db.commit()
        return False, "Missing credentials or settings keys."
        
    try:
        # 1. Generate Content
        group_services = [s for s in active_services if s.group == service.group]
        ai_copy = await generate_groq_content(config, service, group_services)
        
        # 2. Credential Leak Verification check
        has_leak, leak_desc = contains_leakage(ai_copy, config)
        if has_leak:
            new_log = TelegramLog(
                user_id=config.user_id,
                timestamp=utc_now_naive(),
                service_title=service.title,
                category=service.category,
                status="Failed",
                message=f"FAIL-SAFE TRIGGERED: AI content aborted. Detected sensitive signature matching: {leak_desc}."
            )
            db.add(new_log)
            await db.commit()
            return False, f"Fail-safe aborted: AI output contained sensitive {leak_desc} credentials."
            
        # 3. Deliver to Telegram
        await dispatch_telegram_message(config, ai_copy)
        
        # 4. Record Success Log
        new_log = TelegramLog(
            user_id=config.user_id,
            timestamp=utc_now_naive(),
            service_title=service.title,
            category=service.category,
            status="Success",
            message=ai_copy
        )
        db.add(new_log)
        
        # Update last run/next run timers
        now = utc_now_naive()
        config.last_run = now
        config.next_run = now + timedelta(minutes=config.interval_hours)
        db.add(config)
        
        await db.commit()
        return True, "Marketing message successfully generated and dispatched to Telegram channel!"
        
    except Exception as e:
        # Record Failure Log
        err_msg = str(e)
        new_log = TelegramLog(
            user_id=config.user_id,
            timestamp=utc_now_naive(),
            service_title=service.title,
            category=service.category,
            status="Failed",
            message=f"Dispatch error: {err_msg[:400]}"
        )
        db.add(new_log)
        await db.commit()
        return False, f"Failed to execute posting job: {err_msg}"

# Background daemon checks all active users
async def async_check_and_run_telegram_marketing() -> None:
    await engine.dispose()
    async with AsyncSessionLocal() as db:
        now = utc_now_naive()
        active_configs_res = await db.execute(
            select(TelegramMarketingConfig).where(
                TelegramMarketingConfig.is_active == True,
                (TelegramMarketingConfig.next_run == None) | (TelegramMarketingConfig.next_run <= now)
            )
        )
        configs = active_configs_res.scalars().all()
        for config in configs:
            # Shift next run forward by 30 mins temporarily to avoid concurrency double runs
            config.next_run = now + timedelta(minutes=30)
            await db.commit()
            
            # Fire Celery task
            run_telegram_marketing_task.delay(config.id)
            
    await engine.dispose()

async def async_run_telegram_marketing_task(config_id: int) -> None:
    await engine.dispose()
    async with AsyncSessionLocal() as db:
        await execute_telegram_post_job(db, config_id)
    await engine.dispose()

@celery.task(name="app.tasks.telegram_tasks.run_telegram_marketing_task", bind=True, max_retries=1)
def run_telegram_marketing_task(self, config_id: int) -> None:
    try:
        run_async(async_run_telegram_marketing_task(config_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)

@celery.task(name="app.tasks.telegram_tasks.check_scheduled_telegram_posts_task")
def check_scheduled_telegram_posts_task() -> None:
    try:
        run_async(async_check_and_run_telegram_marketing())
    except Exception as exc:
        print(f"Error checking Telegram schedulers: {exc}")
