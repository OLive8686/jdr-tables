import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, auth, profiles } from '../lib/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile when user changes
  const fetchProfile = async (user) => {
    if (!user) {
      setProfile(null);
      return null;
    }

    try {
      const userProfile = await profiles.getById(user.id);
      setProfile(userProfile);
      return userProfile;
    } catch (error) {
      console.warn('Profile not found, using user metadata:', error.message);
      // Create a basic profile from user metadata
      const basicProfile = {
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.full_name ||
                      user.user_metadata?.name ||
                      user.user_metadata?.username ||
                      user.email?.split('@')[0] ||
                      'Utilisateur',
        avatar_url: user.user_metadata?.avatar_url,
        role: 'user'
      };
      setProfile(basicProfile);
      return basicProfile;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check active session on mount
    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        const session = await auth.getSession();
        console.log('Session:', session ? 'found' : 'none');

        if (mounted) {
          const user = session?.user || null;
          setCurrentUser(user);
          if (user) {
            await fetchProfile(user);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);

      if (mounted) {
        const user = session?.user || null;
        setCurrentUser(user);

        if (user) {
          await fetchProfile(user);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in with OAuth provider
  const signInWithProvider = async (provider) => {
    try {
      await auth.signInWithOAuth(provider);
    } catch (error) {
      console.error('OAuth error:', error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await auth.signOut();
      setCurrentUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (!currentUser) return;

    try {
      const updatedProfile = await profiles.update(currentUser.id, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    profile,
    loading,
    isAuthenticated: !!currentUser,
    isAdmin: profile?.role === 'admin',
    displayName: profile?.display_name || currentUser?.email?.split('@')[0] || '',
    signInWithGoogle: () => signInWithProvider('google'),
    signInWithDiscord: () => signInWithProvider('discord'),
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
