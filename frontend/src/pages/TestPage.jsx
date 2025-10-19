import React from 'react';

const TestPage = () => {
  console.log('TestPage rendering...');
  
  return (
    <div style={{ padding: '20px', background: 'white', color: 'black' }}>
      <h1>Test Page</h1>
      <p>If you can see this, React is working!</p>
      <p>Environment variables:</p>
      <ul>
        <li>REACT_APP_FIREBASE_API_KEY: {process.env.REACT_APP_FIREBASE_API_KEY ? 'SET' : 'NOT SET'}</li>
        <li>REACT_APP_BACKEND_URL: {process.env.REACT_APP_BACKEND_URL ? 'SET' : 'NOT SET'}</li>
      </ul>
    </div>
  );
};

export default TestPage;
