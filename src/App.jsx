import React, { useState } from 'react';
import { Layout } from './components/Layout';
import Dashboard from './views/Dashboard';
import Vendors from './views/Vendors';
import Analytics from './views/Analytics';
import RegionMap from './views/RegionMap';
import Login from './views/Login';
import Employees from './views/Employees';
import Projects from './views/Projects';
import Settings from './views/Settings';
import AddExcel from './views/AddExcel';
import Renewals from './views/Renewals';
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

/* ─── Premium Maintenance Screen ─── */
const MaintenanceScreen = ({ user, onLogout }) => (
  <div style={{
    minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg-app)', padding: '2rem', textAlign: 'center',
    fontFamily: "'Inter', sans-serif"
  }}>
    {/* Animated Gear Icon */}
    <div style={{
      width: 96, height: 96, borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
      border: '2px solid rgba(245,158,11,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: '1.75rem',
      animation: 'spin 6s linear infinite',
    }}>
      <span style={{ fontSize: '2.8rem' }}>⚙️</span>
    </div>

    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.6rem', color: 'var(--text-primary)' }}>
      System Under Maintenance
    </h1>
    <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: 420, lineHeight: 1.65, margin: '0 0 2rem' }}>
      Our team is performing scheduled maintenance and updates. The system will be back online shortly. Please check back soon.
    </p>

    {/* Status Badge */}
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.5rem 1.1rem', borderRadius: '99px',
      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
      marginBottom: '2rem'
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Maintenance in Progress</span>
    </div>

    {/* User Info / Actions */}
    {user ? (
      <>
        <div style={{
          padding: '1rem 1.5rem', borderRadius: '12px',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem'
        }}>
          Logged in as <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong> ({user.role})
        </div>

        <button
          onClick={onLogout}
          style={{
            padding: '0.6rem 1.4rem', borderRadius: '10px', border: '1px solid var(--border-color)',
            background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.85rem',
            cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => { e.target.style.background = 'var(--bg-card)'; e.target.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-secondary)'; }}
        >
          ← Sign Out
        </button>
      </>
    ) : (
      <div style={{
        padding: '0.8rem 1.5rem', borderRadius: '12px',
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        🔒 All user access is temporarily paused by System Admin
      </div>
    )}

    <style>{`
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
    `}</style>
  </div>
);

const App = () => {
  const { state, dispatch } = useProcure();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [vendorFilter, setVendorFilter] = useState('');

  const isMaintenanceOn = state.isMaintenanceMode !== undefined 
    ? Boolean(state.isMaintenanceMode) 
    : (localStorage.getItem('cleanmax_maintenance') === 'true');
  const isAdmin = state.currentUser?.role?.toLowerCase() === 'admin';

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard setCurrentTab={setCurrentTab} setVendorFilter={setVendorFilter} />;
      case 'vendors':
        return state.currentUser?.role?.toLowerCase() === 'viewer' ? <Dashboard setCurrentTab={setCurrentTab} setVendorFilter={setVendorFilter} /> : <Vendors initialFilter={vendorFilter} />;
      case 'employees':
        return state.currentUser?.role?.toLowerCase() === 'admin' ? <Employees /> : <Dashboard setCurrentTab={setCurrentTab} setVendorFilter={setVendorFilter} />;
      case 'analytics':
        return <Analytics />;
      case 'projects':
        return <Projects />;
      case 'renewals':
        return <Renewals />;
      case 'map':
        return <RegionMap />;
      case 'settings':
        return <Settings />;
      case 'add_excel':
        return <AddExcel />;
      default:
        return <Dashboard setCurrentTab={setCurrentTab} setVendorFilter={setVendorFilter} />;
    }
  };

  const handleLogout = () => dispatch({ type: 'LOGOUT' });

  return (
    <ErrorBoundary>
      {isMaintenanceOn && !isAdmin ? (
        /* Block non-admin users across ALL devices when maintenance is active */
        <MaintenanceScreen user={state.currentUser} onLogout={handleLogout} />
      ) : !state.currentUser ? (
        <Login onLogin={(user) => {}} />
      ) : (
        <Layout
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            if (tab !== 'vendors') setVendorFilter('');
            setCurrentTab(tab);
          }}
          onLogout={handleLogout}
          userRole={state.currentUser.role}
        >
          {renderContent()}
        </Layout>
      )}
    </ErrorBoundary>
  );
};

export default App;
