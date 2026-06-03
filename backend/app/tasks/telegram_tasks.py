import asyncio
import re
import aiohttp
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update, func
from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.db.models import User, TelegramMarketingConfig, TelegramService, TelegramLog
from app.tasks.email_sender import celery

# Helper for UTC time
def utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)

# Dynamic service rotation selection helper
async def get_next_service(db, user_id: int, active_services: list) -> TelegramService:
    if not active_services:
        return None
        
    # Get last successful dispatch log to find which service was run last
    last_log_query = (
        select(TelegramLog)
        .where(TelegramLog.user_id == user_id, TelegramLog.status == "Success")
        .order_by(TelegramLog.timestamp.desc())
        .limit(1)
    )
    res = await db.execute(last_log_query)
    last_log = res.scalars().first()
    
    if not last_log:
        return active_services[0]
        
    # Attempt to match title of last run
    for idx, s in enumerate(active_services):
        if s.title.lower() == last_log.service_title.lower():
            next_idx = (idx + 1) % len(active_services)
            return active_services[next_idx]
            
    return active_services[0]

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
async def generate_groq_content(config: TelegramMarketingConfig, service: TelegramService) -> str:
    groq_url = "https://api.groq.com/openai/v1/chat/completions"
    
    system_prompt = (
        "You are an expert copywriter. Write a high-conversion, professional promotional copy "
        "suited for Telegram channels. Limit copy strictly between 100 to 130 words. "
        "Do not include any placeholders, HTML metadata tags, system secrets, or config variables."
    )
    
    user_prompt = (
        f"Generate promotional content targeting the category '{service.category}'.\n"
        f"Topic Title: {service.title}\n"
        f"Focus points to cover: {service.focus}\n"
        f"Focus angle: {service.angle}\n\n"
        "Ensure professional readability, engaging hook, benefit highlights, and a clean call to action."
    )
    
    headers = {
        "Authorization": f"Bearer {config.groq_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama3-70b-8192",
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
        ai_copy = await generate_groq_content(config, service)
        
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
        config.next_run = now + timedelta(hours=config.interval_hours)
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
        asyncio.run(async_run_telegram_marketing_task(config_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)

@celery.task(name="app.tasks.telegram_tasks.check_scheduled_telegram_posts_task")
def check_scheduled_telegram_posts_task() -> None:
    try:
        asyncio.run(async_check_and_run_telegram_marketing())
    except Exception as exc:
        print(f"Error checking Telegram schedulers: {exc}")
