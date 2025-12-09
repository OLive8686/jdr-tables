import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  useEffect(() => {
    // The auth state change listener in AuthContext will handle the session
    // This page just shows a loading state while Supabase processes the callback
    const timer = setTimeout(() => {
      // Redirect to home after a short delay to ensure auth is processed
      window.location.href = '/';
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <Loader2 className="animate-spin mx-auto mb-4" size={48} />
        <p className="text-xl">Connexion en cours...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
