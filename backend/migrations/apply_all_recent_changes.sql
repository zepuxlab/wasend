-- Миграция для применения всех последних изменений
-- Выполните этот скрипт в Supabase SQL Editor

BEGIN;

-- ============================================
-- 1. ДОБАВИТЬ ПОЛЕ source В contacts
-- ============================================
-- Добавить колонку source с дефолтным значением 'manual' для существующих записей
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('auto', 'manual'));

-- Создать индекс для быстрого поиска по source
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);

-- ============================================
-- 2. ПРОВЕРИТЬ/ДОБАВИТЬ ПОЛЯ rate_limit В campaigns
-- ============================================
-- Проверяем и добавляем поля для rate_limit, если их нет
DO $$ 
BEGIN
    -- rate_limit_per_batch
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'rate_limit_per_batch'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN rate_limit_per_batch INTEGER NOT NULL DEFAULT 50;
    END IF;

    -- rate_limit_delay_seconds
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'rate_limit_delay_seconds'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN rate_limit_delay_seconds INTEGER NOT NULL DEFAULT 60;
    END IF;

    -- hourly_cap
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'hourly_cap'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN hourly_cap INTEGER;
    END IF;

    -- daily_cap
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'daily_cap'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN daily_cap INTEGER;
    END IF;
END $$;

-- ============================================
-- 3. УДАЛИТЬ ПОЛЕ country ИЗ contacts (опционально)
-- ============================================
-- Если поле country больше не используется, можно его удалить
-- Раскомментируйте, если хотите удалить:
-- ALTER TABLE contacts DROP COLUMN IF EXISTS country;

COMMIT;

-- ============================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================
-- Проверяем, что все поля добавлены
SELECT 
    'contacts.source' as field,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'source'
    ) THEN '✅ Добавлено' ELSE '❌ Отсутствует' END as status
UNION ALL
SELECT 
    'campaigns.rate_limit_per_batch' as field,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'rate_limit_per_batch'
    ) THEN '✅ Добавлено' ELSE '❌ Отсутствует' END as status
UNION ALL
SELECT 
    'campaigns.rate_limit_delay_seconds' as field,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'rate_limit_delay_seconds'
    ) THEN '✅ Добавлено' ELSE '❌ Отсутствует' END as status
UNION ALL
SELECT 
    'campaigns.hourly_cap' as field,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'hourly_cap'
    ) THEN '✅ Добавлено' ELSE '❌ Отсутствует' END as status
UNION ALL
SELECT 
    'campaigns.daily_cap' as field,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns' 
        AND column_name = 'daily_cap'
    ) THEN '✅ Добавлено' ELSE '❌ Отсутствует' END as status;

