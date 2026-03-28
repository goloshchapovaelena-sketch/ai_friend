from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Настройки приложения"""

    # GROQ API
    GROQ_API_KEY: str

    # База данных
    # Для production (Render/Railway) используйте PostgreSQL
    # Для локальной разработки: sqlite+aiosqlite:///./ai_friend.db
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 дней = 10080 минут
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 дней

    # CORS
    FRONTEND_URL: str = "http://localhost:8080"

    # Приложение
    APP_NAME: str = "AI Friend"
    DEBUG: bool = True

    # Stripe (подписки Checkout). Если не заданы ключи и price id — используется DEMO в API.
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PRICE_ID_MONTHLY: Optional[str] = None
    STRIPE_PRICE_ID_YEARLY: Optional[str] = None

    # Порты (не используются напрямую, но могут быть в .env)
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 8080

    class Config:
        # Ищем .env в директории backend (на уровень выше app)
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        case_sensitive = True


settings = Settings()


def stripe_checkout_enabled() -> bool:
    """Реальная оплата через Stripe Checkout, если заданы секрет и оба Price ID."""
    sk = (settings.STRIPE_SECRET_KEY or "").strip()
    return bool(
        sk
        and (settings.STRIPE_PRICE_ID_MONTHLY or "").strip()
        and (settings.STRIPE_PRICE_ID_YEARLY or "").strip()
    )


def stripe_webhook_enabled() -> bool:
    return bool((settings.STRIPE_WEBHOOK_SECRET or "").strip() and stripe_checkout_enabled())
