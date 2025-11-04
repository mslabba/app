import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log DOM manipulation errors but don't crash the app
    if (error.message && (
      error.message.includes('removeChild') ||
      error.message.includes('The node to be removed is not a child of this node') ||
      error.message.includes('NotFoundError')
    )) {
      console.warn('DOM manipulation error caught by ErrorBoundary:', error.message);
      // Reset the error state for DOM errors to continue normal operation
      this.setState({ hasError: false, error: null });
      return;
    }

    // Log other errors
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Don't show error UI for DOM manipulation errors
      if (this.state.error.message && (
        this.state.error.message.includes('removeChild') ||
        this.state.error.message.includes('The node to be removed is not a child of this node') ||
        this.state.error.message.includes('NotFoundError')
      )) {
        return this.props.children;
      }

      // Show fallback UI for other errors
      return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="mb-4">We're sorry, but something unexpected happened.</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-white text-purple-600 rounded hover:bg-gray-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;