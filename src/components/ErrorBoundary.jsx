import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Something went wrong</h2>
            <p>
              We&apos;re sorry, but something unexpected happened. Please try
              refreshing the page.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error details (development only)</summary>
                <pre>{this.state.error && this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="error-retry-button"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional fallback component
export const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="error-fallback">
    <h2>Oops! Something went wrong</h2>
    <p>We encountered an unexpected error. Please try again.</p>
    {process.env.NODE_ENV === 'development' && (
      <details className="error-details">
        <summary>Error details</summary>
        <pre>{error.message}</pre>
        <pre>{error.stack}</pre>
      </details>
    )}
    <button onClick={resetErrorBoundary} className="error-retry-button">
      Try Again
    </button>
  </div>
)
