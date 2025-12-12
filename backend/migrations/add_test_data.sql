-- SQL скрипт для добавления тестовых данных
-- Шаблон, контакт, чат, сообщения, кампания
-- Все названия: "Тестово"

-- 1. Добавить тестовый шаблон
INSERT INTO templates (
  whatsapp_template_id,
  name,
  category,
  language,
  status,
  components,
  variables,
  preview_text,
  created_at,
  updated_at
) VALUES (
  'test_template_12345',
  'test_template',
  'UTILITY',
  'ru',
  'approved'::template_status,
  '[
    {
      "type": "BODY",
      "text": "Привет, {{1}}! Это тестовое сообщение. Ваш номер: {{2}}"
    }
  ]'::jsonb,
  ARRAY['{{1}}', '{{2}}'],
  'Привет, Тестовый Контакт! Это тестовое сообщение. Ваш номер: +79991234567',
  NOW(),
  NOW()
)
ON CONFLICT (whatsapp_template_id) DO NOTHING;

-- 2. Добавить тестовый контакт
INSERT INTO contacts (
  phone,
  name,
  country,
  tags,
  opt_in,
  opt_in_at,
  created_at,
  updated_at
) VALUES (
  '+79991234567',
  'Тестовый Контакт',
  'RU',
  ARRAY['Тестово', 'VIP'],
  true,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  name = EXCLUDED.name,
  tags = EXCLUDED.tags,
  opt_in = EXCLUDED.opt_in;

-- 3. Создать тестовый чат (используем CTE для получения ID контакта)
WITH contact_data AS (
  SELECT id FROM contacts WHERE phone = '+79991234567' LIMIT 1
)
INSERT INTO chats (
  contact_id,
  status,
  last_message_at,
  created_at,
  updated_at
)
SELECT 
  id,
  'open'::chat_status,
  NOW(),
  NOW(),
  NOW()
FROM contact_data
ON CONFLICT DO NOTHING;

-- 4. Добавить тестовые сообщения в чат
WITH contact_data AS (
  SELECT id FROM contacts WHERE phone = '+79991234567' LIMIT 1
),
chat_data AS (
  SELECT id FROM chats 
  WHERE contact_id = (SELECT id FROM contact_data)
  LIMIT 1
)
INSERT INTO messages (
  chat_id,
  direction,
  content,
  message_type,
  status,
  created_at
)
SELECT 
  id,
  'outbound'::message_direction,
  'Привет! Это тестовое сообщение от кампании "Тестовая Кампания".',
  'template'::message_type,
  'sent'::message_status,
  NOW() - INTERVAL '2 hours'
FROM chat_data
WHERE EXISTS (SELECT 1 FROM chat_data)
UNION ALL
SELECT 
  id,
  'inbound'::message_direction,
  'Спасибо за сообщение! Всё работает отлично.',
  'text'::message_type,
  'read'::message_status,
  NOW() - INTERVAL '1 hour'
FROM chat_data
WHERE EXISTS (SELECT 1 FROM chat_data)
UNION ALL
SELECT 
  id,
  'outbound'::message_direction,
  'Рады, что вам понравилось! Если будут вопросы, пишите.',
  'text'::message_type,
  'sent'::message_status,
  NOW() - INTERVAL '30 minutes'
FROM chat_data
WHERE EXISTS (SELECT 1 FROM chat_data);

-- 5. Создать тестовую кампанию
WITH template_data AS (
  SELECT id FROM templates WHERE whatsapp_template_id = 'test_template_12345' LIMIT 1
)
INSERT INTO campaigns (
  name,
  description,
  template_id,
  status,
  variable_mapping,
  rate_limit_per_batch,
  rate_limit_delay_seconds,
  hourly_cap,
  daily_cap,
  total_recipients,
  sent_count,
  delivered_count,
  read_count,
  failed_count,
  started_at,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  'Тестовая Кампания',
  'Это тестовая кампания для проверки работы системы',
  id,
  'completed'::campaign_status,
  '{"{{1}}": "name", "{{2}}": "phone"}'::jsonb,
  25,
  90,
  100,
  600,
  1,
  1,
  1,
  1,
  0,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day',
  NOW()
FROM template_data
WHERE EXISTS (SELECT 1 FROM template_data)
ON CONFLICT DO NOTHING;

-- 6. Добавить получателя кампании
WITH campaign_data AS (
  SELECT id FROM campaigns WHERE name = 'Тестовая Кампания' LIMIT 1
),
contact_data AS (
  SELECT id FROM contacts WHERE phone = '+79991234567' LIMIT 1
)
INSERT INTO campaign_recipients (
  campaign_id,
  contact_id,
  status,
  variables,
  whatsapp_message_id,
  sent_at,
  delivered_at,
  read_at,
  created_at,
  updated_at
)
SELECT 
  c.id,
  co.id,
  'read'::message_status,
  '{"{{1}}": "Тестовый Контакт", "{{2}}": "+79991234567"}'::jsonb,
  'wamid.test123456789',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 day',
  NOW()
FROM campaign_data c
CROSS JOIN contact_data co
WHERE EXISTS (SELECT 1 FROM campaign_data)
  AND EXISTS (SELECT 1 FROM contact_data)
ON CONFLICT DO NOTHING;

-- 7. Добавить логи активности
WITH campaign_data AS (
  SELECT id FROM campaigns WHERE name = 'Тестовая Кампания' LIMIT 1
),
contact_data AS (
  SELECT id FROM contacts WHERE phone = '+79991234567' LIMIT 1
)
INSERT INTO activity_logs (
  campaign_id,
  contact_id,
  action,
  phone,
  created_at
)
SELECT 
  c.id,
  co.id,
  'sent',
  '+79991234567',
  NOW() - INTERVAL '2 hours'
FROM campaign_data c
CROSS JOIN contact_data co
WHERE EXISTS (SELECT 1 FROM campaign_data)
  AND EXISTS (SELECT 1 FROM contact_data)
UNION ALL
SELECT 
  c.id,
  co.id,
  'delivered',
  '+79991234567',
  NOW() - INTERVAL '2 hours'
FROM campaign_data c
CROSS JOIN contact_data co
WHERE EXISTS (SELECT 1 FROM campaign_data)
  AND EXISTS (SELECT 1 FROM contact_data)
UNION ALL
SELECT 
  c.id,
  co.id,
  'read',
  '+79991234567',
  NOW() - INTERVAL '1 hour'
FROM campaign_data c
CROSS JOIN contact_data co
WHERE EXISTS (SELECT 1 FROM campaign_data)
  AND EXISTS (SELECT 1 FROM contact_data)
UNION ALL
SELECT 
  c.id,
  co.id,
  'replied',
  '+79991234567',
  NOW() - INTERVAL '1 hour'
FROM campaign_data c
CROSS JOIN contact_data co
WHERE EXISTS (SELECT 1 FROM campaign_data)
  AND EXISTS (SELECT 1 FROM contact_data);

-- Проверка добавленных данных
SELECT 
  'Template' as type,
  name,
  status::text as info
FROM templates 
WHERE whatsapp_template_id = 'test_template_12345'

UNION ALL

SELECT 
  'Contact' as type,
  name,
  phone
FROM contacts 
WHERE phone = '+79991234567'

UNION ALL

SELECT 
  'Campaign' as type,
  name,
  status::text
FROM campaigns 
WHERE name = 'Тестовая Кампания'

UNION ALL

SELECT 
  'Chat' as type,
  'Chat with ' || c.name,
  ch.status::text
FROM chats ch
JOIN contacts c ON c.id = ch.contact_id
WHERE c.phone = '+79991234567'

UNION ALL

SELECT 
  'Messages' as type,
  'Total messages',
  COUNT(*)::text
FROM messages m
JOIN chats ch ON ch.id = m.chat_id
JOIN contacts c ON c.id = ch.contact_id
WHERE c.phone = '+79991234567';

