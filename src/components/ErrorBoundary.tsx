import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      try {
        const parsed = JSON.parse(this.state.error?.message || '');
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass p-12 rounded-3xl max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-error" />
            </div>
            <h1 className="text-3xl font-display font-bold">Something went wrong</h1>
            <p className="text-text-secondary">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-accent-primary text-bg-primary px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform mx-auto"
            >
              <RefreshCcw className="w-5 h-5" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
