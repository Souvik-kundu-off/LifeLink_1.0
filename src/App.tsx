import React, { useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import Login from './components/auth/Login';
import Dashboard from './components/individual/Dashboard';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'dashboard' | 'test'>('landing');

  console.log('App rendering, currentPage:', currentPage);

  const navigate = (page: 'landing' | 'login' | 'dashboard' | 'test') => {
    console.log('Navigating to:', page);
    setCurrentPage(page);
  };

  if (currentPage === 'landing') {
    return (
      <ErrorBoundary>
        <LandingPage navigate={navigate} />
      </ErrorBoundary>
    );
  }

  if (currentPage === 'login') {
    return (
      <ErrorBoundary>
        <Login navigate={navigate} role="individual" />
      </ErrorBoundary>
    );
  }

  if (currentPage === 'dashboard') {
    return (
      <ErrorBoundary>
        <Dashboard navigate={navigate} />
      </ErrorBoundary>
    );
  }

  // Test page
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            LifeLink Test Page
          </h1>
          <p className="text-gray-600 mb-4">
            Test navigation between components
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('landing')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 block w-full"
            >
              Go to Landing Page
            </button>
            <button
              onClick={() => navigate('login')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 block w-full"
            >
              Go to Login Page
            </button>
            <button
              onClick={() => navigate('dashboard')}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 block w-full"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}