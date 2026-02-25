import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0A0A] p-8 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold text-white">
            Something went wrong
          </h1>
          <p className="max-w-md text-[#4A5568]">
            An unexpected error occurred. Please try refreshing the page or
            contact support if the problem persists.
          </p>
          {this.state.error && (
            <pre className="mt-2 max-w-lg overflow-auto rounded bg-[#111111] border border-[#1A1A1A] p-3 text-left text-xs text-[#E1E1E1]">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-6 py-2 bg-[#A68B5B] text-[#0A0A0A] text-sm font-medium tracking-wide uppercase transition-colors hover:bg-[#8A7048]"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 border border-[#2A2A2A] text-[#E1E1E1] text-sm font-medium tracking-wide uppercase transition-colors hover:bg-[#111111]"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
