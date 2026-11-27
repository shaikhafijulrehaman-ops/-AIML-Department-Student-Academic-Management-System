import React from 'react';
import { AlertCircle, RefreshCw, XCircle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Application ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.handleReset)
          : this.props.fallback;
      }

      // Compact/Modal view for contained errors (avoids full page crash)
      if (this.props.compact) {
        return (
          <div className="p-6 bg-white rounded-3xl border border-rose-200 shadow-xl max-w-lg mx-auto my-6 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Component Display Error</h3>
            <p className="text-xs text-slate-500 mb-4">
              A temporary display error occurred in this view. Your session and data are intact.
            </p>
            {this.state.error?.message && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono text-[11px] text-slate-700 mb-4 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#5E8881] hover:bg-[#48706A] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Close &amp; Return
              </button>
            </div>
          </div>
        );
      }

      // Full-screen application fallback
      return (
        <div className="min-h-screen bg-[#E8E0CF] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#D4CAB4] shadow-xl text-center">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-rose-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              An unexpected display issue occurred. Your data and authentication session are safe. Click below to continue.
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left mb-6 overflow-x-auto text-[11px] font-mono text-slate-700">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 px-4 rounded-xl bg-[#5E8881] hover:bg-[#48706A] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Try Returning to Portal</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
