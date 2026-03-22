# 🚀 План разработки AI Friend

**Стек:** Python + FastAPI (бэкенд) + GROQ AI + React (фронтенд)
**Версия плана:** 2.0
**Дата обновления:** 17 марта 2026
**Структура:** Monorepo (frontend/, backend/)

---

## 📁 Структура проекта

```
ai_friend_1.0.1/
├── frontend/                 # React + Vite приложение
│   ├── src/
│   │   ├── components/      # UI компоненты
│   │   ├── pages/           # Страницы приложения
│   │   ├── hooks/           # React хуки
│   │   ├── services/        # API сервисы
│   │   ├── types/           # TypeScript типы
│   │   └── App.tsx          # Корневой компонент
│   ├── public/              # Статические файлы
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── backend/                  # FastAPI приложение
│   ├── ai_friend_backend/
│   │   ├── app/
│   │   │   ├── routes/      # API эндпоинты
│   │   │   ├── services/    # Бизнес-логика
│   │   │   ├── models/      # SQLAlchemy модели
│   │   │   ├── schemas/     # Pydantic схемы
│   │   │   └── main.py      # Точка входа
│   │   ├── tests/           # Тесты
│   │   └── requirements.txt
│   ├── personality.py       # Пресеты личностей
│   └── Dockerfile
│
├── .env.example             # Шаблон переменных окружения
├── docker-compose.yml       # Docker Compose конфигурация
└── README.md
```

### 1.2. Установка зависимостей

```bash
cd ai_friend_backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Основные зависимости
pip install fastapi uvicorn[standard] python-dotenv pydantic
pip install sqlalchemy aiosqlite asyncpg  # БД
pip install groq  # GROQ клиент
pip install passlib[bcrypt] python-jose[cryptography]  # Auth
pip install httpx  # HTTP запросы

# Для разработки
pip install pytest pytest-asyncio httpx  # Тесты
pip install black isort flake8  # Линтеры
```

### 1.3. Базовая конфигурация (.env)

```env
# GROQ API
GROQ_API_KEY=your_api_key_here

# База данных
DATABASE_URL=sqlite+aiosqlite:///./ai_friend.db
# Для продакшена: DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/ai_friend

# JWT
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
FRONTEND_URL=http://localhost:8080

# Приложение
APP_NAME=AI Friend
DEBUG=true
```

### 1.4. Создание FastAPI приложения

**Файл:** `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routes import auth, chat, friends

# Создание таблиц БД
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роуты
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(friends.router, prefix="/api/friends", tags=["Friends"])

@app.get("/")
async def root():
    return {"message": "AI Friend API is running"}
```

---

## 🎯 Этап 2: GROQ AI интеграция (День 2-3)

### 2.1. Настройка GROQ клиента

**Файл:** `app/services/groq_service.py`

```python
from groq import Groq
from app.config import settings
from typing import List, Dict

class GroqService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "llama-3.3-70b-versatile"  # или "gemma2-9b-it"
    
    async def get_completion(
        self, 
        messages: List[Dict[str, str]],
        system_prompt: str = None,
        temperature: float = 0.7,
        max_tokens: int = 1024
    ) -> str:
        """Получить ответ от AI"""
        
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        return response.choices[0].message.content
    
    async def get_friend_response(
        self, 
        user_message: str, 
        friend_profile: dict,
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """Получить ответ от AI-друга с учётом профиля"""
        
        system_prompt = f"""Ты — {friend_profile['name']}, AI-друг пользователя.

Твой характер: {friend_profile['personality']}
Стиль общения: {friend_profile['tone']}

Ты должен:
- Быть тёплым, эмпатичным и поддерживающим
- Запоминать детали из разговоров
- Задавать уточняющие вопросы
- Быть искренним и честным

Отвечай на русском языке, если пользователь не указал иное."""

        messages = conversation_history[-10:]  # Последние 10 сообщений
        messages.append({"role": "user", "content": user_message})
        
        return await self.get_completion(
            messages=messages,
            system_prompt=system_prompt,
            temperature=0.8,  # Более креативные ответы
        )
```

### 2.2. Доступные модели GROQ

| Модель | Скорость | Качество | Цена (за 1M токенов) |
|--------|----------|----------|---------------------|
| `llama-3.3-70b-versatile` | Быстро | Отличное | $0.59 input / $0.79 output |
| `llama-3.1-8b-instant` | Очень быстро | Хорошее | $0.05 input / $0.08 output |
| `gemma2-9b-it` | Быстро | Хорошее | $0.20 input / $0.20 output |
| `mixtral-8x7b-32768` | Средне | Отличное | $0.24 input / $0.24 output |

