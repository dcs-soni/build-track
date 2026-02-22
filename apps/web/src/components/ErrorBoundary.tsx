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
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--ivory)] p-8 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Something went wrong
          </h1>
          <p className="max-w-md text-gray-600">
            An unexpected error occurred. Please try refreshing the page or
            contact support if the problem persists.
          </p>
          {this.state.error && (
            <pre className="mt-2 max-w-lg overflow-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-700">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-[var(--teal)] px-6 py-2 text-white transition-colors hover:opacity-90"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
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
