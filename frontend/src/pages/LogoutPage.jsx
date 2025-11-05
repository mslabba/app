import React, { useEffect, useState } from 'react';
import { logOut } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';

const LogoutPage = () => {
  const [status, setStatus] = useState('Logging out...');
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logOut();
        setStatus('✅ Logged out successfully!');
        // Clear any cached data
        if (window.localStorage) {
          window.localStorage.clear();
        }
        if (window.sessionStorage) {
          window.sessionStorage.clear();
        }
        // Redirect to home after 2 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      } catch (error) {
        console.error('Logout error:', error);
        setStatus(`❌ Logout failed: ${error.message}`);
      }
    };

    performLogout();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div>
        <h1>🚪 Logging Out</h1>
        <p style={{ fontSize: '18px', margin: '20px 0' }}>{status}</p>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255,255,255,0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '20px auto'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: '20px' }}>
          <a
            href="/"
            style={{ color: 'white', textDecoration: 'underline' }}
          >
            Go to Home Page
          </a>
        </p>
      </div>
    </div>
  );
};

export default LogoutPage;