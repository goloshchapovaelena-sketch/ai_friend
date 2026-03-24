# Деплой backend на Render

## Настройка на Render

### 1. Создайте новый Web Service на Render

- Подключите ваш GitHub репозиторий
- Root Directory: `backend/ai_friend_backend`
- Runtime: `Python 3`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 2. Переменные окружения (Environment Variables)

Добавьте следующие переменные в настройках Render:

```bash
# GROQ API Key (получите на https://console.groq.com)
GROQ_API_KEY=ваш_groq_api_key

# JWT Secret (сгенерируйте случайную строку)
JWT_SECRET_KEY=ваша_секретная_строка_для_jwt

# Frontend URL (ваш сайт на Vercel)
FRONTEND_URL=https://ai-friend.vercel.app

# Опционально: База данных (если используете PostgreSQL)
# DATABASE_URL=postgresql://...
```

### 3. База данных

**Вариант A: SQLite (для тестирования)**
- Используется по умолчанию
- Данные хранятся в файле `ai_friend.db`
- ⚠️ Не рекомендуется для production

**Вариант B: PostgreSQL (рекомендуется)**
- Создайте базу данных на Render (Add Database)
- Скопируйте `DATABASE_URL` в переменные окружения
- Формат: `postgresql://user:password@host:5432/dbname`

### 4. Проверка CORS

После деплоя проверьте, что CORS работает:

```bash
# Замените YOUR_RENDER_URL на ваш URL от Render
curl -X OPTIONS https://YOUR_RENDER_URL.onrender.com/api/auth/login \
  -H "Origin: https://ai-friend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Вы должны увидеть заголовок:
```
access-control-allow-origin: https://ai-friend.vercel.app
```

### 5. Frontend настройка

Обновите `.env` на Vercel или в файле `.env.production`:

```bash
VITE_API_URL=https://YOUR_RENDER_URL.onrender.com/api
```

## Исправления ошибки 405

### Что было исправлено:

1. **Login endpoint** теперь поддерживает оба формата:
   - `application/x-www-form-urlencoded` (OAuth2)
   - `application/json` (современный формат)

2. **CORS middleware** обновлён для поддержки:
   - Всех доменов Vercel (`*.vercel.app`)
   - Всех доменов Render (`*.onrender.com`)
   - Custom доменов

3. **Frontend API client** изменён на JSON формат для login

### Проверка работы:

```bash
# Тест регистрации (JSON)
curl -X POST https://YOUR_RENDER_URL.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Тест входа (JSON)
curl -X POST https://YOUR_RENDER_URL.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

## Debugging

### Логи на Render

```bash
# В дашборде Render перейдите в Logs
# Или используйте CLI:
render logs -f <service-name>
```

### Чеклист если не работает:

- [ ] Проверьте переменные окружения на Render
- [ ] Убедитесь, что `FRONTEND_URL` совпадает с доменом на Vercel
- [ ] Проверьте логи на наличие ошибок
- [ ] Убедитесь, что GROQ_API_KEY правильный
- [ ] Проверьте, что база данных подключена

## Health Check

Endpoint для проверки работоспособности:

```
GET https://YOUR_RENDER_URL.onrender.com/health
```

Ответ:
```json
{"status": "healthy"}
```
