-- Migration: Create campaign_settings in settings table
-- This will store campaign default settings as JSON

-- Insert default campaign settings if not exists
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

