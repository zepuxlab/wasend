# Настройка Campaign Settings в базе данных

## Шаг 1: Создание таблицы settings (если еще не создана)

Если таблица `settings` еще не существует, создайте ее в Supabase:

```sql
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создать индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
```

## Шаг 2: Инициализация настроек кампаний

Выполните SQL миграцию для создания дефолтных настроек:

```sql
-- Вставка дефолтных настроек кампаний
INSERT INTO settings (key, value, created_at, updated_at)
VALUES (
  'campaign_settings',
  '{
    "defaultBatchSize": 50,
    "defaultDelaySeconds": 60,
    "defaultHourlyCap": 1000,
    "defaultDailyCap": 10000,
    "utmSource": "whatsapp",
    "utmMedium": "broadcast",
    "dailyLimitWarning": true,
    "dailyLimitAmount": 100,
    "pauseOnLimit": false
  }'::jsonb::text,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO NOTHING;
```

Или используйте файл миграции:
```bash
# Скопируйте содержимое backend/migrations/create_campaign_settings.sql
# и выполните в Supabase SQL Editor
```

## Шаг 3: Проверка

После выполнения миграции:

1. Откройте страницу Settings в админ-панели
2. Перейдите на вкладку "Campaign Settings"
3. Настройки должны автоматически загрузиться из базы данных
4. Измените любую настройку и нажмите "Save Settings"
5. Обновите страницу - настройки должны сохраниться

## Структура настроек

Настройки хранятся в таблице `settings` с ключом `campaign_settings` в формате JSON:

```json
{
  "defaultBatchSize": 50,
  "defaultDelaySeconds": 60,
  "defaultHourlyCap": 1000,
  "defaultDailyCap": 10000,
  "utmSource": "whatsapp",
  "utmMedium": "broadcast",
  "dailyLimitWarning": true,
  "dailyLimitAmount": 100,
  "pauseOnLimit": false
}
```

## API Endpoints

- `GET /api/settings` - Получить все настройки (включая campaign_settings)
- `PATCH /api/settings` - Обновить настройки (отправьте `{ campaign_settings: {...} }`)

## Важно

- Настройки автоматически загружаются при открытии страницы Settings
- При сохранении настройки записываются в базу данных
- Если настройки не найдены в БД, используются дефолтные значения

