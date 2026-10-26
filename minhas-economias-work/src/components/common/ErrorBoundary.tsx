import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center p-5 bg-[var(--bg-app)] text-[var(--text-primary)]">
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                <h1 className="text-xl font-bold text-red-600">Erro ao carregar o aplicativo</h1>
                <p className="mt-2 text-sm text-red-700">Por favor, recarregue a página.</p>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
