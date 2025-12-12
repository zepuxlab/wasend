import dotenv from 'dotenv';
import path from 'path';

// Try to load .env from project root first, then fallback to backend/.env
// __dirname in compiled code is dist/config/, so go up 3 levels to get to project root
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const backendEnvPath = path.resolve(__dirname, '../../.env');
const localEnvPath = path.resolve(__dirname, '../.env');

// Load from root first, then backend, then local (root takes precedence)
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: backendEnvPath });
dotenv.config({ path: localEnvPath });

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY',
  'META_ACCESS_TOKEN',
  'META_PHONE_NUMBER_ID',
  'META_BUSINESS_ACCOUNT_ID',
  'META_WEBHOOK_VERIFY_TOKEN',
];

// Zoho credentials (optional - only required if ZOHO_CRM_ENABLED=true)
const optionalZohoVars = [
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REFRESH_TOKEN',
];

export function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  meta: {
    accessToken: process.env.META_ACCESS_TOKEN!,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID!,
    businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID!,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN!,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
  },
  zoho: {
    enabled: process.env.ZOHO_CRM_ENABLED === 'true',
    clientId: process.env.ZOHO_CLIENT_ID || '',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
    refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
    apiDomain: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com',
    orgId: process.env.ZOHO_ORG_ID || '', // Organization ID для создания ссылок на диалоги
  },
  frontendUrl: process.env.FRONTEND_URL || 'https://office.ampriomilano.com',
};

