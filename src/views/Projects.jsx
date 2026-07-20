import React, { useState, useMemo } from 'react';
import { useProcure } from '../context/ProcureContext';
import { Search, Plus, Trash2, Download, Briefcase, X, Edit2 } from 'lucide-react';
import { getStatusClass } from '../utils/constants';

const ProjectRegistrationForm = ({ onClose, initialData = null, isEditing = false }) => {
  const { state, dispatch, showToast } = useProcure();
  const [formData, setFormData] = useState(initialData || {
    projectName: '',
    client: '',
    type: 'Solar',
    capacity: '',
    unit: 'MWp',
    budget: '',
    status: 'Planning',
    completionDate: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const getUpdatedHistory = () => {
      const now = new Date().toISOString();
      const currentUser = state.currentUser?.name || 'Unknown';
      const hist = formData.editedByHistory || (formData.lastEditedBy && formData.lastEditedBy !== '-' && formData.lastEditedBy !== 'Unknown' ? [{ name: formData.lastEditedBy, time: formData.lastEditedAt || now }] : []);
      
      const historyMap = new Map();
      hist.forEach(entry => {
        const name = typeof entry === 'string' ? entry : entry.name;
        const time = typeof entry === 'string' ? (formData.lastEditedAt || now) : entry.time;
        historyMap.set(name, { name, time });
      });
      historyMap.set(currentUser, { name: currentUser, time: now });
      return Array.from(historyMap.values());
    };

    if (isEditing) {
      dispatch({
        type: 'UPDATE_PROJECT',
        payload: {
          ...formData,
          capacity: Number(formData.capacity),
          budget: Number(formData.budget),
          editedByHistory: getUpdatedHistory(),
          lastEditedBy: state.currentUser?.name || 'Unknown',
          lastEditedById: state.currentUser?.id || null,
          lastEditedAt: new Date().toISOString()
        }
      });
      showToast('Project updated successfully', 'success');
    } else {
      const projectCode = formData.projectCode || `PRJ-${new Date().getFullYear()}-${String(Math.floor(1 + Math.random() * 99)).padStart(2, '0')}`;
      dispatch({
        type: 'ADD_PROJECT',
        payload: {
          ...formData,
          projectCode,
          capacity: Number(formData.capacity),
          budget: Number(formData.budget),
          editedByHistory: [{ name: state.currentUser?.name || 'Unknown', time: new Date().toISOString() }],
          lastEditedBy: state.currentUser?.name || 'Unknown',
          lastEditedById: state.currentUser?.id || null,
          lastEditedAt: new Date().toISOString()
        }
      });
      showToast('Project created successfully', 'success');
    }
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        .project-modal-input {
          background-color: #ffffff !important;
          color: #111827 !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
        }
        .project-modal-input:focus {
          border-color: var(--accent-color) !important;
        }
      `}</style>
      <div className="glass-panel animate-fade-in-up" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem' }}>{isEditing ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>General Information</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Project Name *</label>
                <input required type="text" name="projectName" className="premium-input project-modal-input" value={formData.projectName} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Name *</label>
                <input required type="text" name="client" className="premium-input project-modal-input" value={formData.client} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Technical Details</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Type</label>
                <select name="type" className="premium-input project-modal-input" value={formData.type} onChange={handleChange}>
                  <option value="Solar">Solar</option>
                  <option value="Wind">Wind</option>
                  <option value="Hybrid (Solar+Wind)">Hybrid (Solar+Wind)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Capacity *</label>
                  <input required type="number" name="capacity" className="premium-input project-modal-input" value={formData.capacity} onChange={handleChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Unit</label>
                  <select name="unit" className="premium-input project-modal-input" value={formData.unit} onChange={handleChange}>
                    <option value="MWp">MWp</option>
                    <option value="MW">MW</option>
                    <option value="KWp">KWp</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Planning & Budget</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Budget (INR) *</label>
                <input required type="number" name="budget" className="premium-input project-modal-input" value={formData.budget} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Target Completion Date *</label>
                <input required type="date" name="completionDate" className="premium-input project-modal-input" value={formData.completionDate} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Status</label>
                <select name="status" className="premium-input project-modal-input" value={formData.status} onChange={handleChange}>
                  <option value="Planning">Planning</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ padding: '0.75rem 2rem' }}>Cancel</button>
            <button type="submit" className="btn-premium" style={{ padding: '0.75rem 2rem' }}>Save Project</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Projects = () => {
  const { state, dispatch, showToast } = useProcure();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  const getEditorName = (p) => {
    if (p.lastEditedById) {
      const user = state.users?.find(u => u.id === p.lastEditedById);
      if (user && (user.role === 'admin' || user.role === 'employee')) {
        return user.name;
      }
      return 'Unknown';
    }
    return p.lastEditedBy || '-';
  };

  const projects = useMemo(() => {
    let result = [...(state.projects || [])];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.projectCode.toLowerCase().includes(lowerSearch) || 
        p.projectName.toLowerCase().includes(lowerSearch) ||
        p.client.toLowerCase().includes(lowerSearch) ||
        p.status.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Sort by newest first based on code for now
    result.sort((a, b) => b.projectCode.localeCompare(a.projectCode));
    return result;
  }, [state.projects, searchTerm]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(projects.map(p => p.id)));
    else setSelectedIds(new Set());
  };

  const handleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (window.confirm('Delete selected projects?')) {
      dispatch({ type: 'DELETE_PROJECTS', payload: Array.from(selectedIds) });
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} projects deleted`, 'success');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      <div className="animate-stagger mobile-flex-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Projects Pipeline</h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Overview of all ongoing and upcoming projects.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', width: '100%', overflowX: 'auto' }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <Download size={18} /> Export
          </button>
          {state.currentUser?.role !== 'viewer' && (
            <button onClick={() => setShowDrawer(true)} className="btn-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
              <Plus size={18} /> New Project
            </button>
          )}
        </div>
      </div>

      <div className="animate-stagger delay-1" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', minWidth: 0 }}>
        <div className="mobile-flex-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div className="mobile-responsive-width" style={{ position: 'relative', width: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="premium-input" 
              style={{ paddingLeft: '2.75rem', borderRadius: '99px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {selectedIds.size > 0 && state.currentUser?.role !== 'viewer' && (
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', borderRadius: '99px' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{selectedIds.size} selected</span>
              <button onClick={handleDeleteSelected} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.35rem 1rem', borderRadius: '99px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          )}
        </div>

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectedIds.size === projects.length && projects.length > 0} 
                  />
                </th>
                <th>Project Code</th>
                <th>Project Name</th>
                <th>Vendor Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Budget</th>
                <th>Status</th>
                <th>Last Edited By</th>
                {state.currentUser?.role !== 'viewer' && (
                  <th>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => handleSelect(p.id)} />
                  </td>
                  <td><strong>{p.projectCode}</strong></td>
                  <td style={{ fontWeight: 600 }}>{p.projectName}</td>
                  <td>{p.client}</td>
                  <td className="text-secondary">{p.type}</td>
                  <td style={{ fontWeight: 600 }}>{p.capacity} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.unit}</span></td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(p.budget)}</td>
                  <td>
                    <span className={`status-pill ${getStatusClass(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {(p.lastEditedBy || p.lastEditedById || (p.editedByHistory && p.editedByHistory.length > 0)) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {p.editedByHistory && p.editedByHistory.length > 0 ? (
                          p.editedByHistory.map((h, i) => {
                            const name = typeof h === 'string' ? h : h.name;
                            const time = typeof h === 'string' ? (p.lastEditedAt || p.createdAt) : h.time;
                            return (
                              <div key={i} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.8rem' }}>{name}</span>
                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{new Date(time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.8rem' }}>{getEditorName(p)}</span>
                            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{new Date(p.lastEditedAt || p.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
                    )}
                  </td>
                  {state.currentUser?.role !== 'viewer' && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setEditingProject(p)} className="btn-ghost" style={{ padding: '0.25rem' }} title="Edit">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <Briefcase size={48} color="var(--border-color)" />
                      <p>No projects found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDrawer && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={() => setShowDrawer(false)} />
          <ProjectRegistrationForm onClose={() => setShowDrawer(false)} />
        </>
      )}

      {editingProject && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={() => setEditingProject(null)} />
          <ProjectRegistrationForm 
            initialData={{
              ...editingProject,
              completionDate: new Date(editingProject.completionDate).toISOString().split('T')[0]
            }} 
            isEditing={true}
            onClose={() => setEditingProject(null)} 
          />
        </>
      )}
    </div>
  );
};

export default Projects;
