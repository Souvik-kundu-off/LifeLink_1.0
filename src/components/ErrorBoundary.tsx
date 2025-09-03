import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription>
                An unexpected error occurred. This might be due to database setup issues or other technical problems.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="text-center space-y-4">
              {this.state.error && (
                <div className="bg-red-50 p-3 rounded-lg text-left">
                  <h3 className="font-medium text-red-900 mb-1">Error Details:</h3>
                  <p className="text-sm text-red-800 font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  If this error persists, please check:
                </p>
                <ul className="text-sm text-gray-600 text-left list-disc list-inside space-y-1">
                  <li>Database tables are properly set up (see DATABASE_SETUP.md)</li>
                  <li>Supabase connection is working</li>
                  <li>All required environment variables are configured</li>
                </ul>
              </div>
              
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}