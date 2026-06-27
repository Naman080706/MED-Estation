import asyncio
import os
from config import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

async def test_email():
    try:
        # Override mock for this test
        print(f"Using API Key: {settings.SENDGRID_API_KEY[:5]}...")
        message = Mail(
            from_email='purchasing@zephyra.ai',  # This needs to be a verified sender in SendGrid
            to_emails='pratik2002singh@gmail.com',
            subject='Zephyra AI: Test Email Integration',
            html_content='<strong>This is a test email from the Zephyra AI Pharmacy Platform!</strong>'
        )
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"Status Code: {response.status_code}")
        print(f"Body: {response.body}")
        print(f"Headers: {response.headers}")
        print("Test email sent effectively!")
    except Exception as e:
        print(f"Error sending email: {e}")
        if hasattr(e, 'body'):
            print(f"SendGrid Error Body: {e.body}")

if __name__ == "__main__":
    asyncio.run(test_email())
