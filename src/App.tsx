import React, { useState } from 'react';
import { AuthProvider } from './components/AuthProvider';
import SimpleDatabaseCheck from './components/SimpleDatabaseCheck';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import Login from './components/auth/Login';
import Dashboard from './components/individual/Dashboard';
import HospitalPortal from './components/hospital/HospitalPortal';
import AdminPortal from './components/admin/AdminPortal';
import HospitalApplication from './components/HospitalApplication';

type Page = 
  | 'landing' 
  | 'login' 
  | 'hospital-login'
  | 'admin-login'
  | 'dashboard' 
  | 'hospital' 
  | 'admin'
  | 'hospital-application';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [bypassDatabaseCheck, setBypassDatabaseCheck] = useState(false);

  const navigate = (page: Page) => {
    setCurrentPage(page);
  };

  // Add keyboard shortcut to bypass database check (for development)
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        console.log('Database check bypassed via keyboard shortcut');
        setBypassDatabaseCheck(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage navigate={navigate} />;
      case 'login':
        return <Login navigate={navigate} role="individual" />;
      case 'hospital-login':
        return <Login navigate={navigate} role="hospital_admin" />;
      case 'admin-login':
        return <Login navigate={navigate} role="platform_admin" />;
      case 'dashboard':
        return <Dashboard navigate={navigate} />;
      case 'hospital':
        return <HospitalPortal navigate={navigate} />;
      case 'admin':
        return <AdminPortal navigate={navigate} />;
      case 'hospital-application':
        return <HospitalApplication navigate={navigate} />;
      default:
        return <LandingPage navigate={navigate} />;
    }
  };

  const renderApp = () => (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {renderPage()}
      </div>
    </AuthProvider>
  );

  return (
    <ErrorBoundary>
      {bypassDatabaseCheck ? (
        renderApp()
      ) : (
        <SimpleDatabaseCheck onBypass={() => setBypassDatabaseCheck(true)}>
          {renderApp()}
        </SimpleDatabaseCheck>
      )}
    </ErrorBoundary>
  );
}