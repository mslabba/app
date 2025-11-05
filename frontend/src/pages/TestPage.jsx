import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase';
import axios from 'axios';

const TestPage = () => {
  console.log('TestPage rendering...');
  const { currentUser, userProfile, loading, isAuthenticated, isSuperAdmin } = useAuth();
  const [testResults, setTestResults] = useState({});
  const [backendTest, setBackendTest] = useState('Testing...');

  useEffect(() => {
    const testBackend = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/health`);
        setBackendTest(`✅ Backend healthy: ${JSON.stringify(response.data)}`);
      } catch (error) {
        setBackendTest(`❌ Backend error: ${error.message}`);
      }
    };

    const testAuthMe = async () => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setTestResults(prev => ({
            ...prev,
            authMe: `✅ Auth /me success: ${JSON.stringify(response.data)}`
          }));
        } catch (error) {
          setTestResults(prev => ({
            ...prev,
            authMe: `❌ Auth /me error: ${error.message}`
          }));
        }
      }
    };

    testBackend();
    if (currentUser) {
      testAuthMe();
    }
  }, [currentUser]);

  return (
    <div style={{ padding: '20px', background: 'white', color: 'black' }}>
      <h1>Debug Test Page</h1>
      <p>If you can see this, React is working!</p>

      <h2>Environment Variables:</h2>
      <ul>
        <li>REACT_APP_FIREBASE_API_KEY: {process.env.REACT_APP_FIREBASE_API_KEY ? '✅ SET' : '❌ NOT SET'}</li>
        <li>REACT_APP_BACKEND_URL: {process.env.REACT_APP_BACKEND_URL || '❌ NOT SET'}</li>
        <li>REACT_APP_FIREBASE_PROJECT_ID: {process.env.REACT_APP_FIREBASE_PROJECT_ID || '❌ NOT SET'}</li>
      </ul>

      <h2>Firebase Status:</h2>
      <ul>
        <li>Auth initialized: {auth ? '✅ YES' : '❌ NO'}</li>
        <li>Current user: {currentUser ? `✅ ${currentUser.email}` : '❌ NOT LOGGED IN'}</li>
      </ul>

      <h2>Auth Context Status:</h2>
      <ul>
        <li>Loading: {loading ? '⏳ YES' : '✅ NO'}</li>
        <li>Is Authenticated: {isAuthenticated ? '✅ YES' : '❌ NO'}</li>
        <li>Is Super Admin: {isSuperAdmin ? '✅ YES' : '❌ NO'}</li>
        <li>User Profile: {userProfile ? `✅ ${JSON.stringify(userProfile)}` : '❌ NOT LOADED'}</li>
      </ul>

      <h2>Backend Tests:</h2>
      <ul>
        <li>Health Check: {backendTest}</li>
        <li>Auth /me: {testResults.authMe || (currentUser ? 'Testing...' : 'Not logged in')}</li>
      </ul>

      <h2>Actions:</h2>
      <div style={{ margin: '10px 0' }}>
        {currentUser && (
          <button
            onClick={async () => {
              try {
                const { logOut } = await import('@/lib/firebase');
                await logOut();
                window.location.reload();
              } catch (error) {
                console.error('Logout error:', error);
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            🚪 Logout
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default TestPage;
