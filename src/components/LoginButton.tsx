import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const LoginButton: React.FC = () => {
  const { user, login, logout } = useAuth();
  
  // Track whether the user has opted to turn on the Auth feature
  const [isAuthEnabled, setIsAuthEnabled] = useState(() => {
    return localStorage.getItem('google_auth_enabled') === 'true';
  });

  const toggleAuth = () => {
    const newState = !isAuthEnabled;
    setIsAuthEnabled(newState);
    localStorage.setItem('google_auth_enabled', String(newState));
  };

  // If there's an active user, show their profile regardless of toggle (so they can sign out)
  if (user) {
    return (
      <div className="flex items-center" style={{ gap: '10px' }}>
        {user.picture ? (
          <img 
            src={user.picture} 
            alt={user.name} 
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--accent-cyan)' }} 
          />
        ) : (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-column text-right font-orbitron">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-glow-cyan)' }}>{user.name}</span>
          <button 
            onClick={logout} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.6rem', padding: 0, marginTop: '2px', cursor: 'pointer', textAlign: 'right' }}
          >
            SIGN OUT
          </button>
        </div>
      </div>
    );
  }

  // If auth feature is turned off, show a subtle button to enable it
  if (!isAuthEnabled) {
    return (
      <button 
        onClick={toggleAuth}
        style={{ 
          background: 'rgba(0,0,0,0.3)', 
          border: '1px solid var(--text-muted)', 
          color: 'var(--text-muted)', 
          borderRadius: '4px', 
          padding: '4px 8px', 
          fontSize: '0.7rem', 
          cursor: 'pointer', 
          fontFamily: 'Orbitron',
          opacity: 0.6
        }}
      >
        ENABLE SYNC
      </button>
    );
  }

  // Ensure this fails gracefully if client UI is broken without proper key
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return (
      <div className="flex flex-column items-end">
        <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)' }}>
          Set VITE_GOOGLE_CLIENT_ID to enable login
        </div>
        <button 
          onClick={toggleAuth}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.6rem', marginTop: '4px', cursor: 'pointer', fontFamily: 'Orbitron' }}
        >
          DISABLE SYNC
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-column items-end" style={{ gap: '8px' }}>
      <GoogleLogin
        onSuccess={credentialResponse => {
          if (credentialResponse.credential) {
            login(credentialResponse.credential);
          }
        }}
        onError={() => {
          console.error('Login Failed');
        }}
        useOneTap
        shape="pill"
        theme="filled_black"
      />
      <button 
          onClick={toggleAuth}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.6rem', padding: 0, cursor: 'pointer', fontFamily: 'Orbitron' }}
        >
          CANCEL
      </button>
    </div>
  );
};

export default LoginButton;
