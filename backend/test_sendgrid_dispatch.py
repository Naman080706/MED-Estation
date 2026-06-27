import asyncio
from dotenv import load_dotenv
import os

# Load the updated .env with the API keys
load_dotenv()

# Force disable mock APIs so Sendgrid actually fires
os.environ["USE_MOCK_APIS"] = "false"

from services.communications import _send_email_po

async def main():
    email = "pratik2002singh@gmail.com"
    print(f"Testing SendGrid Dispatch to {email}...")
    await _send_email_po(email, "TEST_DRUG_CALPOL", 100)
    print("Test triggered.")

if __name__ == "__main__":
    asyncio.run(main())
