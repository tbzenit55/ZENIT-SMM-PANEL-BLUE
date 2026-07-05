// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#05070B] text-white p-6 font-sans">
          <div className="max-w-md w-full bg-[#0A0E17]/80 border border-blue-900/40 rounded-xl p-8 shadow-[0_0_50px_rgba(0,102,255,0.08)] backdrop-blur-md text-center">
            <div className="w-16 h-16 bg-red-950/30 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertOctagon className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Something went wrong</h1>
            <p className="text-gray-400 text-sm mb-6">
              An unexpected error occurred in the panel. Try reloading or contact support if the issue persists.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-black/50 border border-gray-800/60 rounded p-3 text-left overflow-x-auto text-red-400 font-mono mb-6 max-h-32">
                {this.state.error.toString()}
              </pre>
            )}
            <button
              id="reset-boundary-btn"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 justify-center w-full px-5 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all rounded-lg text-sm font-medium shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
