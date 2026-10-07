"""Twilio SMS status and inbound message webhooks."""

import logging
from urllib.parse import parse_qs

from fastapi import APIRouter, Request
from fastapi.responses import Response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks/twilio", tags=["Twilio Webhooks"])


async def _form_fields(request: Request) -> dict[str, str]:
    """Read Twilio's application/x-www-form-urlencoded payload."""
    raw_body = (await request.body()).decode("utf-8", errors="replace")
    return {key: values[0] for key, values in parse_qs(raw_body).items() if values}


@router.post("/sms-status")
async def twilio_sms_status(request: Request) -> dict[str, str]:
    """Receive delivery status callbacks for outbound Twilio messages."""
    data = await _form_fields(request)
    message_sid = data.get("MessageSid", "unknown")
    status = data.get("MessageStatus", data.get("SmsStatus", "unknown"))
    error_code = data.get("ErrorCode")

    if error_code:
        logger.warning(
            "Twilio message %s status=%s error_code=%s", message_sid, status, error_code
        )
    else:
        logger.info("Twilio message %s status=%s", message_sid, status)
    return {"received": "true"}


@router.post("/inbound-sms", response_class=Response)
async def twilio_inbound_sms(request: Request) -> Response:
    """Process inbound STOP/START keywords and return a TwiML acknowledgement."""
    data = await _form_fields(request)
    from_number = data.get("From", "unknown")
    body = data.get("Body", "").strip()
    keyword = body.split(maxsplit=1)[0].upper() if body else ""

    if keyword in {"STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"}:
        action = "opt_out"
        reply = "You have been opted out and will no longer receive SMS messages. Reply START to opt in again."
    elif keyword in {"START", "UNSTOP"}:
        action = "opt_in"
        reply = "You have been opted in and will receive SMS messages again. Reply STOP to opt out."
    else:
        action = "message"
        reply = "Your message has been received. Reply STOP to opt out or START to opt in."

    logger.info("Inbound SMS from %s action=%s", from_number, action)
    twiml = f"<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Message>{reply}</Message></Response>"
    return Response(content=twiml, media_type="application/xml")
