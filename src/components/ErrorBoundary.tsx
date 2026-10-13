import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const STORAGE_KEY = 'habit-quest-storage';

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private handleReset = () => {
    if (confirm('This will permanently delete all habits and progress on this device. Continue?')) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-white font-bold text-xl">Something went wrong</h1>
          <p className="text-white/50 text-sm">
            HabitQuest hit an unexpected error. Your data is still saved on this device.
          </p>
          <div className="flex flex-col gap-2">
            <button type="button" className="btn-primary justify-center" onClick={() => window.location.reload()}>
              Reload app
            </button>
            <button
              type="button"
              className="text-red-400/80 hover:text-red-400 text-xs py-2"
              onClick={this.handleReset}
            >
              Reset all data
            </button>
          </div>
        </div>
      </div>
    );
  }
}
