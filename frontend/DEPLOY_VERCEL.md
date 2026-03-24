# Деплой frontend на Vercel

## Настройка на Vercel

### 1. Подключите репозиторий

- Зайдите на https://vercel.com
- Нажмите "Add New Project"
- Импортируйте ваш GitHub репозиторий
- Root Directory: `frontend`

### 2. Настройки билда

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Переменные окружения (Environment Variables)

Добавьте в настройках проекта (Settings → Environment Variables):

```bash
# Production API URL (ваш backend на Render)
VITE_API_URL=https://YOUR_RENDER_URL.onrender.com/api
```

⚠️ **Важно**: Добавьте переменную для всех окружений (Production, Preview, Development)

### 4. Домен

По умолчанию Vercel предоставит домен вида:
```
https://ai-friend-xxx.vercel.app
```

Для custom домена:
- Перейдите в Settings → Domains
- Добавьте ваш домен (например, `ai-friend.vercel.app`)

### 5. Обновите backend CORS

После получения домена Vercel, обновите `FRONTEND_URL` на Render:

```bash
# В дашборде Render → Environment Variables
FRONTEND_URL=https://ai-friend.vercel.app
```

Или оставьте как есть — CORS middleware автоматически поддерживает все `*.vercel.app` домены.

## Проверка работы

### Тест авторизации

1. Откройте ваш сайт на Vercel
2. Попробуйте зарегистрироваться
3. Попробуйте войти
4. Проверьте консоль браузера (F12) на наличие ошибок

### Возможные ошибки и решения

#### Ошибка 405 (Method Not Allowed)

**Причина**: Backend ожидает другой формат данных

**Решение**:
- Убедитесь, что backend обновлён (последний коммит)
- Проверьте, что `/login` принимает JSON

#### Ошибка CORS

**Причина**: Домен не в списке разрешённых

**Решение**:
- Проверьте `FRONTEND_URL` на Render
- Убедитесь, что домен совпадает с Vercel доменом
- CORS middleware поддерживает `*.vercel.app` автоматически

#### Ошибка 401 (Unauthorized)

**Причина**: Неверный email/пароль или проблема с JWT

**Решение**:
- Проверьте `JWT_SECRET_KEY` на Render
- Убедитесь, что пользователь существует в БД

## Debugging

### Логи Vercel

```bash
# Установите Vercel CLI
npm i -g vercel

# Просмотр логов
vercel logs <project-name>
```

### Проверка API

Откройте консоль браузера и выполните:

```javascript
// Проверка подключения к API
fetch('https://YOUR_RENDER_URL.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
```

## Чеклист после деплоя

- [ ] Frontend открывается на Vercel
- [ ] Регистрация работает
- [ ] Вход работает
- [ ] JWT токен сохраняется в localStorage
- [ ] Запросы к API идут с правильным URL
- [ ] CORS ошибок в консоли нет
- [ ] Backend на Render здоров (`/health` возвращает 200)

## Перезапуск после изменений

После пуша в GitHub:
1. Vercel автоматически пересоберёт проект
2. Render автоматически обновит backend
3. Проверьте логи обоих сервисов