**Рекомендация:** 
- Для начала: `llama-3.1-8b-instant` (дёшево, быстро)
- Для продакшена: `llama-3.3-70b-versatile` (лучшее качество)

---

## 🎯 Этап 3: База данных (День 3-4)

### 3.1. Модели данных

**Файл:** `app/models/user.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Связи
    friends = relationship("Friend", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")
```

**Файл:** `app/models/friend.py`

```python
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Friend(Base):
    __tablename__ = "friends"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    personality = Column(Text)  # Характер
    tone = Column(String)  # Стиль общения
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Связи
    user = relationship("User", back_populates="friends")
    messages = relationship("Message", back_populates="friend", cascade="all, delete-orphan")
```

**Файл:** `app/models/message.py`

```python
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    role = Column(String, nullable=False)  # "user" или "assistant"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    friend_id = Column(Integer, ForeignKey("friends.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Связи
    user = relationship("User", back_populates="messages")
    friend = relationship("Friend", back_populates="messages")
```

### 3.2. Схемы Pydantic

**Файл:** `app/schemas/chat.py`

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MessageCreate(BaseModel):
    content: str
    friend_id: int

class MessageResponse(BaseModel):
    id: int
    content: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str
    friend_id: int

class ChatResponse(BaseModel):
    user_message: MessageResponse
    ai_response: MessageResponse
```

---

## 🎯 Этап 4: API эндпоинты (День 4-5)

### 4.1. Роуты

**Файл:** `app/routes/chat.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.groq_service import GroqService
from app.services.chat_service import ChatService
from app.schemas.chat import ChatRequest, ChatResponse
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отправить сообщение AI-другу и получить ответ"""
    
    chat_service = ChatService(db, GroqService())
    
    try:
        result = await chat_service.send_message(
            user=current_user,
            friend_id=request.friend_id,
            user_message=request.message,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{friend_id}")
async def get_chat_history(
    friend_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить историю чата с другом"""
    # Реализация
    pass
```

**Файл:** `app/routes/friends.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.schemas.friend import FriendCreate, FriendResponse
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=FriendResponse)
async def create_friend(
    friend: FriendCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать нового AI-друга"""
    # Реализация
    pass

@router.get("/", response_model=List[FriendResponse])
async def list_friends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить список всех друзей пользователя"""
    # Реализация
    pass

@router.get("/{friend_id}", response_model=FriendResponse)
async def get_friend(
    friend_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Получить информацию о друге"""
    # Реализация
    pass

@router.delete("/{friend_id}")
async def delete_friend(
    friend_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить друга"""
    # Реализация
    pass
```

**Файл:** `app/routes/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, Token
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    """Регистрация нового пользователя"""
    # Реализация
    pass

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Вход пользователя (получение JWT токена)"""
    # Реализация
    pass

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Получить текущую информацию о пользователе"""
    # Реализация
    pass
```

---

## 🎯 Этап 5: Фронтенд интеграция (День 5-7)

### 5.1. Создание чат-интерфейса

**Новые файлы во фронтенде:**

```
src/
├── pages/
│   ├── Chat.tsx              # Страница чата
│   └── Friends.tsx           # Страница управления друзьями
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx    # Окно чата
│   │   ├── MessageInput.tsx  # Поле ввода
│   │   ├── MessageBubble.tsx # Сообщение
│   │   └── FriendSelector.tsx # Выбор друга
│   └── friends/
│       ├── FriendCard.tsx
│       └── CreateFriendForm.tsx
├── services/
│   ├── api.ts                # API клиент
│   └── auth.ts               # Auth сервис
└── hooks/
    ├── useChat.ts            # Хук для чата
    └── useAuth.ts            # Хук для авторизации
```

### 5.2. API клиент

**Файл:** `src/services/api.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем JWT токен к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обработка ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 5.3. Хук для чата

**Файл:** `src/hooks/useChat.ts`

```typescript
import { useState, useCallback } from 'react';
import api from '@/services/api';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

export const useChat = (friendId: number) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/chat/send', {
        message: content,
        friend_id: friendId,
      });

      setMessages((prev) => [
        ...prev,
        response.data.user_message,
        response.data.ai_response,
      ]);
    } catch (err) {
      setError('Не удалось отправить сообщение');
    } finally {
      setIsLoading(false);
    }
  }, [friendId]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await api.get(`/chat/history/${friendId}`);
      setMessages(response.data);
    } catch (err) {
      setError('Не удалось загрузить историю');
    }
  }, [friendId]);

  return { messages, isLoading, error, sendMessage, loadHistory };
};
```

---

## 🎯 Этап 6: Долговременная память (День 7-8)

### 6.1. Простая реализация (контекст)

**Файл:** `app/services/memory_service.py`

```python
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.message import Message

class MemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_conversation_context(
        self, 
        user_id: int, 
        friend_id: int,
        limit: int = 20
    ) -> List[Dict[str, str]]:
        """Получить последние сообщения для контекста"""
        
        result = await self.db.execute(
            select(Message)
            .where(Message.user_id == user_id)
            .where(Message.friend_id == friend_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        
        messages = result.scalars().all()
        
        # Преобразуем в формат для GROQ
        return [
            {"role": m.role, "content": m.content}
            for m in reversed(messages)
        ]
    
    async def add_to_memory(self, user_id: int, friend_id: int, content: str, role: str):
        """Сохранить сообщение в базу"""
        # Реализация
        pass
```

### 6.2. Продвинутая реализация (векторная память)

Для продакшена добавить:
- **Supabase с pgvector** для семантического поиска
- **RAG (Retrieval-Augmented Generation)** для поиска релевантных воспоминаний

---

## 🎯 Этап 7: Тестирование и деплой (День 8-10)

### 7.1. Тесты

**Файл:** `tests/test_chat.py`

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_send_message():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/chat/send", json={
            "message": "Привет!",
            "friend_id": 1,
        })
        assert response.status_code == 200
        assert "reply" in response.json()
