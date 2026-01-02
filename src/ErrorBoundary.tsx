import React from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';

type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: error?.message || 'Something went wrong.' };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log to console; could be sent to monitoring service
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 560, width: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Something went wrong</div>
            <div style={{ color: '#6b7280', marginBottom: 14 }}>{this.state.message}</div>
            <a href="/" style={{ display: 'inline-block', background: '#111827', color: '#fff', padding: '10px 14px', borderRadius: 10, textDecoration: 'none' }}>Go to Homepage</a>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
