import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Sentry } from '../lib/sentry';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  eventId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  declare state: State;
  declare props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, eventId: null };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    let eventId: string | null = null;
    try {
      Sentry.withScope((scope) => {
        scope.setExtra('componentStack', info.componentStack);
        eventId = Sentry.captureException(error) ?? null;
      });
    } catch {
      // Sentry not initialized (dev or missing DSN) — ignore
    }
    this.setState({ eventId });
  }

  handleReset = () => {
    this.setState({ hasError: false, eventId: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-(--surface-app) px-6">
          <div className="w-full max-w-lg rounded-4xl border bg-(--surface-card) p-8 text-center shadow-lg border-(--line-soft)">
            <p className="text-[11px] font-bold tracking-[0.18em] text-rose-500 uppercase">
              Error inesperado
            </p>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-(--text-primary)">
              Algo salio mal
            </h1>
            <p className="mt-2 text-sm text-(--text-secondary)">
              Ha ocurrido un error inesperado. Puedes intentar de nuevo o volver al inicio.
            </p>
            {this.state.eventId && (
              <p className="mt-4 rounded-lg bg-(--surface-card-strong) px-3 py-2 font-mono text-[10px] text-(--text-secondary)">
                ID: {this.state.eventId}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full rounded-2xl bg-(--accent) py-3.5 text-sm font-bold text-white"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full rounded-2xl border border-(--line-soft) py-3.5 text-sm font-bold text-(--text-primary)"
              >
                Ir al inicio
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary)"
              >
                Recargar la pagina
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
