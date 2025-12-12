import { useState, useEffect, useCallback } from 'react';
import { getSupabase, isSupabaseConfigured, getSupabaseConfig } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export function useSupabase() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(getSupabase());
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());

  // Re-check on mount in case init happened after first render
  useEffect(() => {
    const client = getSupabase();
    if (client !== supabase) {
      setSupabase(client);
      setIsConfigured(isSupabaseConfigured());
    }
  }, []);

  // Poll for changes (in case init completes after mount)
  useEffect(() => {
    const interval = setInterval(() => {
      const client = getSupabase();
      const configured = isSupabaseConfigured();
      if (client !== supabase || configured !== isConfigured) {
        setSupabase(client);
        setIsConfigured(configured);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [supabase, isConfigured]);

  const getConfig = useCallback(() => {
    return getSupabaseConfig();
  }, []);

  return {
    supabase,
    isConfigured,
    isConnecting: false, // Now handled at App level
    connectionError: null, // Now handled at App level
    connect: async () => ({ success: false, error: 'Config is managed by backend' }),
    disconnect: () => {}, // No longer supported
    getConfig,
  };
}
