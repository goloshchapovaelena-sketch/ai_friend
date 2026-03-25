# Исправление проблемы с потерей данных на Render

## Проблема

После деплоя бэкенда на Render данные пользователей (регистрация, логины) **пропадают** через некоторое время.

## Причина

Render использует **временную файловую систему** (ephemeral filesystem). При каждом:
- Деплое новой версии
- Перезапуске контейнера (автоматически каждые ~15 минут без активности)
- Рестарте сервиса

Все файлы, включая базу данных SQLite `ai_friend.db`, **безвозвратно удаляются**.

## Решение

Используйте **PostgreSQL** вместо SQLite. PostgreSQL на Render — это отдельный сервис с постоянным хранилищем.

---

## Пошаговая инструкция

### Шаг 1: Создайте базу данных PostgreSQL на Render

**Вариант A: Через главный дашборд**

1. Зайдите в дашборд Render: https://dashboard.render.com
2. В верхней части страницы нажмите кнопку **"New +"** (синяя кнопка)
3. В выпадающем меню выберите **"Database"**
   ```
   New +
   ├── Web Service
   ├── Static Site
   ├── Database          ← Выберите этот
   ├── Redis
   └── ...
   ```

**Вариант B: Из существующего проекта**

1. Откройте ваш проект (Web Service) на Render
2. В верхней части страницы проекта нажмите **"New +"**
3. Выберите **"Database"**

---

**Настройка базы данных:**

После выбора "Database" откроется страница создания:

```
Create Database
┌─────────────────────────────────────────┐
│ Name:                                   │
│ ┌─────────────────────────────────────┐ │
│ │ ai-friend-db                        │ │  ← Введите имя
│ └─────────────────────────────────────┘ │
│                                         │
│ Region:                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Oregon, USA (us-west-2)             │ │  ← Выберите тот же, 
│ └─────────────────────────────────────┘ │     где ваш Web Service
│                                         │
│ Database Type:                          │
│ ● PostgreSQL 15                         │  ← Оставьте PostgreSQL
│ ○ PostgreSQL 14                         │
│ ○ PostgreSQL 13                         │
│                                         │
│ Plan:                                   │
│ ● Free                                  │  ← Для начала
│   └─ 1 GB storage, 1M queries/month     │
│ ○ Starter ($7/mo)                       │
│ ○ Standard ($25/mo)                     │
│                                         │
│ Database Size:                          │
│ ┌─────────────────────────────────────┐ │
│ │ 1 GB (Free tier)                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │     [Create Database]               │ │  ← Нажмите эту кнопку
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Поля для заполнения:**

| Поле | Значение | Примечание |
|------|----------|------------|
| **Name** | `ai-friend-db` | Любое удобное имя |
| **Region** | `Oregon, USA (us-west-2)` | **Важно:** тот же регион, где ваш Web Service |
| **Database Type** | `PostgreSQL 15` | Последняя стабильная версия |
| **Plan** | `Free` | Для тестирования |
| **Database Size** | `1 GB` | По умолчанию для Free |

4. Нажмите синюю кнопку **"Create Database"**

---

**Ожидание создания:**

После нажатия кнопки начнётся создание базы данных:

```
Creating... (30-60 секунд)

Status: Provisioning → Available

