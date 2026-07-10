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
          <div className="flex items-center gap-3 text-red-300">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-semibold">Interface fault isolated</h2>
          </div>
          <p className="mt-3 text-sm text-slate-400">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
