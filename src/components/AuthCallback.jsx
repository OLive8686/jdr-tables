import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// This component handles the OAuth callback
const AuthCallback = () => {
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[Callback] Starting...');
      console.log('[Callback] URL:', window.location.href);
      console.log('[Callback] Hash:', window.location.hash);
      console.log('[Callback] Search:', window.location.search);

      // Check for error in URL
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const error = params.get('error') || hashParams.get('error');
      const errorDesc = params.get('error_description') || hashParams.get('error_description');

      if (error) {
        console.error('[Callback] OAuth error:', error, errorDesc);
        setStatus(`Erreur: ${errorDesc || error}`);
        setTimeout(() => window.location.href = '/', 3000);
        return;
      }

      // Check for code (PKCE flow)
      const code = params.get('code');
      if (code) {
        console.log('[Callback] Found code, exchanging...');
        setStatus('Echange du code...');

        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('[Callback] Exchange error:', exchangeError);
          setStatus(`Erreur: ${exchangeError.message}`);
          setTimeout(() => window.location.href = '/', 3000);
          return;
        }

        console.log('[Callback] Exchange success, session:', !!data.session);
        setStatus('Connecte! Redirection...');
        setTimeout(() => window.location.href = '/', 500);
        return;
      }

      // Check for access_token in hash (implicit flow)
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        console.log('[Callback] Found access_token in hash');
        setStatus('Token trouve, verification...');

        // Supabase should auto-detect this, just get session
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[Callback] Session error:', sessionError);
        }

        console.log('[Callback] Session result:', !!data?.session);
        setStatus(data?.session ? 'Connecte! Redirection...' : 'Verification...');
        setTimeout(() => window.location.href = '/', 500);
        return;
      }

      // No code or token found
      console.log('[Callback] No code or token found, redirecting...');
      setStatus('Redirection...');
      setTimeout(() => window.location.href = '/', 500);
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-xl">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
