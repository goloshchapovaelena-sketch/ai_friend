# Деплой backend на Render

## ⚠️ Критически важно: Проблема с SQLite на Render

**Проблема:** Render использует **ephemeral filesystem** (временную файловую систему). После каждого деплоя или перезапуска контейнера все файлы, включая `ai_friend.db`, **удаляются**. Это приводит к потере всех данных пользователей.

**Решение:** Используйте **PostgreSQL** для хранения данных. PostgreSQL на Render является постоянным хранилищем и данные сохраняются после перезапуска.

| Хранилище   | Сохранение данных | Для production |
|-------------|-------------------|----------------|
| SQLite      | ❌ Удаляется       | ❌ Нет         |
| PostgreSQL  | ✅ Сохраняется     | ✅ Да          |

---

## Настройка на Render

### 1. Создайте новый Web Service на Render

- Подключите ваш GitHub репозиторий
- **Root Directory:** `backend/ai_friend_backend`
- **Runtime:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 2. Создайте базу данных PostgreSQL

1. В дашборде Render нажмите **"Add Database"**
2. Выберите тот же регион, где ваш веб-сервис
3. Выберите тариф (Free доступен)
4. Нажмите **"Create Database"**
5. После создания скопируйте **Internal Database URL** (формат: `postgresql://user:password@host:5432/dbname`)

### 3. Переменные окружения (Environment Variables)

Добавьте следующие переменные в настройках Render:

```bash
# GROQ API Key (получите на https://console.groq.com)
GROQ_API_KEY=ваш_groq_api_key

# База данных (ОБЯЗАТЕЛЬНО для production!)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT Secret (сгенерируйте случайную строку)
JWT_SECRET_KEY=ваша_секретная_строка_для_jwt

# Frontend URL (ваш сайт на Vercel)
FRONTEND_URL=https://ai-friend.vercel.app
```

### 4. Первый запуск и миграции

При первом запуске приложение автоматически создаст все таблицы в PostgreSQL. Миграции выполняются автоматически при старте приложения.

**Проверка:**
```bash
# Health check
curl https://YOUR_RENDER_URL.onrender.com/health

# Должен вернуть:
{"status": "healthy"}
```

### 5. Проверка CORS

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

### 6. Frontend настройка

Обновите `.env` на Vercel или в файле `.env.production`:

```bash
VITE_API_URL=https://YOUR_RENDER_URL.onrender.com/api
```

---

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

---

## Debugging

### Логи на Render

```bash
# В дашборде Render перейдите в Logs
# Или используйте CLI:
render logs -f <service-name>
```

### Чеклист если не работает:

- [ ] **DATABASE_URL** настроен на PostgreSQL (не SQLite!)
- [ ] Проверьте переменные окружения на Render
- [ ] Убедитесь, что `FRONTEND_URL` совпадает с доменом на Vercel
- [ ] Проверьте логи на наличие ошибок
- [ ] Убедитесь, что GROQ_API_KEY правильный
- [ ] Проверьте, что база данных PostgreSQL создана и доступна

### Частые ошибки:

#### ❌ "relation users does not exist"
**Причина:** Таблицы не созданы в PostgreSQL  
**Решение:** Проверьте, что приложение запустилось корректно. Таблицы создаются автоматически при первом запуске.

#### ❌ "Connection refused" к базе данных
**Причина:** DATABASE_URL не настроен или использует SQLite  
**Решение:** Добавьте правильный DATABASE_URL в переменные окружения на Render

#### ❌ Данные пропадают после деплоя
**Причина:** Используется SQLite вместо PostgreSQL  
**Решение:** Создайте PostgreSQL базу и настройте DATABASE_URL

---

## Миграции базы данных

Для ручного запуска миграций (если потребуется):

```bash
# Подключитесь к контейнеру на Render
render exec <service-name> -- bash

# Запустите миграции
python -m ai_friend_backend.app.main
```

Или создайте отдельный скрипт миграции в репозитории.

---

## Health Check

Endpoint для проверки работоспособности:

```
GET https://YOUR_RENDER_URL.onrender.com/health
```

Ответ:
```json
{"status": "healthy"}
```

---

## API Documentation

Swagger UI доступен по адресу:
```
GET https://YOUR_RENDER_URL.onrender.com/docs
```
