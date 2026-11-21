import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ShieldAlert, LogOut, Smartphone, UserCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-logo">
            <span className="logo-badge">69</span>
          </div>
          <div className="brand-text">
            <span className="brand-title">Auth69</span>
            <span className="brand-subtitle">Enterprise Auth & 2FA</span>
          </div>
        </div>

        <div className="navbar-actions">
          {user ? (
            <div className="user-nav-profile">
              <div className="two-fa-pill" title={user.twoFactorEnabled ? '2-Step Verification Active' : '2-Step Verification Disabled'}>
                {user.twoFactorEnabled ? (
                  <>
                    <ShieldCheck size={16} className="text-emerald" />
                    <span>2FA Protected</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={16} className="text-amber" />
                    <span>2FA Disabled</span>
                  </>
                )}
              </div>

              <div className="user-avatar-badge">
                <UserCheck size={16} />
                <span className="user-nav-name">{user.name}</span>
              </div>

              <button onClick={logout} className="btn-logout" title="Sign out">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="companion-status">
              <Smartphone size={16} className="text-accent" />
              <span>Mobile Companion: auth69mob</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
