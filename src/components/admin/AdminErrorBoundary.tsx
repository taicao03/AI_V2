import { Component, type ErrorInfo, type ReactNode } from 'react';

type AdminErrorBoundaryProps = {
  children: ReactNode;
  onBack: () => void;
};

type AdminErrorBoundaryState = {
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

export class AdminErrorBoundary extends Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  state: AdminErrorBoundaryState = {
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<AdminErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-[#070914] p-6 text-slate-100">
        <div className="ambient-grid" />
        <section className="panel relative mx-auto max-w-3xl p-6">
          <h1 className="text-xl font-semibold text-white">Admin Dashboard bi loi runtime</h1>
          <p className="mt-2 text-sm text-rose-200">{this.state.error.message}</p>
          {this.state.errorInfo?.componentStack && (
            <pre className="mt-4 max-h-80 overflow-auto rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-xs text-slate-300">
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button className="choice-button mt-4 min-h-11" onClick={this.props.onBack} type="button">
            Ve trang chinh
          </button>
        </section>
      </main>
    );
  }
}
