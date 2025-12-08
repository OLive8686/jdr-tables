import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('rpg_username') || '';
  });

  const [isGM, setIsGM] = useState(() => {
    return localStorage.getItem('rpg_isGM') === 'true';
  });

  const login = (username, gmStatus) => {
    localStorage.setItem('rpg_username', username);
    localStorage.setItem('rpg_isGM', gmStatus.toString());
    setCurrentUser(username);
    setIsGM(gmStatus);
  };

  const logout = () => {
    localStorage.removeItem('rpg_username');
    localStorage.removeItem('rpg_isGM');
    setCurrentUser('');
    setIsGM(false);
  };

  const value = {
    currentUser,
    isGM,
    login,
    logout,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
