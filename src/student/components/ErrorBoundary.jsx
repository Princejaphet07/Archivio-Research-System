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
    console.error("ErrorBoundary caught an error", error, errorInfo);
    
    // Auto reload once if it's a dynamic chunk error after new deployment
    const isChunkError = 
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('MIME type') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      const pageHasBeenForceRefreshed = JSON.parse(
        window.sessionStorage.getItem('archivio_chunk_reload_eb') || 'false'
      );
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('archivio_chunk_reload_eb', 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    window.sessionStorage.removeItem('archivio_chunk_reload_eb');
    window.sessionStorage.removeItem('archivio_chunk_reload_retry');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = 
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('MIME type') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{isChunkError ? '🔄' : '⚠️'}</div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>
              {isChunkError ? 'New Update Available' : 'Oops! Something went wrong.'}
            </h1>
            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>
              {isChunkError 
                ? 'A new version of ARCHIVIO was just deployed. Please refresh to load the latest updates.' 
                : "We're sorry, but something went wrong. Please try refreshing the page or contact support if the problem persists."}
            </p>
            {this.state.error && !isChunkError && (
              <pre style={{ textAlign: 'left', background: '#f3f4f6', padding: '10px', borderRadius: '4px', fontSize: '12px', overflowX: 'auto', marginBottom: '24px', color: '#ef4444' }}>
                {this.state.error.toString()}
              </pre>
            )}
            <button 
              onClick={this.handleReload}
              style={{
                backgroundColor: '#7a2e46',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#5c2234'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#7a2e46'}
            >
              {isChunkError ? 'Update & Refresh Page' : 'Refresh Page'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
