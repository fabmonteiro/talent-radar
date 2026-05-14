from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Walk up from backend/core/ → backend/ → project root
_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ROOT_ENV),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    SUPABASE_URL: str
    SUPABASE_PUBLISHABLE_KEY: str
    SUPABASE_SECRET_KEY: str

    QDRANT_URL: str
    QDRANT_API_KEY: str

    GEMINI_API_KEY: str


settings = Settings()
