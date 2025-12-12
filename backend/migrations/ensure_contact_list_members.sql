-- SQL скрипт для проверки и создания необходимых структур для contact_list_members
-- Этот скрипт безопасен для повторного выполнения (использует IF NOT EXISTS)

BEGIN;

-- ============================================
-- 1. ПРОВЕРКА И СОЗДАНИЕ ТАБЛИЦЫ (если не существует)
-- ============================================

-- Создать таблицу contact_list_members, если её нет
CREATE TABLE IF NOT EXISTS public.contact_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Уникальное ограничение: один контакт может быть в списке только один раз
  CONSTRAINT contact_list_members_unique_pair UNIQUE (list_id, contact_id)
);

-- ============================================
-- 2. ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Уникальный индекс для upsert операций (уже может существовать)
CREATE UNIQUE INDEX IF NOT EXISTS contact_list_members_unique 
ON public.contact_list_members(list_id, contact_id);

-- Индекс для быстрого поиска контактов по списку
CREATE INDEX IF NOT EXISTS idx_contact_list_members_list_id 
ON public.contact_list_members(list_id);

-- Индекс для быстрого поиска списков по контакту
CREATE INDEX IF NOT EXISTS idx_contact_list_members_contact_id 
ON public.contact_list_members(contact_id);

-- Индекс для сортировки по дате создания
CREATE INDEX IF NOT EXISTS idx_contact_list_members_created_at 
ON public.contact_list_members(created_at DESC);

-- ============================================
-- 3. ПРОВЕРКА СТРУКТУРЫ
-- ============================================

-- Проверить наличие всех необходимых колонок
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(column_name)
  INTO missing_columns
  FROM (
    SELECT 'id' AS column_name
    UNION SELECT 'list_id'
    UNION SELECT 'contact_id'
    UNION SELECT 'created_at'
  ) AS required
  WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contact_list_members' 
    AND column_name = required.column_name
  );
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Missing columns in contact_list_members: %', array_to_string(missing_columns, ', ');
  END IF;
END $$;

COMMIT;

-- ============================================
-- 4. ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================

-- Показать структуру таблицы
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contact_list_members'
ORDER BY ordinal_position;

-- Показать индексы
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'contact_list_members'
ORDER BY indexname;

