-- Добавить поле source в таблицу contacts для разделения автоматически созданных и вручную добавленных контактов
-- 'auto' - автоматически созданные из входящих сообщений (webhook)
-- 'manual' - вручную добавленные или импортированные контакты

BEGIN;

-- Добавить колонку source с дефолтным значением 'manual' для существующих записей
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('auto', 'manual'));

-- Обновить существующие контакты: если opt_in = false, вероятно они были созданы автоматически
-- Но это не точно, поэтому оставляем их как 'manual' и они будут обновляться при новых сообщениях
-- UPDATE contacts SET source = 'auto' WHERE opt_in = false AND created_at > NOW() - INTERVAL '30 days';

-- Создать индекс для быстрого поиска по source
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);

COMMIT;

