
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error('Root render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-6 space-y-3">
            <h1 className="text-xl font-bold text-red-300">Application Error</h1>
            <p className="text-sm text-slate-200">
              The app failed to render. Please copy the error below and share it.
            </p>
            <pre className="text-xs text-red-200 bg-slate-950/70 border border-slate-800 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
              {this.state.message}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
