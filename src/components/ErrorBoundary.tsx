import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Avoid a blank "blue" shell if a child throws — shows the error for debugging.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App error:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{
            background: 'var(--lumino-bg, #0f172a)',
            color: 'var(--lumino-text, #f8fafc)',
          }}
        >
          <h1 className="text-lg font-bold text-[var(--lumino-error,#f87171)]">Something went wrong</h1>
          <pre className="text-left text-xs text-[var(--lumino-text-muted,#94a3b8)] max-w-lg w-full overflow-auto whitespace-pre-wrap break-words">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="px-4 py-2 rounded-lg font-bold text-sm bg-[var(--lumino-turquoise,#7dcfb6)] text-[var(--lumino-bg,#0f172a)]"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
