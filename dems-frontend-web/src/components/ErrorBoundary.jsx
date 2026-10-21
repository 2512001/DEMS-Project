import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="section-card">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-danger-soft text-danger">
              <AlertTriangle size={17} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">This section couldn&apos;t be displayed</h2>
              <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                Something went wrong while rendering this view. Your data is safe — reload the page or try again.
              </p>
              <p className="mt-2 break-anywhere font-mono text-[11.5px] text-ink-faint">{this.state.error.message}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary btn-sm mt-3"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
