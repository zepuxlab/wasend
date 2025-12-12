-- SQL скрипт для удаления тестовых данных
-- Удаляет шаблон, контакт, чат, сообщения, кампанию и связанные данные

-- 1. Удалить логи активности для тестовой кампании
DELETE FROM activity_logs
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE name = 'Тестовая Кампания'
);

-- 2. Удалить получателей кампании
DELETE FROM campaign_recipients
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE name = 'Тестовая Кампания'
);

-- 3. Удалить тестовую кампанию
DELETE FROM campaigns
WHERE name = 'Тестовая Кампания';

-- 4. Удалить сообщения из тестового чата
DELETE FROM messages
WHERE chat_id IN (
  SELECT ch.id 
  FROM chats ch
  JOIN contacts c ON c.id = ch.contact_id
  WHERE c.phone = '+79991234567'
);

-- 5. Удалить тестовый чат
DELETE FROM chats
WHERE contact_id IN (
  SELECT id FROM contacts WHERE phone = '+79991234567'
);

-- 6. Удалить тестовый контакт
DELETE FROM contacts
WHERE phone = '+79991234567';

-- 7. Удалить тестовый шаблон
DELETE FROM templates
WHERE whatsapp_template_id = 'test_template_12345';

-- Проверка удаления
SELECT 
  'Templates deleted' as status,
  COUNT(*)::text as count
FROM templates 
WHERE whatsapp_template_id = 'test_template_12345'

UNION ALL

SELECT 
  'Contacts deleted' as status,
  COUNT(*)::text
FROM contacts 
WHERE phone = '+79991234567'

UNION ALL

SELECT 
  'Campaigns deleted' as status,
  COUNT(*)::text
FROM campaigns 
WHERE name = 'Тестовая Кампания'

UNION ALL

SELECT 
  'Chats deleted' as status,
  COUNT(*)::text
FROM chats ch
JOIN contacts c ON c.id = ch.contact_id
WHERE c.phone = '+79991234567';

