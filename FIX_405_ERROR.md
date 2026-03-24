# Исправление ошибки 405 при регистрации и входе

## Проблема

При деплое frontend на Vercel и backend на Render возникала ошибка **405 Method Not Allowed** при попытке регистрации или входа.

## Причины

1. **Формат данных для `/login`**:
   - Backend использовал `OAuth2PasswordRequestForm` (требует `application/x-www-form-urlencoded`)
   - Frontend отправлял данные в формате JSON

2. **CORS настройки**:
   - Не поддерживались wildcard домены (`*.vercel.app`, `*.onrender.com`)
   - Preflight OPTIONS запросы не обрабатывались корректно

## Внесённые изменения

### Backend (`backend/ai_friend_backend`)

#### 1. `app/routes/auth.py`
- ✅ Добавлена поддержка JSON для `/login` через схему `UserLogin`
- ✅ Сохранена обратная совместимость с `OAuth2PasswordRequestForm`
- ✅ Добавлена схема `UserLogin` в `app/schemas/user.py`

#### 2. `app/main.py`
- ✅ Написан кастомный `CORSRegexMiddleware` с поддержкой regex паттернов
- ✅ Поддержка всех доменов Vercel: `https://*.vercel.app`
- ✅ Поддержка всех доменов Render: `https://*.onrender.com`
- ✅ Обработка OPTIONS preflight запросов

### Frontend (`frontend`)

#### 1. `src/services/api.ts`
- ✅ Изменён формат `/login` с `form-data` на JSON
- ✅ Упрощён код отправки данных

#### 2. `.env.example`
- ✅ Добавлен комментарий для production API URL

## Инструкция по применению

### 1. Обновите backend на Render

```bash
# Убедитесь, что все изменения закоммичены
git add .
git commit -m "fix: поддержка JSON для login и CORS wildcard"
git push
```

Render автоматически обновит сервис.

### 2. Обновите frontend на Vercel

```bash
# Убедитесь, что все изменения закоммичены
git add .
git commit -m "fix: использование JSON для login"
git push
```

Vercel автоматически пересоберёт проект.

### 3. Проверьте переменные окружения

**На Render** (Dashboard → Environment Variables):
```bash
GROQ_API_KEY=ваш_key
JWT_SECRET_KEY=ваш_secret
FRONTEND_URL=https://ai-friend.vercel.app
DATABASE_URL=postgresql://... (если используете PostgreSQL)
```

**На Vercel** (Settings → Environment Variables):
```bash
VITE_API_URL=https://YOUR_RENDER_URL.onrender.com/api
```

### 4. Тестирование

#### Тест backend (curl):

```bash
# Замените YOUR_RENDER_URL на ваш URL

# Регистрация
curl -X POST https://YOUR_RENDER_URL.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Вход
curl -X POST https://YOUR_RENDER_URL.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Health check
curl https://YOUR_RENDER_URL.onrender.com/health
```

#### Тест frontend:

1. Откройте сайт на Vercel
2. Откройте DevTools (F12) → Console
3. Попробуйте зарегистрироваться
4. Попробуйте войти
5. Убедитесь, что нет ошибок 405 или CORS

## Архитектура CORS

```
┌─────────────────────────────────────────────────────────────┐
│                    CORS Middleware                          │
├─────────────────────────────────────────────────────────────┤
│  Exact Origins:                                             │
│  - http://localhost:8080                                    │
│  - http://localhost:5173                                    │
│  - https://ai-friend.vercel.app (из FRONTEND_URL)          │
├─────────────────────────────────────────────────────────────┤
│  Regex Patterns:                                            │
│  - ^https://.*\.vercel\.app$    (все Vercel домены)        │
│  - ^https://.*\.onrender\.com$  (все Render домены)        │
└─────────────────────────────────────────────────────────────┘
```

## Поддерживаемые форматы `/login`

### JSON (рекомендуется):
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Form-data (OAuth2, обратная совместимость):
```
username=user@example.com&password=password123
Content-Type: application/x-www-form-urlencoded
```

## Файлы изменений

```
backend/ai_friend_backend/
├── app/
│   ├── routes/
│   │   └── auth.py          # + поддержка JSON для login
│   ├── schemas/
│   │   └── user.py          # + схема UserLogin
│   └── main.py              # + CORSRegexMiddleware
└── DEPLOY_RENDER.md         # новая инструкция

frontend/
├── src/
│   └── services/
│       └── api.ts           # + JSON формат для login
├── .env.example             # + комментарий для production
└── DEPLOY_VERCEL.md         # новая инструкция
```

## Проверка после исправления

✅ Регистрация работает без ошибки 405  
✅ Вход работает без ошибки 405  
✅ CORS заголовки возвращаются корректно  
✅ OPTIONS preflight обрабатывается  
✅ JWT токен сохраняется  
✅ Авторизованные запросы работают  

## Дополнительные ресурсы

- [DEPLOY_RENDER.md](./backend/DEPLOY_RENDER.md) - подробная инструкция по деплою на Render
- [DEPLOY_VERCEL.md](./frontend/DEPLOY_VERCEL.md) - подробная инструкция по деплою на Vercel
- [DEPLOYMENT.md](./DEPLOYMENT.md) - общая инструкция по деплою
