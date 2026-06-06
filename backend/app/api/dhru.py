import base64
import json
import logging
import secrets
import string
from typing import Optional

logger = logging.getLogger("app.api.dhru")
from fastapi import APIRouter, Depends, Request, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import User, SystemConfig, PaymentLog, SubscriptionPlan, DhruApiLog
from app.core.security import get_password_hash
from app.tasks.email_sender import send_system_email_task

def enrich_with_lowercase_keys(data):
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            enriched_v = enrich_with_lowercase_keys(v)
            new_dict[k] = enriched_v
            k_lower = str(k).lower()
            if k_lower != k and k_lower not in ("success", "result", "error", "list", "services", "service"):
                new_dict[k_lower] = enriched_v
        return new_dict
    elif isinstance(data, list):
        return [enrich_with_lowercase_keys(item) for item in data]
    else:
        return data

def dict_to_xml(data: dict) -> str:
    xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<RESPONSE>"]
    
    def serialize(val, parent_key=None):
        if isinstance(val, dict):
            for k, v in val.items():
                tag = str(k)
                tag_upper = tag.upper()
                if isinstance(v, list) and tag_upper == "SERVICES":
                    xml_lines.append(f"<{tag}>")
                    for item in v:
                        sub_tag = "service" if tag.islower() else "SERVICE"
                        xml_lines.append(f"<{sub_tag}>")
                        serialize(item, sub_tag)
                        xml_lines.append(f"</{sub_tag}>")
                    xml_lines.append(f"</{tag}>")
                elif isinstance(v, list) and tag_upper in ("SUCCESS", "ERROR", "LIST"):
                    xml_lines.append(f"<{tag}>")
                    for item in v:
                        serialize(item, tag)
                    xml_lines.append(f"</{tag}>")
                elif isinstance(v, (dict, list)):
                    xml_lines.append(f"<{tag}>")
                    serialize(v, k)
                    xml_lines.append(f"</{tag}>")
                else:
                    val_str = str(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    xml_lines.append(f"<{tag}>{val_str}</{tag}>")
        elif isinstance(val, list):
            for item in val:
                serialize(item)
        else:
            val_str = str(val).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            xml_lines.append(val_str)

    serialize(data)
    xml_lines.append("</RESPONSE>")
    return "\n".join(xml_lines)

def send_response(data: dict, requestformat: Optional[str]) -> Response:
    req_format = str(requestformat).lower().strip() if requestformat else "xml"
    enriched_data = enrich_with_lowercase_keys(data)
    if req_format == "json":
        import json
        return Response(content=json.dumps(enriched_data), media_type="application/json")
    else:
        xml_content = dict_to_xml(enriched_data)
        return Response(content=xml_content, media_type="application/xml")

router = APIRouter()

async def handle_dhru_api_impl(request: Request, db: AsyncSession, context: dict):
    """
    Public API Listener endpoint conforming to Dhru Fusion API Standards.
    Accepts standard form-encoded POST requests or JSON requests.
    """
    username = None
    apiaccesskey = None
    action = None
    parameters_str = None
    
    # Extract requestformat from query string parameters first
    requestformat = request.query_params.get("requestformat") or request.query_params.get("requestFormat") or request.query_params.get("format")

    client_ip = request.client.host if request.client else "unknown"
    form_data = None

    # 1. Parse incoming parameters safely
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body_json = await request.json()
            username = body_json.get("username")
            apiaccesskey = body_json.get("apiaccesskey")
            action = body_json.get("action")
            parameters_str = body_json.get("parameters")
            if not requestformat:
                requestformat = body_json.get("requestformat") or body_json.get("requestFormat") or body_json.get("format")
            context["requestformat"] = requestformat
        except Exception as json_err:
            log = DhruApiLog(
                action="unknown",
                username=None,
                ip_address=client_ip,
                status="failed",
                message=f"Invalid JSON payload: {str(json_err)}"
            )
            db.add(log)
            await db.commit()
            return {
                "ERROR": [
                    {
                        "MESSAGE": f"Invalid JSON payload: {str(json_err)}"
                    }
                ]
            }
    else:
        try:
            form_data = await request.form()
            username = form_data.get("username")
            apiaccesskey = form_data.get("apiaccesskey")
            action = form_data.get("action")
            parameters_str = form_data.get("parameters")
            if not requestformat:
                requestformat = form_data.get("requestformat") or form_data.get("requestFormat") or form_data.get("format")
            context["requestformat"] = requestformat
        except Exception as form_err:
            log = DhruApiLog(
                action="unknown",
                username=None,
                ip_address=client_ip,
                status="failed",
                message=f"Invalid form-encoded payload: {str(form_err)}"
            )
            db.add(log)
            await db.commit()
            return {
                "ERROR": [
                    {
                        "MESSAGE": f"Invalid form-encoded payload: {str(form_err)}"
                    }
                ]
            }

    # 2. Validate core listener configuration & settings
    config_res = await db.execute(select(SystemConfig).where(SystemConfig.id == 1))
    config = config_res.scalars().first()

    if not config or not config.api_listener_enabled:
        log = DhruApiLog(
            action=action or "unknown",
            username=username,
            ip_address=client_ip,
            status="failed",
            message="API listener is disabled or not configured in administrative settings."
        )
        db.add(log)
        await db.commit()
        return {
            "ERROR": [
                {
                    "MESSAGE": "Dhru API integration is currently disabled."
                }
            ]
        }

    # 3. Authenticate request credentials
    expected_user = config.api_listener_username or "dhru_user"
    expected_key = config.api_listener_access_key or "dhru_key_123456"

    if username != expected_user or apiaccesskey != expected_key:
        log = DhruApiLog(
            action=action or "unknown",
            username=username,
            ip_address=client_ip,
            status="failed",
            message=f"Authentication failed. Provided username: '{username}'."
        )
        db.add(log)
        await db.commit()
        return {
            "ERROR": [
                {
                    "MESSAGE": "Authentication failed. Incorrect username or access key."
                }
            ]
        }

    # 4. Decode service parameters safely (handling both base64 and raw JSON formats)
    parameters = {}
    if parameters_str:
        # Try base64 decoding
        decoded_str = None
        try:
            # Add padding characters if missing to prevent base64 decoding failure
            padded_str = str(parameters_str) + "=" * ((4 - len(str(parameters_str)) % 4) % 4)
            decoded_str = base64.b64decode(padded_str.encode("utf-8")).decode("utf-8")
        except Exception as e:
            logger.info("Base64 decoding failed for parameters, fallback to raw parsing: %s", e)

        if decoded_str:
            try:
                parameters = json.loads(decoded_str)
            except Exception as e:
                logger.info("JSON loading failed for base64 decoded parameters: %s", e)

        # Fallback to direct raw JSON parsing
        if not parameters:
            try:
                parameters = json.loads(parameters_str)
            except Exception as e:
                logger.info("Raw JSON parsing fallback failed for parameters: %s", e)

    # Standardize parameters structure (extract from bulk list if needed)
    parameters_dict = {}
    if isinstance(parameters, list) and len(parameters) > 0:
        parameters_dict = parameters[0]
    elif isinstance(parameters, dict):
        parameters_dict = parameters

    # 5. Handle requested API actions
    action_lower = str(action).lower().strip() if action else ""

    try:
        # --- ACTION: accountinfo ---
        if action_lower == "accountinfo":
            log_msg = f"Account info requested. Credentials verified. Format: {requestformat} | Query: {dict(request.query_params)} | Form: {dict(form_data) if form_data is not None else 'None'} | Headers: {dict(request.headers)}"
            log = DhruApiLog(
                action="accountinfo",
                username=username,
                ip_address=client_ip,
                status="success",
                message=log_msg
            )
            db.add(log)
            await db.commit()

            account_data = {
                "MESSAGE": "Authentication successful",
                "STATUS": "SUCCESS",
                "status": "1",
                "BALANCE": "999999.00",
                "CREDIT": "999999.00",
                "CREDITS": "999999.00",
                "CURRENCY": "USD",
                "EMAIL": "ipsabdurrazzak@gmail.com",
                "MAIL": "ipsabdurrazzak@gmail.com",
                "USERNAME": "ipsabdurrazzak",
                "ADMINEMAIL": "ipsabdurrazzak@gmail.com",
                "ADMIN_EMAIL": "ipsabdurrazzak@gmail.com",
                "SCRIPTTYPE": "otherscript"
            }
            
            is_json = False
            if requestformat:
                is_json = str(requestformat).lower().strip() == "json"
                
            if is_json:
                # Support both array-like access SUCCESS[0]['EMAIL'] and dict-like access SUCCESS['EMAIL']
                success_val = {
                    **account_data,
                    "0": account_data
                }
                return {
                    "status": "success",
                    "SUCCESS": success_val,
                    "RESULT": success_val,
                    "data": success_val,
                    **account_data
                }
            else:
                return {
                    "SUCCESS": account_data
                }

        # --- ACTION: imeiservicelist ---
        elif action_lower in ("imeiservicelist", "servicelist"):
            plans_res = await db.execute(select(SubscriptionPlan))
            plans = plans_res.scalars().all()

            services = []
            for plan in plans:
                services.append({
                    "SERVICEID": str(plan.id),
                    "SERVICENAME": f"{plan.name} Plan ({plan.quota} Emails/mo)",
                    "CREDIT": f"{plan.price / 100:.2f}"
                })

            log = DhruApiLog(
                action="imeiservicelist",
                username=username,
                ip_address=client_ip,
                status="success",
                message=f"Service list fetched successfully. Returned {len(services)} active subscription plans."
            )
            db.add(log)
            await db.commit()

            return {
                "SUCCESS": [
                    {
                        "LIST": [
                            {
                                "GROUPNAME": "SmartCampaign SaaS Subscriptions",
                                "SERVICES": services
                            }
                        ]
                    }
                ]
            }

        # --- ACTION: placeimeiorder ---
        elif action_lower == "placeimeiorder":
            plan_id = parameters_dict.get("ID") or parameters_dict.get("serviceid")
            if not plan_id:
                raise ValueError("Missing 'ID' or 'serviceid' parameter in request.")

            # Look up target user email from typical inputs
            target_email = None
            for key in ["email", "username", "IMEI", "imei", "customfield", "customfield1"]:
                val = parameters_dict.get(key)
                if val and "@" in str(val):
                    target_email = str(val).strip()
                    break

            if not target_email:
                # Fallback: scan all parameters for any email format
                for val in parameters_dict.values():
                    if val and isinstance(val, str) and "@" in val:
                        target_email = val.strip()
                        break

            if not target_email:
                raise ValueError("Failed to extract target user email address from IMEI/custom parameters.")

            # Retrieve subscription plan
            plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == int(plan_id)))
            plan = plan_res.scalars().first()
            if not plan:
                raise ValueError(f"Subscription plan with ID {plan_id} not found in catalog.")

            # Search user in database
            user_res = await db.execute(select(User).where(User.email == target_email))
            user = user_res.scalars().first()

            if not user:
                log_message = f"Order rejected. Email '{target_email}' not found in database."
                log = DhruApiLog(
                    action="placeimeiorder",
                    username=username,
                    ip_address=client_ip,
                    status="failed",
                    message=log_message
                )
                db.add(log)
                await db.commit()

                return {
                    "ERROR": [
                        {
                            "MESSAGE": "Email Not Found. Please Register and Submit Again Your Order."
                        }
                    ]
                }

            # Update existing user subscription plan details
            user.subscription_tier = plan.tier
            user.quota_limit = plan.quota
            user.is_active = True
            db.add(user)

            # Record simulated Payment Log
            new_payment = PaymentLog(
                user_id=user.id,
                user_email=user.email,
                amount=float(plan.price) / 100.0,
                currency="USD",
                plan_tier=plan.tier,
                gateway="DhruFusionAPI",
                status="paid",
                notes=f"API Order placed via Dhru Fusion. Service ID: {plan_id}."
            )
            db.add(new_payment)
            await db.commit()
            await db.refresh(new_payment)

            reference_id = str(new_payment.id)

            # Calculate expire date (30 days from now)
            from datetime import datetime, timedelta
            expire_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")

            success_msg = f"Order processed successfully for user '{target_email}'. | Tier upgraded to '{plan.tier}'. Expaire Date : {expire_date} | Remaing Days : 30 | Reference ID: {reference_id}. (New User: False)"

            # Log to DB logs
            log = DhruApiLog(
                action="placeimeiorder",
                username=username,
                ip_address=client_ip,
                status="success",
                message=success_msg
            )
            db.add(log)
            await db.commit()

            return {
                "SUCCESS": [
                    {
                        "MESSAGE": success_msg,
                        "REFERENCEID": reference_id
                    }
                ]
            }

        # --- ACTION: getimeiorder ---
        elif action_lower in ("getimeiorder", "orderstatus"):
            order_id = parameters_dict.get("ID") or parameters_dict.get("referenceid")
            if not order_id:
                raise ValueError("Missing 'ID' or 'referenceid' parameter in request.")

            pay_res = await db.execute(select(PaymentLog).where(PaymentLog.id == int(order_id)))
            payment = pay_res.scalars().first()

            if payment and payment.status == "paid":
                log = DhruApiLog(
                    action="getimeiorder",
                    username=username,
                    ip_address=client_ip,
                    status="success",
                    message=f"Order status requested for Ref ID: {order_id}. Status: Completed."
                )
                db.add(log)
                await db.commit()

                return {
                    "SUCCESS": [
                        {
                            "STATUS": "4",  # Conforms to completed status
                            "MESSAGE": "Order completed successfully",
                            "CODE": "Subscription activated successfully"
                        }
                    ]
                }
            else:
                log = DhruApiLog(
                    action="getimeiorder",
                    username=username,
                    ip_address=client_ip,
                    status="success",
                    message=f"Order status requested for Ref ID: {order_id}. Status: Processing/Not Found."
                )
                db.add(log)
                await db.commit()

                return {
                    "SUCCESS": [
                        {
                            "STATUS": "2",  # Processing status
                            "MESSAGE": "Order is currently processing",
                            "CODE": "Activation pending"
                        }
                    ]
                }

        # --- ACTION: unknown ---
        else:
            raise ValueError(f"Action '{action}' is not supported by this API listener.")

    except Exception as ex:
        err_msg = str(ex)
        log = DhruApiLog(
            action=action or "unknown",
            username=username,
            ip_address=client_ip,
            status="failed",
            message=f"Internal handler error: {err_msg}"
        )
        db.add(log)
        await db.commit()

        return {
            "ERROR": [
                {
                    "MESSAGE": f"Operation failed: {err_msg}"
                }
            ]
        }


@router.post("")
@router.post("/")
@router.post("/api.php")
@router.post("/index.php")
@router.post("/api/api.php")
@router.post("/api/index.php")
@router.post("/dhru_bridge")
async def handle_dhru_api(request: Request, db: AsyncSession = Depends(get_db)):
    context = {"requestformat": None}
    result = await handle_dhru_api_impl(request, db, context)
    return send_response(result, context["requestformat"])
