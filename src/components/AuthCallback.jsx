import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorParam = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (errorParam) {
          setError(errorDescription || errorParam);
          return;
        }

        if (accessToken && refreshToken) {
          // Set the session manually
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError(sessionError.message);
            return;
          }
        }

        // Redirect to home after successful auth
        window.location.href = '/';
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message);
      }
    };

    // Small delay to ensure URL is fully loaded
    setTimeout(handleCallback, 100);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md text-center">
          <p className="text-red-600 font-medium mb-4">Erreur de connexion</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retour a l'accueil
          </a>
        </div>
      </div>
    );
  }

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
