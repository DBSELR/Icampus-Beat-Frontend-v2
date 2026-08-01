import React from 'react';
import AppRoutes from './routes.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
