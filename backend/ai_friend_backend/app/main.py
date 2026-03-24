import sys
import os
import re

# Добавляем backend в PYTHONPATH
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.abspath(os.path.join(current_dir, '..'))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, get_db
from app.routes import auth, chat, friends

# Создание таблиц БД
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


class CORSRegexMiddleware:
    """CORS middleware с поддержкой regex для origins"""

    def __init__(self, app):
        self.app = app
        # Паттерны для Vercel и Render доменов
        self.allowed_origin_patterns = [
            r'^https://ai-friend-.*\.vercel\.app$',
            r'^https://ai-friend\.vercel\.app$',
            r'^https://.*\.vercel\.app$',
            r'^https://.*\.onrender\.com$',
        ]
        self.exact_origins = [
            "http://localhost:8080",
            "http://localhost:5173",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:5173",
        ]
        if settings.FRONTEND_URL:
            self.exact_origins.append(settings.FRONTEND_URL)

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'http':
            headers = dict(scope.get('headers', []))
            origin = headers.get(b'origin', b'').decode()
            method = scope.get('method', '')

            is_allowed = (
                origin in self.exact_origins or
                any(re.match(pattern, origin) for pattern in self.allowed_origin_patterns)
            )

            # Обработка preflight OPTIONS запроса
            if method == 'OPTIONS' and is_allowed and origin:
                await send({
                    'type': 'http.response.start',
                    'status': 200,
                    'headers': [
                        (b'access-control-allow-origin', origin.encode()),
                        (b'access-control-allow-credentials', b'true'),
                        (b'access-control-allow-methods', b'GET, POST, PUT, DELETE, OPTIONS'),
                        (b'access-control-allow-headers', b'Content-Type, Authorization'),
                        (b'content-length', b'0'),
                    ],
                })
                await send({
                    'type': 'http.response.body',
                    'body': b'',
                })
                return

            if is_allowed and origin:
                # Добавляем CORS заголовки
                async def send_with_cors(message):
                    if message['type'] == 'http.response.start':
                        headers = list(message.get('headers', []))
                        headers.extend([
                            (b'access-control-allow-origin', origin.encode()),
                            (b'access-control-allow-credentials', b'true'),
                            (b'access-control-allow-methods', b'GET, POST, PUT, DELETE, OPTIONS'),
                            (b'access-control-allow-headers', b'Content-Type, Authorization'),
                        ])
                        message = {**message, 'headers': headers}
                    await send(message)
                await self.app(scope, receive, send_with_cors)
            else:
                await self.app(scope, receive, send)
        else:
            await self.app(scope, receive, send)


app = FastAPI(title=settings.APP_NAME)

# Добавляем кастомный CORS middleware
app.add_middleware(CORSRegexMiddleware)

# Роуты
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(friends.router, prefix="/api/friends", tags=["Friends"])


@app.on_event("startup")
async def on_startup():
    """Инициализация БД при запуске"""
    await init_db()


@app.get("/")
async def root():
    return {"message": "AI Friend API is running", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
