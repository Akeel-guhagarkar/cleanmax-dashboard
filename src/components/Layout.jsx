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
  FileSpreadsheet,
  Check,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  History
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

const formatNotifTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return String(timestamp);
  }
};

const NotificationDropdown = ({ 
  notifications, 
  onMarkRead, 
  onMarkAllRead, 
  onDeleteNotification,
  onClearAll,
  onClose, 
  isMobile 
}) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => n.isUnread);
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => n.isUnread).length;
  const isAtCap = notifications.length >= 50;

  // ── MOBILE: bottom sheet style ──
  const mobileSheetStyles = isMobile ? {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    top: 'auto',
    width: '100%',
    maxWidth: '100%',
    maxHeight: '75vh',
    borderRadius: '20px 20px 0 0',
    animation: 'slideUpSheet 0.28s cubic-bezier(0.34, 1.2, 0.64, 1)',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
  } : {};

  // ── DESKTOP: dropdown style ──
  const desktopStyles = !isMobile ? {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    width: '390px',
    maxWidth: '400px',
    maxHeight: '540px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
    animation: 'fadeInDropdown 0.2s ease',
  } : {};

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 98,
            animation: 'fadeInOverlay 0.2s ease',
          }}
        />
      )}
      <div
        className="glass-panel"
        style={{
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(24px)',
          overflow: 'hidden',
          ...mobileSheetStyles,
          ...desktopStyles,
        }}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.6rem 0 0.2rem' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '99px', background: 'var(--border-color)' }} />
          </div>
        )}

        {/* ── STICKY HEADER ── */}
        <div style={{ padding: '0.85rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} style={{ color: 'var(--accent-color)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Notifications</h3>
              {unreadCount > 0 && (
                <span style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.12rem 0.45rem',
                  borderRadius: '99px'
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '0.2rem', color: 'var(--text-secondary)' }} title="Close">
              <X size={16} />
            </button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: '8px', padding: '0.2rem', width: 'fit-content' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                border: 'none',
                background: filter === 'all' ? 'var(--bg-card)' : 'transparent',
                color: filter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: filter === 'all' ? 600 : 500,
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              All ({notifications.length}{isAtCap ? ' · max' : ''})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                border: 'none',
                background: filter === 'unread' ? 'var(--bg-card)' : 'transparent',
                color: filter === 'unread' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: filter === 'unread' ? 600 : 500,
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Cap warning banner */}
          {isAtCap && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.3rem 0.6rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '6px',
              fontSize: '0.72rem',
              color: '#f59e0b',
              fontWeight: 500,
            }}>
              ⚠️ Showing latest 50 notifications. Clear old ones to see more.
            </div>
          )}
        </div>

        {/* ── SCROLLABLE NOTIFICATIONS LIST ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.35rem 0' }}>
          {filteredNotifications.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle size={36} style={{ color: 'var(--accent-color)', opacity: 0.6, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>You're all caught up!</p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications right now'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isWarning = n.type === 'warning';
              const isSuccess = n.type === 'success';
              const isError = n.type === 'error' || n.type === 'alert';

              const iconBg = isWarning ? 'rgba(245, 158, 11, 0.12)' : isSuccess ? 'rgba(16, 185, 129, 0.12)' : isError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)';
              const iconColor = isWarning ? '#f59e0b' : isSuccess ? '#10b981' : isError ? '#ef4444' : '#3b82f6';

              return (
                <div
                  key={n.id}
                  style={{
                    padding: '0.8rem 1.25rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '0.85rem',
                    position: 'relative',
                    background: n.isUnread ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                    transition: 'background var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = n.isUnread ? 'rgba(16, 185, 129, 0.03)' : 'transparent'}
                >
                  {/* Status Icon */}
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                    {isWarning ? <AlertTriangle size={18} color={iconColor} /> : isSuccess ? <CheckCircle size={18} color={iconColor} /> : isError ? <AlertTriangle size={18} color={iconColor} /> : <Info size={18} color={iconColor} />}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: n.isUnread ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                        {n.title}
                      </p>
                      {n.isUnread && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-color)', flexShrink: 0, marginTop: '0.3rem', boxShadow: '0 0 6px var(--accent-color)' }} />
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {n.message}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.45rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {formatNotifTime(n.timestamp)}
                      </span>

                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {n.isUnread && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}
                            className="btn-ghost"
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            title="Mark as read"
                          >
                            <Check size={12} /> Done
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteNotification(n.id); }}
                          className="btn-ghost"
                          style={{ padding: '0.15rem 0.3rem', color: '#94a3b8' }}
                          title="Delete notification"
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── STICKY FOOTER ACTION BAR (always visible!) ── */}
        {notifications.length > 0 && (
          <div style={{
            flexShrink: 0,
            padding: '0.65rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            {unreadCount > 0 ? (
              <button
                onClick={onMarkAllRead}
                className="btn-ghost"
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: 'var(--accent-color)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
                title="Mark all as read"
              >
                <CheckCheck size={14} /> Mark All Read
              </button>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>All caught up ✓</span>
            )}
            <button
              onClick={onClearAll}
              className="btn-ghost"
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                fontWeight: 600,
              }}
              title="Clear all notifications"
            >
              <Trash2 size={14} /> Clear All
            </button>
          </div>
        )}
      </div>
    </>
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

