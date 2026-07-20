import React, { useState, useMemo } from 'react';
import { useProcure } from '../context/ProcureContext';
import { Plus, Search, Trash2, Edit2, Download, X, FileText, Calendar, MapPin, Tag, Box, Hash, Briefcase } from 'lucide-react';
import { getStatusClass } from '../utils/constants';

const ProjectRegistrationForm = ({ onClose, initialData = null, isEditing = false }) => {
  const { state, dispatch, showToast } = useProcure();
  const [formData, setFormData] = useState(initialData || {
    projectName: '',
    client: '',
    type: 'Solar',
    capacity: '',
    unit: 'MWp',
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
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Planning</h3>
            <div className="responsive-grid">
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
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState(null);
  
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
                <th>Status</th>
                <th>Last Edited By</th>
                {state.currentUser?.role !== 'viewer' && (
                  <th>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} onClick={(e) => {
                  if(e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    setSelectedProjectForDetails(p);
                  }
                }} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => handleSelect(p.id)} />
                  </td>
                  <td><strong>{p.projectCode}</strong></td>
                  <td style={{ fontWeight: 600 }}>{p.projectName}</td>
                  <td>{p.client}</td>
                  <td className="text-secondary">{p.type}</td>
                  <td style={{ fontWeight: 600 }}>{p.capacity} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.unit}</span></td>
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
                    <td onClick={(e) => e.stopPropagation()}>
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
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

      {selectedProjectForDetails && (
        <ProjectDetailsModal project={selectedProjectForDetails} onClose={() => setSelectedProjectForDetails(null)} />
      )}
    </div>
  );
};

const ProjectDetailsModal = ({ project, onClose }) => {
  const { state } = useProcure();
  
  const vendorInfo = useMemo(() => {
    if (!state.vendors) return null;
    const exactMatch = state.vendors.find(v => v.vendorName === project.client && v.plantName === project.projectName);
    if (exactMatch) return exactMatch;
    return state.vendors.find(v => v.vendorName === project.client);
  }, [project, state.vendors]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '100%', borderRadius: '16px', overflow: 'hidden', padding: 0, border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
        
        <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg, rgba(239,246,255,0.7), rgba(255,255,255,0.2))' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <span className={`status-pill ${getStatusClass(project.status)}`}>{project.status}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}><Hash size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/>{project.projectCode}</span>
            </div>
            <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{project.projectName}</h2>
            <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500 }}><Box size={16} className="text-accent" /> {project.capacity} {project.unit} &nbsp;•&nbsp; <Tag size={16} className="text-accent" /> {project.type}</p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--bg-primary)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', background: 'var(--bg-primary)' }}>
          
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}><FileText size={18} className="text-accent" /> Vendor & Contract</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(0,0,0,0.03)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Vendor / Client</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{project.client}</div>
              </div>
              {vendorInfo ? (
                <>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>PO Number</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vendorInfo.poNumber || '-'}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>PR Number</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vendorInfo.prNumber || '-'}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Contract Rate</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-color)', fontSize: '1.1rem' }}>₹{vendorInfo.rate} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>/ unit</span></div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>No extended vendor/contract details found for this project in the system.</div>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}><Calendar size={18} className="text-accent" /> Timeline & Location</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(0,0,0,0.03)' }}>
              
              {vendorInfo ? (
                <>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Location</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.05rem' }}>
                      <MapPin size={16} className="text-accent" style={{ opacity: 0.8 }} /> {vendorInfo.city || vendorInfo.state ? `${vendorInfo.city || ''}${vendorInfo.city && vendorInfo.state ? ', ' : ''}${vendorInfo.state || ''}` : 'Location not specified'} 
                    </div>
                    {vendorInfo.region && <div style={{ marginTop: '0.5rem' }}><span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', fontWeight: 600, color: 'var(--text-secondary)' }}>{vendorInfo.region} Region</span></div>}
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Contract Start</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vendorInfo.contractStart ? new Date(vendorInfo.contractStart).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Contract End</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vendorInfo.contractEnd ? new Date(vendorInfo.contractEnd).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Target Completion</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{project.completionDate ? new Date(project.completionDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Projects;
