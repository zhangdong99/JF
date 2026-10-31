from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "AI-Office 产品组合治理平台 API"
    API_V1_PREFIX: str = "/api/v1"

    POSTGRES_HOST: str = "127.0.0.1"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "admin"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "ai_office"
    DB_SCHEMA: str = "product_governance"

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:8080"]

    N8N_WEBHOOK_URL: str = "http://ai-office-n8n:5678/webhook/plan-review"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def sync_database_url(self) -> str:  # alembic 用，无 async driver 概念
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
