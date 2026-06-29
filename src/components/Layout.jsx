import React, { useState, useEffect } from 'react';
import { useProcure } from '../context/ProcureContext';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Map as MapIcon, 
  BarChart3, 
  Settings,
  Menu,
  Bell,
  Moon,
  Sun,
  Search,
  LogOut,
  Shield,
  X,
  User,
  Lock
} from 'lucide-react';

const ProfileModal = ({ user, onClose }) => {
  const { dispatch, showToast } = useProcure();
  const [password, setPassword] = useState(user.password);
  
  const handleSave = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      showToast('Password cannot be empty', 'error');
      return;
    }
    dispatch({ type: 'UPDATE_USER', payload: { id: user.id, password } });
    showToast('Password updated successfully', 'success');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel animate-fade-in-up" style={{ width: '90%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={24} /> My Profile
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.5rem', boxShadow: 'var(--shadow-glow)' }}>
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>{user.name}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user.email}</p>
            </div>
          </div>
          
          <div style={{ padding: '1rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Role</span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{user.role}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Phone</span>
              <span style={{ fontWeight: 500 }}>{user.phone}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Change Password</label>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="premium-input" 
              style={{ paddingLeft: '2.5rem', width: '100%', background: '#fff', color: '#111827' }} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          <button type="submit" className="btn-premium" style={{ width: '100%' }}>Save Changes</button>
        </form>
      </div>
    </div>
  );
};

const Sidebar = ({ currentTab, setCurrentTab, isCollapsed, userRole, isMobile, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  let tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vendors', label: 'Vendors', icon: Users },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'map', label: 'Region Map', icon: MapIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (userRole === 'admin') {
    tabs.splice(2, 0, { id: 'employees', label: 'Users', icon: Shield });
  } else if (userRole === 'viewer') {
    tabs = tabs.filter(t => t.id !== 'vendors' && t.id !== 'employees');
  }

  return (
    <aside style={{
      width: isMobile ? '280px' : (isCollapsed ? '80px' : '280px'),
      background: 'var(--bg-sidebar)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border-color)',
      transition: 'all var(--transition-normal)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      position: isMobile ? 'fixed' : 'relative',
      height: '100vh',
      left: isMobile ? (isMobileMenuOpen ? 0 : '-100%') : 0
    }}>
      <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ 
          width: 40, height: 40, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
        }}>
          <img src={`${import.meta.env.BASE_URL}cleanmax logo (1).png`} alt="CleanMax" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
        {!isCollapsed && (
          <div className="animate-stagger delay-1" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>
            ProCure<span className="text-gradient">360</span>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setCurrentTab(tab.id);
                if (isMobile) setIsMobileMenuOpen(false);
              }}
              className={`animate-stagger delay-${(idx % 4) + 1}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem',
                background: isActive ? 'var(--bg-primary)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                fontWeight: isActive ? 600 : 500,
                boxShadow: isActive ? 'var(--shadow-float)' : 'none',
                border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
              }}
            >
              <Icon size={22} style={{ color: isActive ? 'var(--accent-color)' : 'inherit' }} strokeWidth={isActive ? 2.5 : 2} />
              {!isCollapsed && <span>{tab.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export const Layout = ({ children, currentTab, setCurrentTab, onLogout, userRole }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { state, dispatch } = useProcure();
  const initials = state.currentUser ? state.currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AD';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {isMobile && isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 45 }}
        />
      )}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        isCollapsed={isCollapsed} 
        userRole={userRole} 
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: '80px',
          padding: isMobile ? '0 1rem' : '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {isMobile && (
              <button className="btn-ghost" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!isMobile && (
              <div style={{ position: 'relative', marginRight: '1rem' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" placeholder="Global search..." className="premium-input" style={{ paddingLeft: '2.5rem', width: '250px', borderRadius: '99px' }} />
              </div>
            )}
            <button className="btn-ghost" onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}>
              {state.isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {!isMobile && (
              <button className="btn-ghost">
                <Bell size={20} />
              </button>
            )}
            <button className="btn-ghost" onClick={onLogout} title="Log Out">
              <LogOut size={20} />
            </button>
            <div onClick={() => setShowProfile(true)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, boxShadow: 'var(--shadow-glow)', cursor: 'pointer', border: '2px solid var(--bg-app)' }} title="View Profile">
              {initials}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '1rem 3rem 3rem 3rem' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
      {showProfile && state.currentUser && <ProfileModal user={state.currentUser} onClose={() => setShowProfile(false)} />}
    </div>
  );
};
