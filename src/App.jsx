import React, { useState } from 'react';
import { Layout } from './components/Layout';
// We will create these components next
import Dashboard from './views/Dashboard';
import Vendors from './views/Vendors';
import Analytics from './views/Analytics';
import RegionMap from './views/RegionMap';
import Login from './views/Login';
import Employees from './views/Employees';
import Projects from './views/Projects';
import Settings from './views/Settings';
import { useProcure } from './context/ProcureContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fee', color: '#c00', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Error details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const { state, dispatch } = useProcure();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [vendorFilter, setVendorFilter] = useState('');

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard setCurrentTab={setCurrentTab} setVendorFilter={setVendorFilter} />;
      case 'vendors':
        return state.currentUser?.role === 'viewer' ? <Dashboard setCurrentTab={setCurrentTab} setVendorFilter={setVendorFilter} /> : <Vendors initialFilter={vendorFilter} />;
      case 'employees':
        return state.currentUser?.role === 'admin' ? <Employees /> : <Dashboard setCurrentTab={setCurrentTab} setVendorFilter={setVendorFilter} />;
      case 'analytics':
        return <Analytics />;
      case 'projects':
        return <Projects />;
      case 'map':
        return <RegionMap />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setCurrentTab={setCurrentTab} setVendorFilter={setVendorFilter} />;
    }
  };

  return (
    <ErrorBoundary>
      {!state.currentUser ? (
        <Login onLogin={(user) => {}} />
      ) : (
        <Layout 
          currentTab={currentTab} 
          setCurrentTab={(tab) => {
            // Clear the filter if we are navigating manually from the sidebar
            if (tab !== 'vendors') setVendorFilter('');
            setCurrentTab(tab);
          }}
          onLogout={() => dispatch({ type: 'LOGOUT' })}
          userRole={state.currentUser.role}
        >
          {renderContent()}
        </Layout>
      )}
    </ErrorBoundary>
  );
};

export default App;