⏳ Creating database instance...
⏳ Setting up storage...
⏳ Configuring connections...
✅ Database ready!
```

**Когда статус станет "Available"** (зелёная точка):
- База данных готова к использованию
- Вы увидите информацию о подключении

### Шаг 2: Скопируйте DATABASE_URL

1. Откройте созданную базу данных в дашборде Render:
   - Вернитесь на главную страницу дашборда
   - Найдите вашу базу данных в списке (например, `ai-friend-db`)
   - Кликните на неё

2. На странице базы данных найдите секцию **"Connections"** (Подключения):
   ```
   ai-friend-db
   ├── Overview
   ├── Metrics
   ├── Logs
   └── Settings
   
   ┌─ Connections ─────────────────────────┐
   │                                       │
   │ Internal Database URL:                │
   │ ┌───────────────────────────────────┐ │
   │ │ postgresql://user:pass@host...    │ │ ← Скопируйте это
   │ └───────────────────────────────────┘ │
   │ [Copy]                                │
   │                                       │
   │ External Database URL:                │
   │ (требуется Whitelist IP)              │
   └───────────────────────────────────────┘
   ```

3. Нажмите кнопку **"Copy"** рядом с **Internal Database URL**

**Пример того, что вы скопируете:**
```
postgresql://ai_friend_db_user:abc123xyz789@pg-abc123xyz456.rds2.amazonaws.com:5432/ai_friend_db?sslmode=require
```

**Важно:**
- Используйте **Internal Database URL** (для подключения из Render)
- Не используйте External Database URL (он для подключения снаружи)
- URL содержит имя пользователя, пароль, хост и имя базы данных

### Шаг 3: Добавьте переменные окружения на Render

1. **Перейдите в ваш Web Service:**
   - Вернитесь на главную страницу дашборда Render
   - Найдите ваш Web Service (например, `ai-friend-backend`)
   - Кликните на него

2. **Откройте вкладку "Environment":**
   ```
   ai-friend-backend
   ├── Overview
   ├── Logs
   ├── Metrics
   ├── Events
   ├── Environment      ← Нажмите на эту вкладку
   ├── Settings
   └── ...
   ```

3. **Добавьте переменную DATABASE_URL:**
   
   а) Прокрутите вниз до секции **"Environment Variables"**
   
   б) Нажмите кнопку **"Add Environment Variable"**
   
   в) Заполните поля:
   ```
   ┌─ Add Environment Variable ─────────┐
   │                                    │
   │ Key:                               │
   │ ┌────────────────────────────────┐ │
   │ │ DATABASE_URL                   │ │
   │ └────────────────────────────────┘ │
   │                                    │
   │ Value:                             │
   │ ┌────────────────────────────────┐ │
   │ │ postgresql://user:pass@...     │ │ ← Вставьте скопированный URL
   │ └────────────────────────────────┘ │
   │                                    │
   │ [Add Variable]                     │
   └────────────────────────────────────┘
   ```
   
   г) Нажмите **"Add Variable"**

4. **Проверьте/добавьте остальные переменные:**

   Убедитесь, что следующие переменные также добавлены:
   
   | Key | Value | Обязательно |
   |-----|-------|-------------|
   | `DATABASE_URL` | `postgresql://...` | ✅ Да |
   | `GROQ_API_KEY` | `gsk_...` | ✅ Да |
   | `JWT_SECRET_KEY` | `любая_секретная_строка` | ✅ Да |
   | `FRONTEND_URL` | `https://ai-friend.vercel.app` | ✅ Да |
   | `APP_NAME` | `AI Friend` | ❌ Нет (есть значение по умолчанию) |
   | `DEBUG` | `false` | ❌ Нет (для production) |

   **Если переменных нет — добавьте их** (кнопка "Add Environment Variable")

5. **Сохраните изменения:**
   - Прокрутите вниз
   - Нажмите синюю кнопку **"Save Changes"**

### Шаг 4: Перезапустите сервис

После добавления переменных окружения сервис нужно перезапустить, чтобы изменения применились.

**Способ 1: Автоматический перезапуск (рекомендуется)**

После нажатия "Save Changes" Render автоматически предложит перезапустить сервис:
```
┌─ Changes Saved ────────────────────────┐
│                                        │
│ Environment variables updated.         │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │    [Redeploy to apply changes]     │ │ ← Нажмите эту кнопку
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

Нажмите **"Redeploy to apply changes"**

**Способ 2: Ручной перезапуск**

1. Перейдите во вкладку **"Overview"** или **"Logs"**
2. Найдите кнопку **"Restart"** (обычно в правом верхнем углу)
3. Нажмите **"Restart"**
4. Подтвердите перезапуск

**Способ 3: Через Manual Deploy**

1. Перейдите во вкладку **"Manual Deploy"**
2. Если у вас подключён GitHub — нажмите **"Deploy Latest Commit"**
3. Или выберите коммит и нажмите **"Deploy"**

---

**Ожидание перезапуска:**

```
Status: Updating → Building → Deploying → Live

