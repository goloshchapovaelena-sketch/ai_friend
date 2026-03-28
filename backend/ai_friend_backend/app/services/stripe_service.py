import logging
import stripe
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.subscription import Subscription
from app.models.user import User
from app.config import settings

logger = logging.getLogger(__name__)


class StripeService:
    """Сервис для работы со Stripe"""

    def __init__(self):
        key = (settings.STRIPE_SECRET_KEY or "").strip()
        if not key:
            raise ValueError("STRIPE_SECRET_KEY не задан")
        stripe.api_key = key
    
    async def create_checkout_session(
        self, 
        db: AsyncSession, 
        user: User, 
        plan_type: str = "monthly"
    ) -> dict:
        """Создать сессию checkout для оплаты"""
        
        # Определяем Price ID в зависимости от плана
        price_id = (
            settings.STRIPE_PRICE_ID_YEARLY 
            if plan_type == "yearly" 
            else settings.STRIPE_PRICE_ID_MONTHLY
        )
        
        if not price_id:
            raise ValueError(f"Price ID для плана {plan_type} не настроен")
        
        # Создаём или получаем подписку в БД
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            subscription = Subscription(
                user_id=user.id,
                plan_type=plan_type,
                payment_provider="stripe"
            )
            db.add(subscription)
            await db.flush()
        else:
            subscription.plan_type = plan_type
            await db.flush()
        
        # Создаём сессию checkout
        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',  # Подписка (рекуррентные платежи)
                success_url=f"{settings.FRONTEND_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/subscription/cancel",
                client_reference_id=str(user.id),
                metadata={
                    'user_id': str(user.id),
                    'subscription_id': str(subscription.id),
                    'plan_type': plan_type,
                },
                subscription_data={
                    'metadata': {
                        'user_id': str(user.id),
                        'plan_type': plan_type,
                    },
                },
                customer_email=user.email,  # Автозаполнение email
            )
            await db.flush()
            
            logger.info(f"Created checkout session {checkout_session.id} for user {user.id}")
            
            return {
                "checkout_url": checkout_session.url,
                "session_id": checkout_session.id,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {e}")
            raise ValueError(f"Ошибка Stripe: {str(e)}")
    
    async def handle_webhook(self, payload: bytes, sig_header: str) -> dict:
        """Обработка webhook от Stripe"""
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise ValueError("Invalid webhook signature")
        
        # Обрабатываем разные типы событий
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            await self._handle_checkout_completed(session)
            
        elif event['type'] == 'customer.subscription.created':
            subscription_data = event['data']['object']
            await self._handle_subscription_created(subscription_data)
            
        elif event['type'] == 'customer.subscription.updated':
            subscription_data = event['data']['object']
            await self._handle_subscription_updated(subscription_data)
            
        elif event['type'] == 'customer.subscription.deleted':
            subscription_data = event['data']['object']
            await self._handle_subscription_deleted(subscription_data)
        
        return {"status": "success"}
    
    async def _handle_checkout_completed(self, session: dict):
        """Обработка успешного завершения checkout — основной путь активации премиума."""
        from datetime import datetime
        from app.database import async_session_maker

        logger.info("Checkout completed: %s", session.get("id"))
        if session.get("mode") != "subscription":
            return
        stripe_sub_id = session.get("subscription")
        ref = session.get("client_reference_id")
        if not stripe_sub_id or not ref:
            logger.warning("checkout.session.completed: нет subscription или client_reference_id")
            return
        try:
            user_id = int(ref)
        except (TypeError, ValueError):
            logger.error("Некорректный client_reference_id: %s", ref)
            return

        meta = session.get("metadata") or {}
        plan_type = meta.get("plan_type") or "monthly"

        stripe_sub = stripe.Subscription.retrieve(stripe_sub_id)
        period_end = getattr(stripe_sub, "current_period_end", None)

        async with async_session_maker() as db:
            result = await db.execute(
                select(Subscription).where(Subscription.user_id == user_id)
            )
            subscription = result.scalar_one_or_none()
            if not subscription:
                logger.warning("Нет записи подписки для user_id=%s", user_id)
                return
            subscription.is_premium = True
            subscription.subscription_id = stripe_sub_id
            subscription.payment_provider = "stripe"
            subscription.plan_type = plan_type
            if period_end:
                subscription.expires_at = datetime.fromtimestamp(period_end)
            await db.commit()
            logger.info("Premium активирован для user %s (checkout.session.completed)", user_id)

    async def _handle_subscription_created(self, subscription_data: dict):
        """Запасной путь: metadata на Stripe Subscription задаётся в checkout (subscription_data)."""
        from datetime import datetime, timedelta
        from app.database import async_session_maker

        meta = subscription_data.get("metadata") or {}
        ref = meta.get("user_id")
        if not ref:
            return
        try:
            user_id = int(ref)
        except (TypeError, ValueError):
            return

        stripe_subscription_id = subscription_data["id"]
        period_end = subscription_data.get("current_period_end")

        async with async_session_maker() as db:
            result = await db.execute(
                select(Subscription).where(Subscription.user_id == user_id)
            )
            subscription = result.scalar_one_or_none()
            if not subscription:
                return
            subscription.is_premium = True
            subscription.subscription_id = stripe_subscription_id
            subscription.payment_provider = "stripe"
            if meta.get("plan_type"):
                subscription.plan_type = meta["plan_type"]
            if period_end:
                subscription.expires_at = datetime.fromtimestamp(period_end)
            else:
                subscription.expires_at = datetime.utcnow() + timedelta(days=30)
            await db.commit()
            logger.info("Premium активирован для user %s (customer.subscription.created)", user_id)
    
    async def _handle_subscription_updated(self, subscription_data: dict):
        """Обновление подписки"""
        from app.database import async_session_maker
        
        stripe_subscription_id = subscription_data['id']
        
        async with async_session_maker() as db:
            result = await db.execute(
                select(Subscription).where(Subscription.subscription_id == stripe_subscription_id)
            )
            subscription = result.scalar_one_or_none()
            
            if subscription:
                # Если подписка активна
                if subscription_data['status'] == 'active':
                    subscription.is_premium = True
                    from datetime import datetime
                    if subscription_data['current_period_end']:
                        subscription.expires_at = datetime.fromtimestamp(subscription_data['current_period_end'])
                # Если отменена
                elif subscription_data['status'] == 'canceled':
                    subscription.is_premium = False
                
                await db.flush()
                await db.commit()
    
    async def _handle_subscription_deleted(self, subscription_data: dict):
        """Удаление подписки"""
        from app.database import async_session_maker
        
        stripe_subscription_id = subscription_data['id']
        
        async with async_session_maker() as db:
            result = await db.execute(
                select(Subscription).where(Subscription.subscription_id == stripe_subscription_id)
            )
            subscription = result.scalar_one_or_none()
            
            if subscription:
                subscription.is_premium = False
                await db.flush()
                await db.commit()
                logger.info(f"Deactivated premium for subscription {stripe_subscription_id}")
    
    async def create_portal_session(self, user_id: int) -> dict:
        """Создать сессию для управления подпиской в Stripe Customer Portal"""
        from app.database import async_session_maker
        
        async with async_session_maker() as db:
            result = await db.execute(
                select(Subscription).where(Subscription.user_id == user_id)
            )
            subscription = result.scalar_one_or_none()
            
            if not subscription or not subscription.subscription_id:
                raise ValueError("Подписка не найдена")
            
            # Получаем customer_id из Stripe
            stripe_subscription = stripe.Subscription.retrieve(subscription.subscription_id)
            customer_id = stripe_subscription.customer
            
            # Создаём сессию портала
            portal_session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{settings.FRONTEND_URL}/chat",
            )
            
            return {"portal_url": portal_session.url}
