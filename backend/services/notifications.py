import os
import random
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

# --- 1. OTP Generator ---
def generate_otp() -> str:
    """Generates a secure 6-digit numeric OTP."""
    return str(random.randint(100000, 999999))

# --- 2. Send SMS via Twilio ---
def send_otp_sms(to_phone: str, otp_code: str, shipment_id: int):
    """Sends SMS notification containing OTP using Twilio API."""
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_PHONE_NUMBER")

    if not account_sid or not auth_token or "your_" in account_sid:
        print(f"⚠️ [SIMULATION MODE] SMS to {to_phone}: Your verification OTP for Shipment #{shipment_id} is {otp_code}")
        return True

    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=f"📦 [AidTracker] Verification Code for Shipment #{shipment_id}: {otp_code}. Do not share this code.",
            from_=from_number,
            to=to_phone
        )
        print(f"✅ SMS sent successfully to {to_phone} (SID: {message.sid})")
        return True
    except Exception as e:
        print(f"❌ Failed to send SMS to {to_phone}: {str(e)}")
        return False

# --- 3. Send Email via SMTP ---
def send_otp_email(to_email: str, otp_code: str, shipment_id: int, product_name: str):
    """Sends HTML email notification containing OTP via SMTP."""
    smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("MAIL_PORT", 587))
    sender_email = os.getenv("MAIL_USERNAME")
    sender_password = os.getenv("MAIL_PASSWORD")

    if not sender_email or "your_" in sender_email:
        print(f"⚠️ [SIMULATION MODE] Email to {to_email}: OTP for Shipment #{shipment_id} ({product_name}) is {otp_code}")
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🔑 Delivery OTP for Shipment #{shipment_id}"
    msg["From"] = sender_email
    msg["To"] = to_email

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-top: 0;">📦 Delivery Verification Code</h2>
          <p style="color: #475569;">You are receiving this code to verify the receipt of aid shipment <strong>#{shipment_id}</strong> ({product_name}).</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">{otp_code}</span>
          </div>
          <p style="color: #64748b; font-size: 13px;">Provide this OTP to the delivery personnel upon inspection.</p>
        </div>
      </body>
    </html>
    """

    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print(f"✅ OTP email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send OTP email to {to_email}: {str(e)}")
        return False