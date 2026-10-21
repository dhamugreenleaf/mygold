import React, { createContext, useContext, useState, useEffect } from 'react';
import { logout as apiLogout, getMe } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  setAuthSession: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('aurum_user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('aurum_token'));
  const [loading, setLoading] = useState(true);

  // Verify session on initial app load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('aurum_token');
      if (storedToken) {
        try {
          const res = await getMe();
          if (res?.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('aurum_user', JSON.stringify(res.data.user));
          } else {
            throw new Error('Invalid user payload');
          }
        } catch (err) {
          // Token expired or invalid
          setToken(null);
          setUser(null);
          localStorage.removeItem('aurum_token');
          localStorage.removeItem('aurum_user');
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen to global 401 unauthorized event from api.js
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      toast.error('Session expired. Please login again.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const setAuthSession = (authToken, authUser) => {
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem('aurum_token', authToken);
    localStorage.setItem('aurum_user', JSON.stringify(authUser));
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // silent catch
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('aurum_token');
      localStorage.removeItem('aurum_user');
      toast.success('Logged out successfully.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        setAuthSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
