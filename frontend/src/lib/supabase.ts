import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// SUPABASE CLIENT
// ============================================
// Конфигурация загружается автоматически с бэкенда
// Бэкенд должен предоставить endpoint GET /api/config
// ============================================

let supabaseClient: SupabaseClient | null = null;
let supabaseConfig: { url: string; anonKey: string } | null = null;
let configPromise: Promise<void> | null = null;

// Get backend URL
function getBackendUrl(): string {
  // Use relative path in production, allow override in dev
  if (import.meta.env.PROD) {
    return '/wasend/api';
  }
  return localStorage.getItem('backend_api_url') || '/wasend/api';
}

// Fetch config from backend
async function fetchConfig(): Promise<{ url: string; anonKey: string } | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/config`);
    if (!response.ok) {
      console.error('Failed to fetch config from backend:', response.status);
      return null;
    }
    const data = await response.json();
    return {
      url: data.supabase_url,
      anonKey: data.supabase_anon_key,
    };
  } catch (error) {
    console.error('Error fetching config from backend:', error);
    return null;
  }
}

// Initialize Supabase config from backend (call once on app start)
export async function initSupabase(): Promise<boolean> {
  if (supabaseConfig) return true;
  
  if (!configPromise) {
    configPromise = (async () => {
      try {
        const config = await fetchConfig();
        if (config && config.url && config.anonKey) {
          supabaseConfig = config;
          // Get the correct redirect URL based on environment
          const getRedirectUrl = () => {
            if (import.meta.env.PROD) {
              return `${window.location.origin}/wasend/auth`;
            }
            return `${window.location.origin}/auth`;
          };

          supabaseClient = createClient(config.url, config.anonKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              redirectTo: getRedirectUrl(),
            },
          });
        }
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        // Don't throw - allow app to continue, backend might be temporarily unavailable
      }
    })();
  }
  
  try {
    await configPromise;
  } catch (error) {
    console.error('Error waiting for Supabase config:', error);
    // Return false but don't block the app
  }
  
  return supabaseConfig !== null;
}

// Get Supabase client (may be null if not initialized)
export function getSupabase(): SupabaseClient | null {
  return supabaseClient;
}

// Check if configured
export function isSupabaseConfigured(): boolean {
  return supabaseClient !== null;
}

// Get current config
export function getSupabaseConfig() {
  return supabaseConfig || { url: '', anonKey: '' };
}

// Legacy functions for backward compatibility
export function configureSupabase(url: string, anonKey: string): SupabaseClient {
  supabaseConfig = { url, anonKey };
  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabaseClient;
}

export function clearSupabaseConfig() {
  supabaseConfig = null;
  supabaseClient = null;
  configPromise = null;
}
