import React, { useState, useEffect, useMemo } from 'react';
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
  Lock,
  AlertTriangle,
  Info,
  CheckCircle,
  Building,
  FileSpreadsheet
} from 'lucide-react';

const ProfileModal = ({ user, onClose }) => {
  const { dispatch, showToast } = useProcure();
  const [password, setPassword] = useState(user.password);
  const isViewer = user.role?.toLowerCase() === 'viewer';
  
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
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.5rem', boxShadow: 'var(--shadow-glow)', overflow: 'hidden' }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>{user.name}</p>
              {!isViewer && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user.email}</p>}
            </div>
          </div>
          
          <div style={{ padding: '1rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: !isViewer ? '0.5rem' : '0' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Role</span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{user.role}</span>
            </div>
            {!isViewer && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Phone</span>
                <span style={{ fontWeight: 500 }}>{user.phone}</span>
              </div>
            )}
          </div>
        </div>

        {!isViewer && (
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
        )}
      </div>
    </div>
  );
};

const NotificationDropdown = ({ notifications, onMarkRead, onMarkAllRead, onClose, isMobile }) => {
  return (
    <div className="glass-panel animate-fade-in-up" style={{ 
      position: isMobile ? 'fixed' : 'absolute', 
      top: isMobile ? '65px' : '100%', 
      right: isMobile ? '50%' : '0', 
      transform: isMobile ? 'translateX(50%)' : 'none',
      width: isMobile ? '90vw' : '350px', 
      maxWidth: '350px',
      maxHeight: '400px', 
      overflowY: 'auto', 
      zIndex: 100, 
      marginTop: '0.5rem', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-card)', backdropFilter: 'blur(24px)', zIndex: 2 }}>
        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Notifications</h3>
        {notifications.some(n => n.isUnread) && (
          <button onClick={onMarkAllRead} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>Mark all read</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No notifications</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} onClick={() => { if(n.isUnread) onMarkRead(n.id); }} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', cursor: n.isUnread ? 'pointer' : 'default', background: n.isUnread ? 'var(--bg-primary)' : 'transparent', transition: 'background var(--transition-fast)' }} onMouseEnter={(e) => { if(n.isUnread) e.currentTarget.style.background = 'var(--bg-card)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = n.isUnread ? 'var(--bg-primary)' : 'transparent'; }}>
              <div style={{ marginTop: '0.25rem' }}>
                {n.type === 'warning' ? <AlertTriangle size={18} color="#f59e0b" /> : n.type === 'success' ? <CheckCircle size={18} color="#10b981" /> : n.type === 'alert' ? <AlertTriangle size={18} color="#ef4444" /> : <Info size={18} color="#3b82f6" />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: n.isUnread ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: n.isUnread ? 600 : 400 }}>{n.message}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>{new Date(n.timestamp).toLocaleString()}</span>
              </div>
              {n.isUnread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-color)', alignSelf: 'center' }} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const GlobalSearchDropdown = ({ query, results, onSelect }) => {
  if (!query) return null;
  return (
    <div className="glass-panel animate-fade-in-up global-search-dropdown mobile-responsive-width" style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', left: '0', width: '350px', maxHeight: '400px', overflowY: 'auto', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      {results.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No results found for "{query}"</div>
      ) : (
        results.map((r, i) => (
          <div key={`${r.type}-${r.id}-${i}`} onClick={() => onSelect(r)} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', cursor: 'pointer', transition: 'background var(--transition-fast)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <div style={{ marginTop: '0.25rem' }}>
              {r.type === 'vendor' ? <Building size={18} color="#10b981" /> : r.type === 'project' ? <Briefcase size={18} color="#3b82f6" /> : <User size={18} color="#f59e0b" />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{r.title}</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>{r.subtitle}</span>
            </div>
            <div style={{ alignSelf: 'center', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
              {r.type}
            </div>
          </div>
        ))
      )}
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
    { id: 'add_excel', label: 'Add Excel', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (userRole === 'admin') {
    tabs.splice(1, 0, { id: 'employees', label: 'Users', icon: Shield });
  } else if (userRole === 'viewer') {
    tabs = tabs.filter(t => t.id !== 'vendors' && t.id !== 'employees' && t.id !== 'add_excel');
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
  const [showNotifications, setShowNotifications] = useState(false);
  const { state, dispatch } = useProcure();
  const initials = state.currentUser ? state.currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AD';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showNotifications && !e.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    const q = globalSearchQuery.toLowerCase();
    const results = [];
    
    (state.vendors || []).forEach(v => {
      if ((v.vendorName && v.vendorName.toLowerCase().includes(q)) || (v.vendorCode && v.vendorCode.toLowerCase().includes(q)) || (v.city && v.city.toLowerCase().includes(q)) || (v.state && v.state.toLowerCase().includes(q))) {
        results.push({ type: 'vendor', id: v.id, title: v.vendorName, subtitle: `${v.city || ''}, ${v.state || ''} • ${v.status}` });
      }
    });

    (state.projects || []).forEach(p => {
      if ((p.name && p.name.toLowerCase().includes(q)) || (p.location && p.location.toLowerCase().includes(q)) || (p.phase && p.phase.toLowerCase().includes(q))) {
        results.push({ type: 'project', id: p.id, title: p.name, subtitle: `${p.location} • ${p.phase}` });
      }
    });

    if (userRole === 'admin') {
      (state.users || []).forEach(u => {
        if ((u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q)) || (u.role && u.role.toLowerCase().includes(q))) {
          results.push({ type: 'user', id: u.id, title: u.name, subtitle: `${u.email} • ${u.role}` });
        }
      });
    }
    
    return results.slice(0, 10);
  }, [globalSearchQuery, state.vendors, state.projects, state.users, userRole]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isSearchFocused && !e.target.closest('.global-search-container')) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchFocused]);

  const handleSearchResultClick = (result) => {
    setGlobalSearchQuery('');
    setIsSearchFocused(false);
    if (result.type === 'vendor') setCurrentTab('vendors');
    else if (result.type === 'project') setCurrentTab('projects');
    else if (result.type === 'user') setCurrentTab('employees');
  };

  const userNotifications = (state.notifications || [])
    .filter(n => n.targetRoles.includes(userRole))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map(n => ({
      ...n,
      isUnread: !(n.readBy || []).includes(state.currentUser?.id)
    }));
  
  const unreadCount = userNotifications.filter(n => n.isUnread).length;

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
          flexShrink: 0,
          height: '80px',
          padding: isMobile ? '0 1rem' : '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-app)',
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
              <div className="global-search-container" style={{ position: 'relative', marginRight: '1rem' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Global search..." 
                  className="premium-input" 
                  style={{ paddingLeft: '2.5rem', width: '250px', borderRadius: '99px' }} 
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                />
                {isSearchFocused && globalSearchQuery && (
                  <GlobalSearchDropdown 
                    query={globalSearchQuery} 
                    results={searchResults} 
                    onSelect={handleSearchResultClick} 
                  />
                )}
              </div>
            )}
            <button className="btn-ghost" onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}>
              {state.isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="notification-container" style={{ position: 'relative' }}>
              <button className="btn-ghost" onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative' }}>
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid var(--bg-app)' }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationDropdown 
                  notifications={userNotifications}
                  onMarkRead={(id) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { notificationId: id, userId: state.currentUser?.id } })}
                  onMarkAllRead={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ', payload: { role: userRole, userId: state.currentUser?.id } })}
                  onClose={() => setShowNotifications(false)}
                  isMobile={isMobile}
                />
              )}
            </div>
            <button className="btn-ghost" onClick={onLogout} title="Log Out">
              <LogOut size={20} />
            </button>
            <div onClick={() => setShowProfile(true)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, boxShadow: 'var(--shadow-glow)', cursor: 'pointer', border: '2px solid var(--bg-app)', overflow: 'hidden' }} title="View Profile">
              {state.currentUser?.avatarUrl ? (
                <img src={state.currentUser.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? '1rem' : '1rem 3rem 3rem 3rem' }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', minWidth: 0, width: '100%' }}>
            {children}
          </div>
        </main>
      </div>
      {showProfile && state.currentUser && <ProfileModal user={state.currentUser} onClose={() => setShowProfile(false)} />}
    </div>
  );
};
