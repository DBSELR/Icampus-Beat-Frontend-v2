import React, { createContext, useContext, useState, useEffect } from 'react';
import { isTokenExpired, TOKEN_EXPIRATION_TIME, clearAllAppData } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Function to clear all authentication data
  const clearAuthData = () => {
    // Clear all localStorage data using utility function
    clearAllAppData();
    
    // Update state
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    
    console.log('All authentication and app data cleared');
  };

  // Function to set up token expiration timer
  const setupTokenExpirationTimer = () => {
    // Clear any existing timer
    if (window.tokenExpirationTimer) {
      clearTimeout(window.tokenExpirationTimer);
    }

    // Set up new timer for 1 hour
    window.tokenExpirationTimer = setTimeout(() => {
      console.log('Token expired after 1 hour, logging out...');
      clearAuthData();
    }, TOKEN_EXPIRATION_TIME);
  };

  useEffect(() => {
    // Check for existing authentication on app load
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const tokenTimestamp = localStorage.getItem('tokenTimestamp');

    if (storedToken && storedUser) {
      // Check if token is expired using utility function
      if (isTokenExpired()) {
        console.log('Token expired, clearing authentication data');
        clearAuthData();
      } else {
        // Token is still valid, restore authentication
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        
        // Set up expiration timer
        setupTokenExpirationTimer();
        
        const tokenTimestamp = localStorage.getItem('tokenTimestamp');
        const timeRemaining = Math.round((TOKEN_EXPIRATION_TIME - (Date.now() - parseInt(tokenTimestamp))) / 1000 / 60);
        console.log('Token restored, expires in:', timeRemaining, 'minutes');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (tokenData, userData) => {
    // Ensure token is a string
    const tokenString = typeof tokenData === 'string' ? tokenData : JSON.stringify(tokenData);
    const tokenTimestamp = Date.now().toString();
    
    // Store in localStorage with timestamp
    localStorage.setItem('token', tokenString);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tokenTimestamp', tokenTimestamp);
    
    // Update state
    setUser(userData);
    setToken(tokenString);
    setIsAuthenticated(true);
    
    // Set up token expiration timer
    setupTokenExpirationTimer();
    
    console.log('Login successful, token expires in 1 hour');
  };

  const logout = () => {
    // Clear the expiration timer
    if (window.tokenExpirationTimer) {
      clearTimeout(window.tokenExpirationTimer);
      window.tokenExpirationTimer = null;
    }
    
    // Clear all authentication data
    clearAuthData();
    
    console.log('User logged out manually');
  };

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

