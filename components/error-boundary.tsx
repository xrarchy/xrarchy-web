'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // Call the onError callback if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // If a custom fallback is provided, use it
            if (this.props.fallback) {
                const FallbackComponent = this.props.fallback;
                return <FallbackComponent error={this.state.error!} reset={this.handleReset} />;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-md w-full space-y-6">
                        <div className="text-center">
                            <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />
                            <h1 className="mt-4 text-2xl font-bold text-gray-900">Something went wrong</h1>
                            <p className="mt-2 text-gray-600">
                                We encountered an unexpected error. Please try refreshing the page.
                            </p>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    Error Details
                                </CardTitle>
                                <CardDescription>
                                    If this problem persists, please contact support.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {this.state.error && (
                                    <Alert variant="destructive">
                                        <AlertDescription className="font-mono text-sm">
                                            {this.state.error.message}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex flex-col gap-2">
                                    <Button onClick={this.handleReset} className="w-full">
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Try Again
                                    </Button>
                                    <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                                        <Home className="h-4 w-4 mr-2" />
                                        Go to Home
                                    </Button>
                                </div>

                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                                            Development Error Details
                                        </summary>
                                        <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                                            {this.state.error.stack}
                                        </pre>
                                        {this.state.errorInfo && (
                                            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        )}
                                    </details>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Hook version for functional components
export function useErrorHandler() {
    const handleError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
        console.error('Application error:', error, errorInfo);

        // You can integrate with error reporting services here
        // Example: Sentry, LogRocket, etc.
    }, []);

    return { handleError };
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
    const WrappedComponent = (props: P) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

    return WrappedComponent;
}
