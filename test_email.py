import asyncio
from dotenv import load_dotenv
import os

load_dotenv("backend/.env")
os.environ["USE_MOCK_APIS"] = "false"

from backend.services.communications import _send_email_po

async def main():
    email = "pratik2002singh@gmail.com"
    print(f"Testing SendGrid Dispatch to {email}...")
    await _send_email_po(email, "TEST_DRUG_CALPOL", 100)
    print("Test triggered.")

if __name__ == "__main__":
    asyncio.run(main())
