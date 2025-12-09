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
      return;
    }

    try {
      const userProfile = await profiles.getById(user.id);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Check active session on mount
    const initAuth = async () => {
      try {
        const session = await auth.getSession();
        const user = session?.user || null;
        setCurrentUser(user);
        await fetchProfile(user);
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      await fetchProfile(user);
      setLoading(false);
    });

    return () => {
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
