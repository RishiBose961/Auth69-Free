import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { TwoFactorModal } from './components/TwoFactorModal';
import { QRCodeLogin } from './components/QRCodeLogin';
import { Dashboard } from './components/Dashboard';
import { QrCode, LogIn, UserPlus } from 'lucide-react';
import './App.css';

const MainContent: React.FC = () => {
  const { user, challenge, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'qr' | 'login' | 'register'>('qr');

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Auth69 secure session...</p>
      </div>
    );
  }

  // 1. If authenticated, show Dashboard
  if (user) {
    return <Dashboard />;
  }

  // 2. If 2FA challenge is in progress, show 2-Step Verification Screen
  if (challenge) {
    return (
      <div className="auth-view-wrapper">
        <TwoFactorModal />
      </div>
    );
  }

  // 3. Otherwise show WhatsApp QR, Password Login or Register
  return (
    <div className="auth-view-wrapper">
      <div className="auth-tab-bar">
        <button
          type="button"
          className={`tab-btn ${authMode === 'qr' ? 'active' : ''}`}
          onClick={() => setAuthMode('qr')}
        >
          <QrCode size={16} />
          <span>QR Code Login</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
          onClick={() => setAuthMode('login')}
        >
          <LogIn size={16} />
          <span>Email & Password</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
          onClick={() => setAuthMode('register')}
        >
          <UserPlus size={16} />
          <span>Create Account</span>
        </button>
      </div>

      {authMode === 'qr' ? (
        <QRCodeLogin onSwitchToPasswordLogin={() => setAuthMode('login')} />
      ) : authMode === 'login' ? (
        <LoginForm
          onSwitchToRegister={() => setAuthMode('register')}
          onSwitchToQR={() => setAuthMode('qr')}
        />
      ) : (
        <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <MainContent />
        </main>
        <footer className="footer">
          <p>Auth69 Enterprise Authentication • End-to-End 2-Step Verification with auth69mob</p>
        </footer>
      </div>
    </AuthProvider>
  );
}
