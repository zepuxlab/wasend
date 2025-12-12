# Настройка интеграции с Zoho CRM

## Что делает интеграция

1. **Синхронизация сообщений из рассылок** - все новые сообщения из кампаний автоматически добавляются в Zoho CRM в модуль Messages
2. **Создание/поиск лидов** - автоматически находит или создает лида по номеру телефона
3. **Ссылка на диалог в Zoho** - в Notes добавляется ссылка на диалог в Zoho Messages
4. **Кнопка в админ-панели** - в интерфейсе чата есть кнопка "Open in Zoho" для быстрого перехода

## Шаг 1: Получение Zoho API credentials

### 1.1. Создание приложения в Zoho API Console

1. **Зайдите в Zoho API Console:**
   - Откройте [https://api-console.zoho.com/](https://api-console.zoho.com/)
   - Войдите в свой Zoho аккаунт (тот же, что используете для CRM)

2. **Создайте новое приложение:**
   - На главной странице найдите раздел **"Add Client"** или **"Create Client"**
   - Или перейдите в **"My Apps"** (Мои приложения) → **"Add Client"**
   - Выберите тип приложения: **"Server-based Application"** (Серверное приложение)

3. **Заполните форму создания:**
   - **Client Name**: `WhatsApp Admin Integration` (или любое другое название)
   - **Homepage URL**: `https://office.ampriomilano.com`
   - **Authorized Redirect URIs**: `https://office.ampriomilano.com/wasend/auth`
     - ⚠️ **Важно:** Этот URL должен точно совпадать с тем, что вы укажете в шаге 1.2
   - Нажмите **"Create"** (Создать)

4. **Скопируйте Client ID и Client Secret:**
   - После создания приложения вы увидите **Client ID** и **Client Secret**
   - ⚠️ **Сохраните их сразу!** Client Secret показывается только один раз
   - Если потеряли Secret, нужно будет создать новое приложение

### 1.2. Получение Refresh Token (пошагово)

**Важно:** Scopes (разрешения) указываются прямо в URL при получении Authorization Code, отдельно их настраивать не нужно.

1. **Найдите Client ID и Client Secret:**
   - После создания приложения в Zoho API Console откройте ваше приложение
   - На странице приложения вы увидите:
     - **Client ID** (начинается с `1000.`)
     - **Client Secret** (начинается с `...`)
     - ⚠️ **Важно:** Client Secret показывается только один раз при создании! Если потеряли - создайте новое приложение

2. **Соберите URL для авторизации:**
   - Замените `{YOUR_CLIENT_ID}` на ваш Client ID (из шага 1)
   - Замените `{YOUR_REDIRECT_URI}` на ваш Redirect URI (должен точно совпадать с тем, что указали при создании приложения)
   - Полный URL будет выглядеть так:
   ```
   https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.leads.ALL,ZohoCRM.modules.contacts.ALL,ZohoCRM.modules.activities.ALL,ZohoCRM.modules.notes.ALL&client_id=1000.XXXXXXXXXX&response_type=code&access_type=offline&redirect_uri=https://office.ampriomilano.com/wasend/auth
   ```
   - ⚠️ **Scopes уже включены в URL** - это разрешения, которые нужны для работы интеграции

3. **Откройте URL в браузере:**
   - Скопируйте собранный URL и откройте его в браузере
   - Войдите в свой Zoho аккаунт (тот же, что используете для CRM)
   - Разрешите доступ приложению (нажмите "Accept" или "Allow")

4. **Получите Authorization Code:**
   - После разрешения доступа вас перенаправит на Redirect URI
   - В URL будет параметр `code=...`, например:
   ```
   https://office.ampriomilano.com/wasend/auth?code=1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   - ⚠️ **Скопируйте весь код** (он очень длинный, обычно начинается с `1000.`)
   - Если видите ошибку - проверьте, что Redirect URI точно совпадает

5. **Обменяйте Code на Refresh Token:**
   
   **Вариант 1: Через curl (в терминале):**
   ```bash
   curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
     -d "grant_type=authorization_code" \
     -d "client_id=ВАШ_CLIENT_ID" \
     -d "client_secret=ВАШ_CLIENT_SECRET" \
     -d "redirect_uri=https://office.ampriomilano.com/wasend/auth" \
     -d "code=ВАШ_AUTHORIZATION_CODE"
   ```
   
   **Вариант 2: Через Postman или другой HTTP клиент:**
   - Method: `POST`
   - URL: `https://accounts.zoho.com/oauth/v2/token`
   - Headers: `Content-Type: application/x-www-form-urlencoded`
   - Body (form-data или x-www-form-urlencoded):
     - `grant_type`: `authorization_code`
     - `client_id`: ваш Client ID
     - `client_secret`: ваш Client Secret
     - `redirect_uri`: `https://office.ampriomilano.com/wasend/auth`
     - `code`: ваш Authorization Code

6. **Получите Refresh Token:**
   - После выполнения запроса вы получите JSON ответ:
   ```json
   {
     "access_token": "...",
     "refresh_token": "1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
     "expires_in": 3600,
     "token_type": "Bearer"
   }
   ```
   - ⚠️ **Скопируйте `refresh_token`** - он нужен для постоянной работы интеграции
   - `access_token` используется временно и обновляется автоматически

### Где найти информацию в Zoho API Console:

- **Zoho API Console:** [https://api-console.zoho.com/](https://api-console.zoho.com/)
- **My Apps / Мои приложения:** В меню слева или в верхней панели навигации
- **Client ID и Secret:** После создания приложения они отображаются на странице приложения (Client Secret показывается только один раз!)
- **Scopes:** Указываются в URL авторизации (шаг 2), отдельной настройки в консоли нет
- **Refresh Token:** Получается через OAuth flow (шаги 3-6), в консоли его нет - его нужно получить через API

### 1.4. Получение Organization ID

1. Зайдите в ваш Zoho CRM
2. Посмотрите URL в браузере: `https://crm.zoho.com/crm/{ORG_ID}/...`
3. Скопируйте `ORG_ID` из URL

## Шаг 2: Настройка переменных окружения

Добавьте в `.env` файл:

```env
# Zoho CRM Integration
ZOHO_CRM_ENABLED=true
ZOHO_CLIENT_ID=ваш_client_id
ZOHO_CLIENT_SECRET=ваш_client_secret
ZOHO_REFRESH_TOKEN=ваш_refresh_token
ZOHO_API_DOMAIN=https://www.zohoapis.com
ZOHO_ORG_ID=ваш_org_id
```

## Шаг 3: Настройка в Zoho CRM

### 3.1. Настройка модуля Messages

1. В Zoho CRM перейдите в **Settings** → **Modules**
2. Убедитесь, что модуль **Messages** включен
3. Настройте отображение сообщений WhatsApp в модуле Messages

### 3.2. Настройка полей Lead

Убедитесь, что в модуле Leads есть поле **Phone** для поиска лидов по номеру телефона.

## Шаг 4: Проверка работы

1. Запустите бэкенд с включенной интеграцией
2. Отправьте тестовую рассылку
3. Проверьте в Zoho CRM:
   - Создался ли лид (если его не было)
   - Появилось ли сообщение в модуле Messages
   - Есть ли ссылка на диалог в Notes

## Формат ссылок на диалоги

Ссылки создаются в формате:
- С `ZOHO_ORG_ID`: `https://crm.zoho.com/crm/{orgId}/tab/Messages?phone={phone}`
- Без `ZOHO_ORG_ID`: `https://crm.zoho.com/crm/tab/Leads/{leadId}/Messages`

Рекомендуется указать `ZOHO_ORG_ID` для более точных ссылок.

## Что синхронизируется

✅ **Синхронизируется:**
- Новые сообщения из рассылок (кампаний)
- Входящие сообщения (webhook)
- Исходящие сообщения из чатов

❌ **НЕ синхронизируется:**
- Старые сообщения (только новые)
- Сообщения без номера телефона

## Устранение проблем

### Сообщения не появляются в Zoho

1. Проверьте, что `ZOHO_CRM_ENABLED=true`
2. Проверьте логи бэкенда на ошибки Zoho API
3. Убедитесь, что Refresh Token валидный
4. Проверьте, что scopes правильно настроены

### Ссылки на диалоги не работают

1. Убедитесь, что `ZOHO_ORG_ID` указан правильно
2. Проверьте формат URL в браузере Zoho CRM
3. Попробуйте открыть ссылку вручную

### Лиды не создаются

1. Проверьте права доступа приложения в Zoho
2. Убедитесь, что scope `ZohoCRM.modules.leads.ALL` добавлен
3. Проверьте логи на ошибки создания лида

