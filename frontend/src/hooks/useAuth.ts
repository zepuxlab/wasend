import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSupabase } from './useSupabase';

type AppRole = 'admin' | 'manager' | 'user';

export function useAuth() {
  const { supabase, isConfigured } = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !isConfigured) {
      setIsLoading(false);
      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, isConfigured]);

  const fetchUserRole = async (userId: string) => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.warn('Could not fetch user role:', error.message);
        setUserRole('user'); // Default role
      } else {
        setUserRole(data?.role as AppRole || 'user');
      }
    } catch (err) {
      console.warn('Error fetching role:', err);
      setUserRole('user');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return {
    user,
    session,
    userRole,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager' || userRole === 'admin',
    isUser: userRole === 'user',
    signOut,
  };
}
