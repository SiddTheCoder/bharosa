"""Application settings (pydantic-settings, reads from .env / environment)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "bharosa"

    # Server
    PORT: int = 8000

    # LLM provider keys (the LLM layer also reads these from the OS env / registry).
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    COHERE_API_KEY: str = ""
    CEREBRAS_API_KEY: str = ""
    SAMBANOVA_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""

    # Groq model default (consumed by the copied groq_client).
    GROQ_DEFAULT_MODEL: str = "llama-3.3-70b-versatile"

    # Voice (Sensor 2)
    ELEVENLABS_API_KEY: str = ""

    # Firebase Admin (auth) — service-account JSON (inline string or path) + project id.
    # Read from .env only. If empty, auth endpoints return 503 but the server still boots.
    FIREBASE_CREDENTIALS_JSON: str = ""
    FIREBASE_PROJECT_ID: str = ""


settings = Settings()