```

### 7.2. Dockerfile

**Файл:** `Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 7.3. Деплой на Railway/Render

**Railway:**
1. Создать новый проект
2. Подключить GitHub репозиторий
3. Добавить переменные окружения
4. Деплой автоматически

**Render:**
1. Создать Web Service
2. Подключить репозиторий
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 🚀 Деплой в production (Vercel + Railway)

### Архитектура деплоя

```
┌─────────────────┐     ┌──────────────────┐
│   Vercel        │────▶│   Railway        │
│   (Frontend)    │ API │   (Backend)      │
│   React + Vite  │◀────│   FastAPI + GROQ │
└─────────────────┘     └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   PostgreSQL     │
                        │   (Railway DB)   │
                        └──────────────────┘
```

### Frontend на Vercel

**1. Подготовка:**
```bash
cd frontend

# Создать .env.production
echo "VITE_API_URL=https://your-project.railway.app/api" > .env.production
```

**2. vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-project.railway.app/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**3. Деплой:**
- Vercel UI: Import GitHub repo → Root: `frontend`
- Или CLI: `vercel --prod`

### Backend на Railway

**1. Переменные окружения:**
```env
GROQ_API_KEY=your_key
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=your_secret
FRONTEND_URL=https://your-app.vercel.app
```

**2. Procfile:**
```
web: uvicorn ai_friend_backend.app.main:app --host 0.0.0.0 --port $PORT
```

**3. Деплой:**
- Railway UI: New Project → Deploy from GitHub
- Автоматический деплой при push

### Полный checklist

- [ ] Получить GROQ API Key
- [ ] Создать проект на Railway
- [ ] Добавить PostgreSQL базу
- [ ] Настроить переменные backend
- [ ] Задеплоить backend
- [ ] Проверить /health endpoint
- [ ] Обновить vercel.json с backend URL
- [ ] Создать проект на Vercel
- [ ] Добавить VITE_API_URL
- [ ] Задеплоить frontend
- [ ] Протестировать регистрацию и чат

📖 **Подробная инструкция:** см. [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📅 Timeline

| Этап | Задачи | Длительность |
|------|--------|--------------|
| 1 | Настройка бэкенда | День 1-2 |
| 2 | GROQ интеграция | День 2-3 |
| 3 | База данных | День 3-4 |
| 4 | API эндпоинты | День 4-5 |
| 5 | Фронтенд интеграция | День 5-7 |
| 6 | Долговременная память | День 7-8 |
| 7 | Тестирование и деплой | День 8-10 |

**Итого:** 10 дней для MVP

---

## 🔒 Безопасность

- [ ] Хеширование паролей (bcrypt)
- [ ] JWT аутентификация
- [ ] CORS настройки
- [ ] Rate limiting (ограничение запросов)
- [ ] Валидация входных данных
- [ ] HTTPS в продакшене

---

## 📝 Следующие шаги

1. [ ] Получить API ключ GROQ (https://console.groq.com)
2. [ ] Создать репозиторий для бэкенда
3. [ ] Настроить виртуальное окружение Python
4. [ ] Реализовать Этап 1 (настройка бэкенда)

---

## 📚 Ресурсы

- [GROQ документация](https://console.groq.com/docs)
- [FastAPI документация](https://fastapi.tiangolo.com)
- [SQLAlchemy документация](https://docs.sqlalchemy.org)
- [Supabase](https://supabase.com)
