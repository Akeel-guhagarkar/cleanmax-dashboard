import React, { useState, useMemo } from 'react';
import { useProcure } from '../context/ProcureContext';
import { Search, Plus, Trash2, X, Shield, Copy, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const generatePassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const EmployeeRegistrationForm = ({ onClose }) => {
  const { dispatch, showToast } = useProcure();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'employee',
  });
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCopy = () => {
    if (!generatedCredentials) return;
    const text = `Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (generatedCredentials) {
      onClose();
      return;
    }

    const email = formData.email || `${formData.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@cleanmax.energy`;
    const password = formData.password || generatePassword();
    
    const newUser = {
      id: uuidv4(),
      name: formData.name,
      phone: formData.phone,
      email,
      password,
      role: formData.role,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_USER', payload: newUser });
    showToast('User added successfully', 'success');
    setGeneratedCredentials({ email, password });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        .employee-modal-input {
          background-color: #ffffff !important;
          color: #111827 !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
        }
        .employee-modal-input:focus {
          border-color: var(--accent-color) !important;
        }
      `}</style>
      <div className="glass-panel animate-fade-in-up" style={{ width: '90%', maxWidth: '500px', padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>{generatedCredentials ? 'User Credentials' : 'Add User'}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X size={24} />
        </button>
      </div>
      
      {!generatedCredentials ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="responsive-grid">
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Name *</label>
              <input required type="text" name="name" className="premium-input employee-modal-input" placeholder="e.g. Jane Doe" value={formData.name} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Phone *</label>
              <input required type="text" name="phone" className="premium-input employee-modal-input" placeholder="+91..." value={formData.phone} onChange={handleChange} />
            </div>
          </div>
          
          <div className="responsive-grid">
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Email Address</label>
              <input type="email" name="email" className="premium-input employee-modal-input" placeholder="Auto-generated if empty" value={formData.email} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Password</label>
              <input type="text" name="password" className="premium-input employee-modal-input" placeholder="Auto-generated if empty" value={formData.password} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Role</label>
            <select name="role" className="premium-input employee-modal-input" value={formData.role} onChange={handleChange} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }}>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-premium" style={{ flex: 1 }}>Add User</button>
          </div>
        </form>
      ) : (
        <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
            <button onClick={handleCopy} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {copied ? <Check size={20} color="var(--success-color)" /> : <Copy size={20} />}
            </button>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Corporate Email</p>
            <p style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>{generatedCredentials.email}</p>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Temporary Password</p>
            <p style={{ fontWeight: 600, fontSize: '1.125rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{generatedCredentials.password}</p>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Please copy these credentials. The password is not visible again for security reasons.</p>
          </div>

          <button onClick={onClose} className="btn-premium" style={{ width: '100%' }}>Done</button>
        </div>
      )}
      </div>
    </div>
  );
};

const Employees = () => {
  const { state, dispatch, showToast } = useProcure();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDrawer, setShowDrawer] = useState(false);
  const [regeneratedCredentials, setRegeneratedCredentials] = useState(null);

  const employees = useMemo(() => {
    let result = state.users; // Show all users

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(lowerSearch) || 
        u.email.toLowerCase().includes(lowerSearch) ||
        u.phone.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Sort by newest first
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  }, [state.users, searchTerm]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(employees.map(u => u.id)));
    else setSelectedIds(new Set());
  };

  const handleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (window.confirm('Revoke access for selected employees?')) {
      Array.from(selectedIds).forEach(id => {
        dispatch({ type: 'DELETE_USER', payload: id });
      });
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} employees removed`, 'success');
    }
  };

  const handleRegeneratePassword = (user) => {
    if (window.confirm(`Generate a new password for ${user.name}? The old password will stop working.`)) {
      const newPassword = generatePassword();
      dispatch({ 
        type: 'UPDATE_USER', 
        payload: { id: user.id, password: newPassword } 
      });
      setRegeneratedCredentials({ name: user.name, email: user.email, password: newPassword });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      <div className="animate-stagger" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>User Management</h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Manage users, roles, and access credentials.</p>
        </div>
        <button onClick={() => setShowDrawer(true)} className="btn-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="animate-stagger delay-1" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search by name, email, or phone..." 
              className="premium-input" 
              style={{ paddingLeft: '2.75rem', borderRadius: '99px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {selectedIds.size > 0 && (
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', borderRadius: '99px' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{selectedIds.size} selected</span>
              <button onClick={handleDeleteSelected} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.35rem 1rem', borderRadius: '99px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Trash2 size={16} /> Revoke Access
              </button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectedIds.size === employees.length && employees.length > 0} 
                  />
                </th>
                <th>Name</th>
                <th>Corporate Email</th>
                <th>Password</th>
                <th>Phone Number</th>
                <th>Role</th>
                <th>Date Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(u => (
                <tr key={u.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => handleSelect(u.id)} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{u.password}</td>
                  <td>{u.phone}</td>
                  <td>
                    <span className="status-pill status-active" style={{ background: 'var(--bg-app)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)' }}>
                      <Shield size={12} style={{ marginRight: 4 }} />
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </span>
                  </td>
                  <td className="text-secondary">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleRegeneratePassword(u)} className="btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap', border: '1px solid var(--border-color)' }}>
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <Shield size={48} color="var(--border-color)" />
                      <p>No employees found. Click "Add Employee" to grant access.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDrawer && (
        <EmployeeRegistrationForm onClose={() => setShowDrawer(false)} />
      )}

      {regeneratedCredentials && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in-up" style={{ width: '400px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>New Password for {regeneratedCredentials.name}</h3>
            
            <div style={{ padding: '1rem', background: 'var(--bg-app)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email</p>
              <p style={{ fontWeight: 500, marginBottom: '1rem' }}>{regeneratedCredentials.email}</p>
              
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>New Password</p>
              <p style={{ fontWeight: 600, fontSize: '1.25rem', fontFamily: 'monospace', color: 'var(--accent-color)' }}>{regeneratedCredentials.password}</p>
            </div>
            
            <div style={{ padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Please copy this immediately. For security reasons, it cannot be shown again.</p>
            </div>

            <button onClick={() => setRegeneratedCredentials(null)} className="btn-premium" style={{ width: '100%' }}>Acknowledge & Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
