import React, { useState, useRef } from 'react';
import { useProcure } from '../context/ProcureContext';
import { User, Moon, Sun, Bell, Shield, Database, Lock, Save, Camera, Smartphone, Globe, Key, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const Settings = () => {
  const { state, dispatch, showToast } = useProcure();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: state.currentUser?.name || '',
    phone: state.currentUser?.phone || '',
    email: state.currentUser?.email || '',
    jobTitle: state.currentUser?.jobTitle || '',
    department: state.currentUser?.department || '',
    avatarUrl: state.currentUser?.avatarUrl || '',
  });

  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showToast('Image must be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatarUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const [passwordData, setPasswordData] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });

  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    dispatch({
      type: 'UPDATE_USER',
      payload: { id: state.currentUser.id, ...formData }
    });
    showToast('Profile updated successfully', 'success');
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwordData.newPass !== passwordData.confirm) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (passwordData.current !== state.currentUser.password) {
      showToast('Current password is incorrect', 'error');
      return;
    }
    dispatch({
      type: 'UPDATE_USER',
      payload: { id: state.currentUser.id, password: passwordData.newPass }
    });
    showToast('Password updated successfully', 'success');
    setPasswordData({ current: '', newPass: '', confirm: '' });
  };

  const handle2FAToggle = () => {
    const newValue = !state.currentUser?.twoFactorEnabled;
    dispatch({
      type: 'UPDATE_USER',
      payload: { id: state.currentUser.id, twoFactorEnabled: newValue }
    });
    showToast(newValue ? '2FA Enabled' : '2FA Disabled', 'success');
  };

  const generateApiKey = () => {
    showToast('New API Key Generated: pk_live_xxxx', 'success');
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
        <div className="glass-panel animate-stagger delay-2" style={{ padding: '2rem', minHeight: '600px' }}>
          
          {/* PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Profile Information</h2>
              
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'center' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                <div style={{ 
                  width: '100px', height: '100px', borderRadius: '50%', 
                  background: 'var(--bg-app)', border: '2px dashed var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden'
                }}>
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={40} color="var(--text-secondary)" />
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.5)', padding: '0.25rem',
                    textAlign: 'center', cursor: 'pointer'
                  }} onClick={() => fileInputRef.current.click()}>
                    <Camera size={14} color="#fff" style={{ margin: '0 auto' }} />
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{state.currentUser?.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{state.currentUser?.role.toUpperCase()} USER</p>
                  <div className="status-pill status-active" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                    <CheckCircle size={12} /> Active Now
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                <div className="responsive-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Full Name</label>
                    <input type="text" className="premium-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Phone Number</label>
                    <input type="text" className="premium-input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>

                <div className="responsive-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Job Title</label>
                    <input type="text" className="premium-input" value={formData.jobTitle} onChange={(e) => setFormData({...formData, jobTitle: e.target.value})} placeholder="e.g. Senior Engineer" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Department</label>
                    <input type="text" className="premium-input" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} placeholder="e.g. Analytics" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Email Address</label>
                  <input type="email" disabled className="premium-input" value={formData.email} style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Email cannot be changed.</p>
                </div>

                <button type="submit" className="btn-premium" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <Save size={18} /> Save Profile
                </button>
              </form>
            </div>
          )}

          {/* APPEARANCE SETTINGS */}
          {activeTab === 'appearance' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Appearance</h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', maxWidth: '600px' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
                {['Email Alerts', 'Push Notifications', 'Weekly Summary Report'].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
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
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px' }}>
                
                {/* 2FA Section */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Smartphone size={18} color="var(--accent-color)" />
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Two-Factor Authentication (2FA)</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Add an extra layer of security to your account.</p>
                  </div>
                  <label className="checkbox-container" style={{ margin: 0 }}>
                    <input type="checkbox" checked={state.currentUser?.twoFactorEnabled} onChange={handle2FAToggle} />
                    <span className="checkmark" style={{ marginRight: 0 }}>
                       {state.currentUser?.twoFactorEnabled && <CheckCircle size={14} strokeWidth={3} color="#0a1128" />}
                    </span>
                  </label>
                </div>

                {/* Password Change */}
                <form onSubmit={handlePasswordChange} style={{ padding: '1.5rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Lock size={20} color="var(--text-primary)" />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Change Password</h3>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Current Password</label>
                      <input type="password" required className="premium-input" value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>New Password</label>
                      <input type="password" required className="premium-input" value={passwordData.newPass} onChange={e => setPasswordData({...passwordData, newPass: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Confirm New Password</label>
                      <input type="password" required className="premium-input" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} />
                    </div>
                    <button type="submit" className="btn-premium" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>Update Password</button>
                  </div>
                </form>

                {/* Active Devices */}
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Active Sessions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Globe size={24} color="var(--text-secondary)" />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Windows PC - Chrome</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Delhi, India • Current Session</p>
                        </div>
                      </div>
                      <div className="status-pill status-active" style={{ fontSize: '0.7rem' }}>Active</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Smartphone size={24} color="var(--text-secondary)" />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>iPhone 14 - Safari</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mumbai, India • 2 days ago</p>
                        </div>
                      </div>
                      <button className="btn-ghost" style={{ fontSize: '0.8rem', color: '#ef4444' }} onClick={() => showToast('Session revoked', 'success')}>Revoke</button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SYSTEM SETTINGS (ADMIN ONLY) */}
          {activeTab === 'system' && state.currentUser?.role === 'admin' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>System Administration</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                
                {/* Maintenance Mode */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: maintenanceMode ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-app)', borderRadius: '12px', border: maintenanceMode ? '1px solid #f59e0b' : '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={18} color={maintenanceMode ? "#f59e0b" : "var(--text-secondary)"} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Maintenance Mode</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Restrict access for non-admin users during updates.</p>
                  </div>
                  <label className="checkbox-container" style={{ margin: 0 }}>
                    <input type="checkbox" checked={maintenanceMode} onChange={() => { setMaintenanceMode(!maintenanceMode); showToast(maintenanceMode ? 'Maintenance mode disabled' : 'Maintenance mode enabled', 'info'); }} />
                    <span className="checkmark" style={{ marginRight: 0 }}>
                       {maintenanceMode && <CheckCircle size={14} strokeWidth={3} color="#0a1128" />}
                    </span>
                  </label>
                </div>

                {/* API Keys */}
                <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Key size={18} color="var(--accent-color)" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>API Access Keys</h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Manage tokens for third-party integrations.</p>
                  <button className="btn-ghost" style={{ border: '1px solid var(--border-color)' }} onClick={generateApiKey}>
                    + Generate New Key
                  </button>
                </div>

                {/* Database Backup */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Database size={18} color="var(--text-primary)" />
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Database Backup</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Download a complete export of all records.</p>
                  </div>
                  <button className="btn-premium" style={{ padding: '0.5rem 1rem' }} onClick={() => showToast('Backup started. This may take a few minutes.', 'info')}>
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
