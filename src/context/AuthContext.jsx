import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Auth] Initializing...');

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        console.log('[Auth] getSession result:', { session: !!session, error });
        if (error) {
          console.error('[Auth] getSession error:', error);
        }
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[Auth] getSession catch:', err);
        setLoading(false);
      });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] onAuthStateChange:', _event);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    displayName: user?.user_metadata?.full_name ||
                 user?.user_metadata?.name ||
                 user?.user_metadata?.username ||
                 user?.email?.split('@')[0] ||
                 'Utilisateur',
    avatarUrl: user?.user_metadata?.avatar_url,
    email: user?.email,
    signInWithDiscord,
    signInWithGoogle,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
