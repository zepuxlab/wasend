-- Проверка структуры таблицы templates для предпросмотра шаблонов
-- Проверяем, достаточно ли данных для отображения предпросмотра как в Meta

-- 1. Проверка структуры таблицы templates
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'templates'
ORDER BY ordinal_position;

-- 2. Проверка примеров данных в components
-- Показываем структуру components для шаблонов с изображениями и кнопками
SELECT 
  id,
  name,
  category,
  -- Проверяем наличие HEADER с изображением
  CASE 
    WHEN components::text LIKE '%"type":"HEADER"%' 
      AND components::text LIKE '%"format":"IMAGE"%' 
    THEN '✅ Has IMAGE header'
    WHEN components::text LIKE '%"type":"HEADER"%' 
      AND components::text LIKE '%"format":"VIDEO"%' 
    THEN '✅ Has VIDEO header'
    WHEN components::text LIKE '%"type":"HEADER"%' 
      AND components::text LIKE '%"format":"DOCUMENT"%' 
    THEN '✅ Has DOCUMENT header'
    WHEN components::text LIKE '%"type":"HEADER"%' 
    THEN '✅ Has TEXT header'
    ELSE '❌ No HEADER'
  END as header_type,
  -- Проверяем наличие BUTTONS
  CASE 
    WHEN components::text LIKE '%"type":"BUTTONS"%' 
    THEN '✅ Has BUTTONS'
    ELSE '❌ No BUTTONS'
  END as has_buttons,
  -- Проверяем наличие BODY
  CASE 
    WHEN components::text LIKE '%"type":"BODY"%' 
    THEN '✅ Has BODY'
    ELSE '❌ No BODY'
  END as has_body,
  -- Показываем preview_text
  preview_text
FROM templates
LIMIT 10;

-- 3. Детальный анализ компонентов одного шаблона (пример)
-- Замените 'your-template-id' на реальный ID шаблона
SELECT 
  id,
  name,
  jsonb_pretty(components::jsonb) as components_json
FROM templates
WHERE components::text LIKE '%"type":"HEADER"%'
  AND components::text LIKE '%"format":"IMAGE"%'
LIMIT 1;

-- 4. Проверка, что в components есть все необходимые поля для предпросмотра:
-- HEADER: format, example.header_handle (для изображений)
-- BODY: text
-- BUTTONS: buttons[].text, buttons[].url, buttons[].type

-- Пример запроса для проверки наличия handle для изображений
SELECT 
  id,
  name,
  jsonb_array_elements(components::jsonb) as component
FROM templates
WHERE components::text LIKE '%"type":"HEADER"%'
  AND components::text LIKE '%"format":"IMAGE"%'
LIMIT 5;