⏳ Stopping previous instance...
⏳ Building new version...
⏳ Starting new instance...
✅ Service live!
```

Обычно занимает 1-3 минуты.

### Шаг 5: Проверьте работу

**1. Проверьте логи:**

1. Перейдите во вкладку **"Logs"**
2. Убедитесь, что нет ошибок подключения к базе данных
3. Ищите сообщения:
   ```
   ✅ INFO:     Application startup complete.
   ✅ INFO:     Database connection established
   ```

**Ошибки, которые НЕ должны появляться:**
```
❌ ERROR: connection to server failed
❌ ERROR: database does not exist
❌ ERROR: password authentication failed
```

**2. Проверьте Health Check:**

Откройте в браузере или выполните в терминале:
```bash
https://your-service.onrender.com/health
```

**Ожидаемый ответ:**
```json
{"status": "healthy"}
```

**3. Проверьте Swagger UI:**

Откройте в браузере:
```
https://your-service.onrender.com/docs
```

Вы должны увидеть документацию API с доступными эндпоинтами.

**4. Протестируйте регистрацию:**

Выполните команду в терминале (замените URL на ваш):
```bash
curl -X POST https://your-service.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**Ожидаемый ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**5. Проверьте вход:**

```bash
curl -X POST https://your-service.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Должен вернуться новый токен доступа.

---

## Проверка что всё работает

### Финальный тест: данные сохраняются после перезапуска

**1. Создайте тестового пользователя:**

Зарегистрируйтесь через frontend или через API:
```bash
curl -X POST https://your-service.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "persist-test@example.com", "password": "test123"}'
```

**2. Подождите 5-10 минут**

Или сделайте новый деплой (измените файл и запушьте в Git).

**3. Проверьте вход с тем же пользователем:**
```bash
curl -X POST https://your-service.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "persist-test@example.com", "password": "test123"}'
```

**✅ Если получили токен доступа — проблема решена!**

Данные теперь сохраняются в PostgreSQL и не удаляются после перезапуска.

---

## Что было изменено в коде

Для исправления проблемы обновлены следующие файлы:

1. **`backend/ai_friend_backend/app/config.py`** — убрано значение по умолчанию SQLite
2. **`backend/.env.production.example`** — добавлен пример DATABASE_URL для PostgreSQL
3. **`backend/DEPLOY_RENDER.md`** — полная документация по деплою с PostgreSQL
4. **`DEPLOYMENT.md`** — предупреждение о проблеме с SQLite
5. **`.env.example`** — обновлён пример с PostgreSQL
6. **`backend/ai_friend_backend/migrate.py`** — скрипт для ручного запуска миграций

---

## Часто задаваемые вопросы

### ❓ Можно ли использовать SQLite для тестирования?

Да, но только для локальной разработки. На Render/Railway используйте только PostgreSQL.

### ❓ Сколько стоит PostgreSQL на Render?

Бесплатный тариф доступен с ограничениями:
- 1 ГБ хранилища
- 1 млн запросов в месяц
- База данных удаляется после 90 дней неактивности

Для production рекомендуется платный тариф ($7/месяц).

### ❓ Данные всё равно пропадают

Проверьте:
1. **DATABASE_URL** установлен на PostgreSQL (не SQLite!)
2. Переменная окружения добавлена в Render (не в репозиторий!)
3. В логах нет ошибок подключения к базе данных

### ❓ Как перенести данные из SQLite в PostgreSQL?

Для миграции данных потребуется отдельный скрипт. Если нужно — создайте issue в репозитории.

---

## Поддержка

Если проблема не решена:
1. Проверьте логи на Render: **Logs** → **Show Logs**
2. Убедитесь, что все переменные окружения настроены
3. Проверьте, что Groq API ключ действителен
4. Создайте issue с описанием проблемы и логами
