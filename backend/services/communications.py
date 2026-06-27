import logging
from ..config import settings

logger = logging.getLogger(__name__)

async def trigger_supplier_reorder(supplier_email: str, supplier_phone: str, ndc: str, brand_name: str, quantity: int):
    """
    Automated Communication Interface to SendGrid and Twilio.
    Triggers when predictive analytics or FEFO returns flags a critical reorder threshold.
    """
    logger.info(f"Triggering Reorder for {quantity} units of {brand_name} (NDC: {ndc})")
    
    # 1. SENDGRID: Email the Purchase Order
    await _send_email_po(supplier_email, brand_name, quantity)
    
    # 2. TWILIO: SMS to Pharmacy Manager to confirm trigger
    await _send_sms_alert(supplier_phone, f"Reorder sent for {brand_name} ({quantity} units).")
    
    return True

async def _send_email_po(email: str, brand_name: str, quantity: int):
    if settings.USE_MOCK_APIS or not settings.SENDGRID_API_KEY:
        logger.info(f"[MOCK SENDGRID] Emailing PO to {email} for {quantity}x {brand_name}")
        return True
        
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        message = Mail(
            from_email='purchasing@zephyra.ai',
            to_emails=email,
            subject=f'Zephyra AI: Automated Purchase Order for {brand_name}',
            html_content=f'<strong>Automated PO:</strong> Please dispatch {quantity} units immediately based on AI demand velocity predictive trigger.')
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"SendGrid Dispatch Status: {response.status_code}")
    except Exception as e:
        logger.error(f"SendGrid Error: {e}")

async def _send_sms_alert(phone: str, msg_body: str):
    if settings.USE_MOCK_APIS or not settings.TWILIO_ACCOUNT_SID:
        logger.info(f"[MOCK TWILIO] Sending SMS to {phone}: {msg_body}")
        return True
        
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"Zephyra Alert: {msg_body}",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone
        )
        logger.info(f"Twilio Dispatch SID: {message.sid}")
    except Exception as e:
        logger.error(f"Twilio Error: {e}")
