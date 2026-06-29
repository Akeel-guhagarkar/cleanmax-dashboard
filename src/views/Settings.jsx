import React, { useState } from 'react';
import { useProcure } from '../context/ProcureContext';
import { User, Moon, Sun, Bell, Shield, Database, Lock, Save } from 'lucide-react';

const Settings = () => {
  const { state, dispatch, showToast } = useProcure();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: state.currentUser?.name || '',
    phone: state.currentUser?.phone || '',
    email: state.currentUser?.email || '',
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    dispatch({
      type: 'UPDATE_USER',
      payload: { id: state.currentUser.id, ...formData }
    });
    showToast('Profile updated successfully', 'success');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  if (state.currentUser?.role === 'admin') {
    tabs.push({ id: 'system', label: 'System', icon: Database });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="animate-stagger">
        <h1 style={{ fontSize: '2rem' }}>Settings</h1>
        <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Manage your account and application preferences.</p>
      </div>

      <div className="responsive-grid" style={{ gridTemplateColumns: '250px 1fr', alignItems: 'start' }}>
        {/* Navigation Sidebar */}
        <div className="glass-panel animate-stagger delay-1" style={{ padding: '1rem' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="btn-ghost"
                style={{
                  justifyContent: 'flex-start',
                  padding: '0.75rem 1rem',
                  background: activeTab === tab.id ? 'var(--bg-app)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  border: activeTab === tab.id ? '1px solid var(--border-color)' : '1px solid transparent'
                }}
              >
                <tab.icon size={18} style={{ marginRight: '0.75rem' }} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="glass-panel animate-stagger delay-2" style={{ padding: '2rem', minHeight: '400px' }}>
          
          {/* PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Profile Information</h2>
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Full Name</label>
                  <input type="text" className="premium-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Email Address</label>
                  <input type="email" disabled className="premium-input" value={formData.email} style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Email cannot be changed.</p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Phone Number</label>
                  <input type="text" className="premium-input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={{ width: '100%' }} />
                </div>
                <button type="submit" className="btn-premium" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={18} /> Save Changes
                </button>
              </form>
            </div>
          )}

          {/* APPEARANCE SETTINGS */}
          {activeTab === 'appearance' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Appearance</h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', maxWidth: '500px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Theme Mode</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Toggle between light and dark mode.</p>
                </div>
                <button onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })} className="btn-ghost" style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)' }}>
                  {state.isDarkMode ? <><Sun size={18} style={{ marginRight: '0.5rem' }} /> Light Mode</> : <><Moon size={18} style={{ marginRight: '0.5rem' }} /> Dark Mode</>}
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS SETTINGS */}
          {activeTab === 'notifications' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Notifications</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
                {['Email Alerts', 'Push Notifications', 'Weekly Summary Report'].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{item}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Receive updates for {item.toLowerCase()}.</p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked={idx !== 1} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }} onChange={() => showToast('Preference saved', 'success')} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY SETTINGS */}
          {activeTab === 'security' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Security & Access</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <Lock size={20} color="#ef4444" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444' }}>Change Password</h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Ensure your account is using a long, random password to stay secure.</p>
                  <button className="btn-ghost" style={{ border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444' }} onClick={() => showToast('Password reset link sent to email', 'info')}>
                    Send Reset Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM SETTINGS (ADMIN ONLY) */}
          {activeTab === 'system' && state.currentUser?.role === 'admin' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>System Administration</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Database Backup</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Download a complete export of all records.</p>
                  </div>
                  <button className="btn-ghost" style={{ border: '1px solid var(--border-color)' }} onClick={() => showToast('Backup started. This may take a few minutes.', 'info')}>
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
