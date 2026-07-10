import React from 'react';

interface EditorErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class EditorErrorBoundary extends React.Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EditorErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Editor error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            color: '#ef4444',
          }}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>
            Error en el editor
          </h3>
          <p style={{ margin: 0, fontSize: '13px' }}>
            Ha ocurrido un error inesperado. Por favor, recarga la página e intenta de nuevo.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
