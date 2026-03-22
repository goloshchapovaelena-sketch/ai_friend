# Railway Deployment Guide

## Backend Deployment on Railway

### 1. Подготовка

1. Создайте новый проект на https://railway.app
2. Нажмите **New Project** → **Deploy from GitHub repo**
3. Выберите репозиторий `ai_friend`

### 2. Настройка переменных окружения

В панели Railway добавьте переменные:

```env
# GROQ API
GROQ_API_KEY=your_groq_api_key

# JWT
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database (Railway автоматически создаст PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/railway

# CORS
FRONTEND_URL=https://your-app.vercel.app

# Application
APP_NAME=AI Friend
DEBUG=false
```

### 3. Настройка build и start команд

В `railway.toml` или через панель:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn ai_friend_backend.app.main:app --host 0.0.0.0 --port $PORT"
```

Или создайте `Procfile` в корне backend:

```
web: uvicorn ai_friend_backend.app.main:app --host 0.0.0.0 --port $PORT
```

### 4. База данных

1. В проекте Railway нажмите **New** → **Database** → **PostgreSQL**
2. Railway автоматически создаст `DATABASE_URL` в переменных
3. При первом запуске миграции создадут таблицы автоматически

### 5. Проверка

После деплоя:
- API будет доступен по адресу `https://your-project.railway.app`
- Swagger docs: `https://your-project.railway.app/docs`
- Health check: `https://your-project.railway.app/health`

---

## Vercel Deployment Guide

## Frontend Deployment on Vercel

### 1. Подготовка

1. Войдите на https://vercel.com
2. Нажмите **Add New Project**
3. Импортируйте GitHub репозиторий `ai_friend`

### 2. Настройка проекта

**Root Directory:** `frontend`

**Build Command:** `npm run build`

**Output Directory:** `dist`

**Install Command:** `npm install`

### 3. Переменные окружения

Добавьте в Vercel Settings → Environment Variables:

```env
VITE_API_URL=https://your-project.railway.app/api
```

### 4. Обновление vercel.json

Перед деплоем обновите `frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
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

**Замените** `your-project.railway.app` на ваш actual URL.

### 5. Деплой

```bash
cd frontend

# Vercel CLI (опционально)
npm i -g vercel
vercel login
vercel --prod
```

Или через веб-интерфейс Vercel — деплой автоматический при push в main.

### 6. Проверка

- Frontend: `https://your-app.vercel.app`
- API через proxy: `https://your-app.vercel.app/api/health`

---

## Docker Compose (Local/Production)

### Запуск всех сервисов локально

```bash
# Копирование .env
cp .env.example .env

# Редактирование .env - укажите GROQ_API_KEY

# Запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### Production с профилем

```bash
docker-compose --profile production up -d
```

---

## Environment Variables Reference

### Backend (.env)

```env
# Required
GROQ_API_KEY=your_api_key
DATABASE_URL=sqlite+aiosqlite:///./ai_friend.db

# Optional
JWT_SECRET_KEY=change_this_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:8080
APP_NAME=AI Friend
DEBUG=true
```

### Frontend (.env.production)

```env
VITE_API_URL=https://your-backend.railway.app/api
```

---

## Checklist перед деплоем

- [ ] Получить GROQ API Key (https://console.groq.com)
- [ ] Создать проект на Railway
- [ ] Настроить переменные окружения для backend
- [ ] Подключить PostgreSQL базу
- [ ] Задеплоить backend
- [ ] Проверить API через /docs
- [ ] Создать проект на Vercel
- [ ] Настроить VITE_API_URL для frontend
- [ ] Задеплоить frontend
- [ ] Протестировать полный цикл (регистрация, чат)

---

## Troubleshooting

### CORS ошибки

Убедитесь, что `FRONTEND_URL` в backend совпадает с вашим Vercel доменом.

### 401 Unauthorized

Проверьте, что JWT токен передаётся в заголовке `Authorization: Bearer <token>`.

### Database migration error

При первом запуске таблицы создаются автоматически. Если ошибка — проверьте `DATABASE_URL`.

### Vite build failed

Убедитесь, что все зависимости установлены: `npm install` в папке frontend.
