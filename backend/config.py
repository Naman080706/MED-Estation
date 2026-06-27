from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "Zephyra AI Pharmacy Platform"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./pharmacy.db"
    
    # Thresholds
    LOW_STOCK_THRESHOLD: int = 50
    EXPIRY_WARN_DAYS: int = 90
    
    # API Keys & Third-Party
    GROQ_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    SENDGRID_API_KEY: str = ""
    
    # Toggles
    USE_MOCK_APIS: bool = True
    
    # Load environment from both project-root .env and backend/.env
    # so local backend/.env (which holds GROQ_API_KEY etc.) is honored.
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