const Sidebar = ({ currentTab, setCurrentTab, isCollapsed, setIsCollapsed, userRole, isMobile, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  let tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vendors', label: 'Vendors', icon: Users },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'map', label: 'Region Map', icon: MapIcon },
    { id: 'renewals', label: 'Renewals History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'add_excel', label: 'Add Excel', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (userRole === 'admin') {
    tabs.splice(1, 0, { id: 'employees', label: 'Users', icon: Shield });
  } else if (userRole === 'viewer') {
    tabs = tabs.filter(t => t.id !== 'vendors' && t.id !== 'employees' && t.id !== 'add_excel' && t.id !== 'renewals');
  }

  return (
    <aside style={{
      width: isMobile ? '280px' : (isCollapsed ? '72px' : '240px'),
      flexShrink: 0,
      background: 'var(--bg-sidebar)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border-color)',
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      position: isMobile ? 'fixed' : 'relative',
      height: '100vh',
      overflow: 'hidden',
      left: isMobile ? (isMobileMenuOpen ? 0 : '-100%') : 0
    }}>
      {/* Logo + Collapse toggle */}
      <div style={{ padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', minHeight: '68px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}cleanmax logo (1).png`} alt="CleanMax" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
        {!isCollapsed && (
          <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.04em', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            ProCure<span className="text-gradient">360</span>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              marginLeft: 'auto', flexShrink: 0,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.18s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-color)'; e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: '0.75rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', overflowX: 'hidden' }}>
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
              title={isCollapsed ? tab.label : ''}
              className={`animate-stagger delay-${(idx % 4) + 1}`}
              style={{
                display: 'flex', alignItems: 'center',
                gap: isCollapsed ? '0' : '0.75rem',
                padding: isCollapsed ? '0.8rem' : '0.75rem 0.9rem',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                background: isActive ? 'var(--bg-primary)' : 'transparent',
                border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.18s',
                fontWeight: isActive ? 600 : 500,
                boxShadow: isActive ? 'var(--shadow-float)' : 'none',
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={20} style={{ color: isActive ? 'var(--accent-color)' : 'inherit', flexShrink: 0 }} strokeWidth={isActive ? 2.5 : 2} />
              {!isCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.875rem' }}>{tab.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export const Layout = ({ children, currentTab, setCurrentTab, onLogout, userRole }) => {
  // Auto-collapse on small laptop screens (≤1280px); fully collapse on mobile (≤768px)
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth <= 1280);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { state, dispatch } = useProcure();
  const initials = state.currentUser ? state.currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AD';

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w <= 768);
      // Auto-collapse sidebar on small laptops, expand on wide screens
      if (w <= 1280 && w > 768) setIsCollapsed(true);
      if (w > 1280) setIsCollapsed(false);
    };
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

  const currentUserId = state.currentUser?.id || state.currentUser?.email || state.currentUser?.name || 'default_user';
  const activeUserRole = String(state.currentUser?.role || userRole || 'admin').trim().toLowerCase();

  const userNotifications = (state.notifications || [])
    .filter(n => {
      if (!n || !n.id) return false;
      if (!n.targetRoles || n.targetRoles.length === 0) return true;
      // Admin sees all system notifications; other roles see target-matched notifications
      if (activeUserRole === 'admin') return true;
      return n.targetRoles.some(r => {
        const target = String(r).trim().toLowerCase();
        return target === activeUserRole || activeUserRole.includes(target);
      });
    })
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .map(n => {
      const readList = (n.readBy || []).map(r => String(r).toLowerCase());
      const isRead = readList.includes(String(currentUserId).toLowerCase()) ||
                     readList.includes(activeUserRole) ||
                     readList.includes(String(userRole).toLowerCase());
      return {
        ...n,
        isUnread: !isRead
      };
    });

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
        setIsCollapsed={setIsCollapsed}
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
                  onMarkRead={(id) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { notificationId: id, userId: currentUserId, role: activeUserRole } })}
                  onMarkAllRead={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ', payload: { role: activeUserRole, userId: currentUserId } })}
                  onDeleteNotification={(id) => dispatch({ type: 'DELETE_NOTIFICATION', payload: { notificationId: id } })}
                  onClearAll={() => dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS', payload: { role: activeUserRole } })}
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

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: isMobile ? '0.75rem' : '1.25rem 1.5rem 2rem 1.5rem', width: '100%', boxSizing: 'border-box', minWidth: 0 }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
            {children}
          </div>
        </main>
      </div>
      {showProfile && state.currentUser && <ProfileModal user={state.currentUser} onClose={() => setShowProfile(false)} />}
    </div>
  );
};
