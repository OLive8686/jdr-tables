import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// This component just redirects to home
// Supabase handles the token exchange automatically via onAuthStateChange
const AuthCallback = () => {
  useEffect(() => {
    // Redirect to home - the auth state will be updated by onAuthStateChange
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-xl">Connexion en cours...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
