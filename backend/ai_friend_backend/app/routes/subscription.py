import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.subscription_service import SubscriptionService
from app.services.stripe_service import StripeService
from app.schemas.subscription import SubscriptionResponse, PaymentRequest
from app.utils.security import get_current_user
from app.models.user import User
from app.config import stripe_checkout_enabled, stripe_webhook_enabled

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=SubscriptionResponse)
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить информацию о подписке пользователя"""
    subscription_service = SubscriptionService(db)
    info = await subscription_service.get_subscription_info(current_user)

    return SubscriptionResponse(
        is_premium=info["is_premium"],
        plan_type=info["plan_type"],
        messages_count=info["messages_count"],
        messages_limit=info["messages_limit"],
        remaining_messages=info["remaining_messages"],
        started_at=info["started_at"],
        expires_at=info["expires_at"],
    )


@router.post("/create-checkout")
async def create_checkout_session(
    payment_request: PaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Создать сессию Stripe Checkout для оплаты подписки (месяц / год).
    Если Stripe не настроен в .env — включается DEMO-активация без редиректа.
    """
    if stripe_checkout_enabled():
        logger.info(
            "User %s creating Stripe checkout: %s",
            current_user.id,
            payment_request.plan_type,
        )
        try:
            stripe_service = StripeService()
            result = await stripe_service.create_checkout_session(
                db, current_user, payment_request.plan_type
            )
            return {
                "success": True,
                "checkout_url": result["checkout_url"],
                "session_id": result["session_id"],
                "demo_mode": False,
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    logger.info(
        "User %s checkout (DEMO): %s — Stripe не настроен",
        current_user.id,
        payment_request.plan_type,
    )
    subscription_service = SubscriptionService(db)
    await subscription_service.activate_premium(
        user_id=current_user.id,
        plan_type=payment_request.plan_type,
        payment_provider="demo",
        subscription_id=f"demo_{current_user.id}",
    )

    return {
        "success": True,
        "checkout_url": None,
        "session_id": None,
        "demo_mode": True,
        "message": "Подписка активирована в DEMO режиме (укажите STRIPE_* в .env для реальной оплаты)",
    }


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
):
    """
    Webhook Stripe: подпись `Stripe-Signature`, сырое тело запроса.
    """
    if not stripe_webhook_enabled():
        logger.warning("Stripe webhook вызван, но Stripe или STRIPE_WEBHOOK_SECRET не настроены")
        raise HTTPException(status_code=503, detail="Stripe webhook не настроен")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Отсутствует заголовок Stripe-Signature")

    try:
        stripe_service = StripeService()
        await stripe_service.handle_webhook(payload, sig_header)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "success"}


@router.get("/portal")
async def create_portal_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ссылка на Stripe Customer Portal (управление подпиской и картой)."""
    if not stripe_checkout_enabled():
        return {
            "success": False,
            "portal_url": None,
            "message": "Stripe не настроен",
        }

    try:
        stripe_service = StripeService()
        result = await stripe_service.create_portal_session(current_user.id)
        return {"success": True, "portal_url": result["portal_url"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/success")
async def subscription_success():
    """Страница успешной оплаты (redirect с frontend)"""
    return {"success": True, "message": "Подписка активирована"}


@router.get("/cancel")
async def subscription_cancel():
    """Страница отмены оплаты"""
    return {"success": False, "message": "Оплата отменена"}


@router.post("/activate")
async def activate_subscription(
    payment_request: PaymentRequest = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Активировать подписку вручную (DEMO). В production используйте /create-checkout + Stripe.
    """
    logger.info(f"User {current_user.id} activating subscription (DEMO)")

    subscription_service = SubscriptionService(db)

    subscription = await subscription_service.activate_premium(
        user_id=current_user.id,
        plan_type=payment_request.plan_type if payment_request else "monthly",
        payment_provider="demo",
        subscription_id=f"demo_{current_user.id}",
    )

    return {
        "success": True,
        "message": "Подписка активирована (DEMO режим)",
        "subscription": {
            "is_premium": subscription.is_premium,
            "plan_type": subscription.plan_type,
            "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
        },
    }


@router.post("/reset-counter")
async def reset_message_counter(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Сбросить счётчик сообщений (для тестирования).

    В production этот endpoint нужно удалить или защитить админским доступом.
    """
    current_user.messages_count = 0
    await db.flush()

    logger.info(f"User {current_user.id} reset message counter to 0")

    return {
        "success": True,
        "message": "Счётчик сообщений сброшен",
        "messages_count": 0,
    }
