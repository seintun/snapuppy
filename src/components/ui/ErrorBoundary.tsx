import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { ErrorScreen } from './ErrorScreen';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error caught by ErrorBoundary', error, { errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <ErrorScreen
            error={this.state.error}
            reset={() => this.setState({ hasError: false, error: null })}
          />
        )
      );
    }

    return this.props.children;
  }
}
