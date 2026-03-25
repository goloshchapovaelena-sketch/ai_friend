# Система подписки AI Friend

## Описание

Пользователи могут отправить **5 бесплатных сообщений**, после чего требуется оформление подписки для продолжения общения.

---

## API Endpoints

### 1. Проверка подписки

**GET** `/api/subscription`

Получить информацию о текущей подписке пользователя.

**Ответ:**
```json
{
  "is_premium": false,
  "plan_type": "free",
  "messages_count": 3,
  "messages_limit": 5,
  "remaining_messages": 2,
  "started_at": null,
  "expires_at": null
}
```

---

### 2. Активация подписки

**POST** `/api/subscription/activate`

Активировать премиум подписку.

**Тело запроса:**
```json
{
  "plan_type": "monthly",
  "payment_method": "card"
}
```

**Параметры:**
- `plan_type`: `"monthly"` или `"yearly"`
- `payment_method`: `"card"`, `"crypto"` (сейчас работает в demo-режиме)

**Ответ:**
```json
{
  "success": true,
  "message": "Подписка активирована",
  "subscription": {
    "is_premium": true,
    "plan_type": "monthly",
    "expires_at": "2026-04-24T10:30:00"
  }
}
```

---

### 3. Отправка сообщения (с проверкой лимита)

**POST** `/api/chat/send`

Отправить сообщение AI-другу.

**Тело запроса:**
```json
{
  "friend_id": 1,
  "message": "Привет!",
  "language": "ru"
}
```

**Ответ при успехе:**
```json
{
  "message": "Привет! Как дела?",
  "role": "assistant",
  "friend_id": 1
}
```

**Ответ при превышении лимита (403):**
```json
{
  "detail": {
    "error": "message_limit_exceeded",
    "message": "Вы исчерпали лимит бесплатных сообщений (5/5). Оформите подписку для продолжения.",
    "messages_count": 5,
    "messages_limit": 5,
    "remaining": 0
  }
}
```

---

### 4. Сброс счётчика (для тестирования)

**POST** `/api/subscription/reset-counter`

Сбросить счётчик сообщений обратно на 0.

⚠️ **В production удалите этот endpoint или защитите админским доступом!**

**Ответ:**
```json
{
  "success": true,
  "message": "Счётчик сообщений сброшен",
  "messages_count": 0
}
```

---

## Тарифы

| Тариф | Цена | Сообщения | Срок |
|-------|------|-----------|------|
| **Free** | Бесплатно | 5 | Бессрочно |
| **Monthly** | $9.99 | Безлимит | 30 дней |
| **Yearly** | $99.99 | Безлимит | 365 дней |

---

## Интеграция с платёжными системами

Сейчас активация подписки работает в **demo-режиме** (премиум активируется без оплаты).

Для production нужно интегрировать:

### Вариант 1: Stripe

```python
# В subscription.py заменить activate_subscription
import stripe

stripe.api_key = "sk_test_..."

@router.post("/subscription/create-checkout")
async def create_checkout_session(...):
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {'name': 'AI Friend Premium'},
                'unit_amount': 999,  # $9.99
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url='https://your-site.com/success',
        cancel_url='https://your-site.com/cancel',
    )
    return {"checkout_url": session.url}
```

### Вариант 2: CryptoCloud (криптовалюта)

```python
# Интеграция с CryptoCloud API
CRYPTO_API_KEY = "your_key"

@router.post("/subscription/crypto")
async def pay_with_crypto(...):
    # Создание платежа в CryptoCloud
    pass
```

---

## Frontend интеграция

### Пример на React/Vue

```javascript
// Проверка подписки перед отправкой
async function sendMessage(message) {
  // Проверяем подписку
  const sub = await fetch('/api/subscription');
  const data = await sub.json();
  
  if (data.remaining_messages <= 0 && !data.is_premium) {
    // Показываем модальное окно с оплатой
    showPaymentModal();
    return;
  }
  
  // Отправляем сообщение
  const response = await fetch('/api/chat/send', {
    method: 'POST',
    body: JSON.stringify({ message })
  });
  
  if (response.status === 403) {
    // Лимит исчерпан
    showPaymentModal();
  }
}
```

### Модальное окно оплаты

```jsx
function PaymentModal({ onClose }) {
  const activateSubscription = async () => {
    const response = await fetch('/api/subscription/activate', {
      method: 'POST',
      body: JSON.stringify({ plan_type: 'monthly' })
    });
    
    if (response.ok) {
      alert('Подписка активирована!');
      onClose();
    }
  };
  
  return (
    <div className="modal">
      <h2>Оформите подписку</h2>
      <p>Вы исчерпали 5 бесплатных сообщений</p>
      
      <button onClick={activateSubscription}>
        Monthly - $9.99
      </button>
      
      <button onClick={activateSubscription}>
        Yearly - $99.99 (2 месяца бесплатно)
      </button>
    </div>
  );
}
```

---

## База данных

### Таблица `subscriptions`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key к users |
| is_premium | BOOLEAN | Статус подписки |
| plan_type | STRING | "monthly" или "yearly" |
| started_at | DATETIME | Дата начала |
| expires_at | DATETIME | Дата окончания |
| payment_provider | STRING | "stripe", "paypal", "crypto" |
| subscription_id | STRING | ID у платёжного провайдера |

### Таблица `users` (обновлена)

| Column | Type | Description |
|--------|------|-------------|
| messages_count | INTEGER | Счётчик отправленных сообщений |

---

## Тестирование

### 1. Проверка лимита

```bash
# Отправляем 5 сообщений
for i in {1..5}; do
  curl -X POST https://your-render-url.onrender.com/api/chat/send \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"friend_id": 1, "message": "Test message '$i'"}'
done

# 6-е сообщение вернёт 403
curl -X POST https://your-render-url.onrender.com/api/chat/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"friend_id": 1, "message": "Test message 6"}'
```

### 2. Активация подписки

```bash
curl -X POST https://your-render-url.onrender.com/api/subscription/activate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_type": "monthly"}'
```

### 3. Проверка после активации

```bash
curl https://your-render-url.onrender.com/api/subscription \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Миграции

При первом запуске таблицы создадутся автоматически.

Для ручной миграции:
```bash
cd backend/ai_friend_backend
python migrate.py
```

---

## Логирование

Все события логируются:
- `User registered successfully` - регистрация
- `User X message count: Y` - отправка сообщения
- `User X exceeded message limit` - превышение лимита
- `Activated premium for user X` - активация подписки

Логи можно посмотреть на Render во вкладке **Logs**.
