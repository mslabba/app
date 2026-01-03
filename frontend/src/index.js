import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Suppress ResizeObserver errors globally (must be before any other code)
const resizeObserverErrSuppressor = () => {
  const resizeObserverErr = window.console.error;
  window.console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('ResizeObserver loop')) {
      return;
    }
    resizeObserverErr(...args);
  };
};

resizeObserverErrSuppressor();

// Suppress extension-related errors and DOM manipulation errors
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('extension')) {
    event.preventDefault();
    return false;
  }

  // Suppress ResizeObserver errors (harmless, occur during layout calculations)
  if (event.message && event.message.includes('ResizeObserver loop')) {
    event.stopImmediatePropagation();
    event.preventDefault();
    return false;
  }

  // Suppress common React DOM manipulation errors that don't affect functionality
  if (event.message && (
    event.message.includes('removeChild') ||
    event.message.includes('The node to be removed is not a child of this node') ||
    event.message.includes('NotFoundError')
  )) {
    console.warn('DOM manipulation error suppressed:', event.message);
    event.preventDefault();
    return false;
  }
});

// Also handle unhandled promise rejections related to DOM
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && (
    event.reason.message.includes('removeChild') ||
    event.reason.message.includes('The node to be removed is not a child of this node')
  )) {
    console.warn('Unhandled DOM error suppressed:', event.reason.message);
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));

// Remove StrictMode in production to prevent double rendering issues
const AppWrapper = process.env.NODE_ENV === 'development' ?
  () => (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  ) :
  () => (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

root.render(<AppWrapper />);