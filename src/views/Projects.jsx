import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useProcure } from '../context/ProcureContext';
import { Plus, Search, Trash2, Edit2, X, FileText, Calendar, MapPin, Tag, Box, Hash, Briefcase, Building2, Zap, Clock, User, ChevronRight, TrendingUp, Shield, Info, Download, RotateCw } from 'lucide-react';
import { getStatusClass, safeFormatDate, safeFormatDateTime, safeFormatNumber } from '../utils/constants';
import { sendNotification, notifyDeletion, notifyNewProject, notifyRenewal } from '../utils/notify';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ExcelJS from 'exceljs';

const statusColors = {
  'Active':        '#10b981',
  'Expiring Soon': '#f59e0b',
  'Expired':       '#ef4444',
  'In Progress':   '#10b981',
  'Completed':     '#3b82f6',
  'Planning':      '#f59e0b',
};

/* ─────────────────── Registration / Edit Form ─────────────────── */
const ProjectRegistrationForm = ({ onClose, initialData = null, isEditing = false, initialRenewState = false }) => {
  const { state, dispatch, showToast } = useProcure();
  const [isRenewed, setIsRenewed] = useState(initialRenewState);
  const [formData, setFormData] = useState(initialData || {
    projectCode: '',
    vendorCode: '',
    client: '',
    cmesEntity: 'CMES',
    contactPerson: '',
    email: '',
    region: 'South',
    state: '',
    city: '',
    projectName: '',
    capacity: '',
    unit: 'kWp',
    poNumber: '',
    startDate: new Date().toISOString().split('T')[0],
    completionDate: new Date(Date.now() + 31536000000).toISOString().split('T')[0],
    rate: '',
    status: 'In Progress'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const currentUser = state.currentUser?.name || 'Unknown';
    const hist = formData.editedByHistory || (formData.lastEditedBy && formData.lastEditedBy !== '-' ? [{ name: formData.lastEditedBy, time: formData.lastEditedAt || now }] : []);
    const historyMap = new Map();
    hist.forEach(entry => {
      const name = typeof entry === 'string' ? entry : entry.name;
      const time = typeof entry === 'string' ? (formData.lastEditedAt || now) : entry.time;
      historyMap.set(name, { name, time });
    });
    historyMap.set(currentUser, { name: currentUser, time: now });
    const editedByHistory = Array.from(historyMap.values());

    const payloadData = {
      ...formData,
      capacity: Number(formData.capacity) || 0,
      rate: Number(formData.rate) || 0,
      editedByHistory,
      lastEditedBy: currentUser,
      lastEditedById: state.currentUser?.id || null,
      lastEditedAt: now
    };

    if (isEditing) {
      if (isRenewed) {
        payloadData.status = 'Active';
        const autoSnapshot = {
          id: `renew-prj-${uuidv4()}`,
          vendorId: initialData?.id || formData.id || `prj-${Date.now()}`,
          vendorCode: formData.vendorCode || formData.projectCode || 'PRJ',
          vendorName: formData.client || formData.vendorName || 'CleanMax Client',
          oldVendorName: initialData?.client || formData.client,
          newVendorName: formData.client,
          plantName: formData.projectName,
          region: formData.region || 'South',
          state: formData.state || '—',
          city: formData.city || '—',
          oldPoNumber: initialData?.poNumber || formData.poNumber || '—',
          newPoNumber: formData.poNumber,
          oldRate: Number(initialData?.rate) || Number(formData.rate) || 0,
          newRate: Number(formData.rate) || 0,
          oldContractStart: initialData?.startDate || formData.startDate,
          oldContractEnd: initialData?.completionDate || formData.completionDate,
          newContractStart: formData.startDate,
          newContractEnd: formData.completionDate,
          plantCapacity: formData.capacity,
          capacityUnit: formData.unit,
          renewalStatus: 'Renewed',
          renewedAt: now,
          renewedBy: currentUser,
          renewedByRole: state.currentUser?.role || 'Admin',
          isProjectRenewal: true
        };

        setDoc(doc(db, 'archivedContracts', autoSnapshot.id), autoSnapshot).catch(() => {});
        dispatch({ type: 'ADD_ARCHIVED_CONTRACT', payload: autoSnapshot });
        try {
          notifyRenewal(dispatch, {
            vendorName: formData.client || formData.projectName,
            plantName: formData.projectName,
            newEndDate: formData.completionDate,
            actorName: currentUser
          });
        } catch (e) {}
      }

      dispatch({ type: 'UPDATE_PROJECT', payload: payloadData });
      sendNotification(dispatch, {
        title: isRenewed ? '🔄 Project Contract Renewed' : '✏️ Project Updated',
        message: isRenewed 
          ? `Project "${formData.projectName}" contract was renewed & snapshot added to Renewals` 
          : `Project "${formData.projectName}" was edited`,
        type: isRenewed ? 'success' : 'info',
        targetRoles: ['admin'],
        actor: currentUser,
        actorRole: state.currentUser?.role,
      });
      showToast(isRenewed ? 'Project contract renewed & snapshot saved to Renewals!' : 'Project updated successfully', 'success');
    } else {
      const projectCode = formData.projectCode || `PRJ-${new Date().getFullYear()}-${String(Math.floor(1 + Math.random() * 99)).padStart(2, '0')}`;
      dispatch({ type: 'ADD_PROJECT', payload: { ...payloadData, projectCode } });
      sendNotification(dispatch, {
        title: '✅ New Project Created',
        message: `Project "${formData.projectName}" (${formData.capacity} ${formData.unit}) was added`,
        type: 'success',
        targetRoles: ['admin'],
        actor: currentUser,
        actorRole: state.currentUser?.role,
      });
      showToast('Project created successfully', 'success');
    }
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`.project-modal-input { background-color: #ffffff !important; color: #111827 !important; border-color: rgba(0,0,0,0.1) !important; } .project-modal-input:focus { border-color: var(--accent-color) !important; }`}</style>
      <div className="glass-panel animate-fade-in-up" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem' }}>{isEditing ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Vendor Details */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Vendor Details</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Code *</label>
                <input required type="text" name="vendorCode" placeholder="e.g. 100512" className="premium-input project-modal-input" value={formData.vendorCode || ''} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Name *</label>
                <input required type="text" name="client" placeholder="e.g. FEATUR GREEN ENERGY SOLUTIONS" className="premium-input project-modal-input" value={formData.client || ''} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>CMES Entity *</label>
                <select name="cmesEntity" className="premium-input project-modal-input" value={formData.cmesEntity || 'CMES'} onChange={handleChange}>
                  {['CMES', 'COGEN', 'JUPITER', 'POWER 1'].map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Contact Person <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span></label>
                <input type="text" name="contactPerson" placeholder="e.g. Rahul Sharma" className="premium-input project-modal-input" value={formData.contactPerson || ''} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Email <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span></label>
                <input type="email" name="email" placeholder="e.g. contact@vendor.com" className="premium-input project-modal-input" value={formData.email || ''} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Section 2: Project Location */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Project Location</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Region</label>
                <select name="region" className="premium-input project-modal-input" value={formData.region || 'South'} onChange={handleChange}>
                  {['North', 'South', 'East', 'West'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>State</label>
                <input type="text" name="state" className="premium-input project-modal-input" placeholder="e.g. Karnataka" value={formData.state || ''} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>City</label>
                <input type="text" name="city" className="premium-input project-modal-input" placeholder="e.g. Bangalore" value={formData.city || formData.location || ''} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Section 3: Plant Details */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Plant Details</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Plant Name *</label>
                <input required type="text" name="projectName" placeholder="e.g. TATA AUTOCOMP - 149.27kWp" className="premium-input project-modal-input" value={formData.projectName || ''} onChange={handleChange} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Capacity *</label>
                  <input required type="number" name="capacity" className="premium-input project-modal-input" value={formData.capacity || ''} onChange={handleChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Unit</label>
                  <select name="unit" className="premium-input project-modal-input" value={formData.unit || 'kWp'} onChange={handleChange}>
                    <option value="kWp">kWp</option>
                    <option value="MWp">MWp</option>
                    <option value="MW">MW</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Contract & Commercials */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Contract & Commercials</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>PO Number *</label>
                <input required type="text" name="poNumber" placeholder="e.g. 4600000572" className="premium-input project-modal-input" value={formData.poNumber || ''} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Contract Start *</label>
                <input required type="date" name="startDate" className="premium-input project-modal-input" value={formData.startDate || ''} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Contract End / Target Date *</label>
                <input required type="date" name="completionDate" className="premium-input project-modal-input" value={formData.completionDate || ''} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Rate (₹/unit) *</label>
                <input required type="number" step="0.01" name="rate" placeholder="e.g. 4075" className="premium-input project-modal-input" value={formData.rate || ''} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Status</label>
                <select name="status" className="premium-input project-modal-input" value={formData.status || 'In Progress'} onChange={handleChange}>
                  <option value="Planning">Planning</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Active">Active</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Contract Renewal Toggle */}
          <div style={{
            background: isRenewed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.04)',
            border: `1.5px solid ${isRenewed ? '#10b981' : 'rgba(59, 130, 246, 0.2)'}`,
            padding: '1.25rem 1.5rem',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            transition: 'all 0.3s ease'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCw size={16} color={isRenewed ? '#10b981' : 'var(--accent-color)'} /> Mark as Contract Renewal
              </div>
              <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Toggle <strong>ON</strong> to create a historical contract snapshot in the <strong>Renewals</strong> tab and archive previous contract terms.
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.6rem', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={isRenewed} 
                onChange={(e) => setIsRenewed(e.target.checked)} 
                style={{ width: 20, height: 20, accentColor: '#10b981', cursor: 'pointer' }} 
              />
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: isRenewed ? '#10b981' : 'var(--text-secondary)' }}>
                {isRenewed ? 'YES (Renewed)' : 'NO'}
              </span>
            </label>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ padding: '0.75rem 2rem' }}>Cancel</button>
            <button type="submit" className="btn-premium" style={{ padding: '0.75rem 2rem' }}>
              {isRenewed ? 'Save & Archive Renewal' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────────── Premium Project Portfolio Modal ─────────────────── */
const ProjectPortfolioModal = ({ project, onClose, onEdit }) => {
  const { state } = useProcure();

  const vendorInfo = useMemo(() => {
    if (!state.vendors || !project) return null;
    const projectVCode = String(project.vendorCode || '').trim().toLowerCase();
    const projectVName = String(project.client || '').trim().toLowerCase();

    if (projectVCode) {
      const codeMatch = (state.vendors || []).find(v => v && v.vendorCode && String(v.vendorCode).trim().toLowerCase() === projectVCode);
      if (codeMatch) return codeMatch;
    }
    const exactMatch = (state.vendors || []).find(v => v && String(v.vendorName).trim().toLowerCase() === projectVName && v.plantName === project.projectName);
    if (exactMatch) return exactMatch;
    return (state.vendors || []).find(v => v && String(v.vendorName).trim().toLowerCase() === projectVName) || null;
  }, [project, state.vendors]);

  const modalStatusColors = {
    'In Progress': { bg: 'rgba(16,185,129,0.12)', color: '#10b981', dot: '#10b981' },
    'Completed':   { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', dot: '#3b82f6' },
    'Planning':    { bg: 'rgba(251,191,36,0.15)',   color: '#f59e0b', dot: '#f59e0b' },
  };
  const sc = modalStatusColors[project?.status] || modalStatusColors['Planning'];

  const contractDaysLeft = useMemo(() => {
    if (!vendorInfo?.contractEnd) return null;
    const d = new Date(vendorInfo.contractEnd);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  }, [vendorInfo?.contractEnd]);

  const formatDuration = (days) => {
    const absDays = Math.abs(days);
    if (isNaN(absDays)) return '0d';
    const months = Math.floor(absDays / 30);
    const remDays = absDays % 30;
    if (months === 0) return `${absDays}d`;
    if (remDays === 0) return `${months}m`;
    return `${months}m ${remDays}d`;
  };

  const InfoRow = ({ label, value, accent }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '0.97rem', fontWeight: 700, color: accent || 'var(--text-primary)' }}>{value || '—'}</span>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-fade-in-up"
        style={{ width: '100%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(229,231,235,0.8)', boxShadow: '0 32px 80px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Hero Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0e4d3e 100%)',
          padding: '2.5rem 2.5rem 2rem',
          position: 'relative',
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden'
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(16,185,129,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '30%', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(59,130,246,0.07)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', opacity: 0.65 }}>
                <Briefcase size={13} color="#fff" />
                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 500 }}>Projects</span>
                <ChevronRight size={12} color="#fff" />
                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 500 }}>{project.projectName}</span>
              </div>

              {/* Title */}
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '0.75rem' }}>
                {project.projectName}
              </h2>

              {/* Tags row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.dot}40`, padding: '0.3rem 0.9rem', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                  {project.status || 'Planning'}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', padding: '0.3rem 0.9rem', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Zap size={12} /> {project.capacity} {project.unit}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Hash size={11} /> {project.projectCode}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem', flexShrink: 0 }}>
              {onEdit && (
                <>
                  <button
                    onClick={() => { onClose(); onEdit(project, true); }}
                    style={{ background: 'rgba(16, 185, 129, 0.25)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '10px', padding: '0.6rem 0.85rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, backdropFilter: 'blur(8px)' }}
                    title="Renew this project contract and archive snapshot to Renewals tab"
                  >
                    <RotateCw size={14} /> Renew Contract
                  </button>
                  <button
                    onClick={() => { onClose(); onEdit(project, false); }}
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '0.6rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, backdropFilter: 'blur(8px)' }}
                  >
                    <Edit2 size={15} /> Edit
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.6rem', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* ── Vendor / Contract Info ── */}
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <Building2 size={15} /> Vendor & Contract
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(229,231,235,0.8)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Vendor / Client</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{project.client || '—'}</span>
              </div>
              {vendorInfo?.cmesEntity && (
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(229,231,235,0.8)' }}>
                  <InfoRow label="CMES Entity" value={vendorInfo.cmesEntity} accent="#7eb855" />
                </div>
              )}
              {vendorInfo?.poNumber && (
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(229,231,235,0.8)' }}>
                  <InfoRow label="PO Number" value={vendorInfo.poNumber} />
                </div>
              )}
              {vendorInfo?.rate !== undefined && vendorInfo?.rate !== null && (
                <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <InfoRow label="Contract Rate" value={`₹${safeFormatNumber(vendorInfo.rate)} / unit`} accent="#10b981" />
                </div>
              )}
              {vendorInfo?.vendorCode && (
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(229,231,235,0.8)' }}>
                  <InfoRow label="Vendor Code" value={vendorInfo.vendorCode} />
                </div>
              )}
            </div>
            {!vendorInfo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.1rem', background: 'rgba(251,191,36,0.07)', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.2)', marginTop: '0.5rem' }}>
                <Info size={15} color="#f59e0b" />
                <span style={{ fontSize: '0.83rem', color: '#f59e0b', fontWeight: 500 }}>No linked vendor record found in the system for this project.</span>
              </div>
            )}
          </section>

          {/* ── Location & Timeline ── */}
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <Calendar size={15} /> Timeline & Location
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem' }}>
              {vendorInfo?.contractStart && (
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(229,231,235,0.8)' }}>
                  <InfoRow label="Contract Start" value={safeFormatDate(vendorInfo.contractStart, { day: 'numeric', month: 'short', year: 'numeric' })} />
                </div>
              )}
              {vendorInfo?.contractEnd && (
                <div style={{
                  background: contractDaysLeft !== null && contractDaysLeft < 90 ? 'rgba(239,68,68,0.06)' : '#f8fafc',
                  borderRadius: '14px', padding: '1.1rem 1.25rem',
                  border: contractDaysLeft !== null && contractDaysLeft < 90 ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(229,231,235,0.8)'
                }}>
                  <InfoRow
                    label="Contract End"
                    value={safeFormatDate(vendorInfo.contractEnd, { day: 'numeric', month: 'short', year: 'numeric' })}
                    accent={contractDaysLeft !== null && contractDaysLeft < 90 ? '#ef4444' : undefined}
                  />
                  {contractDaysLeft !== null && (
                    <span style={{ fontSize: '0.72rem', marginTop: '0.3rem', display: 'block', fontWeight: 600, color: contractDaysLeft < 0 ? '#ef4444' : contractDaysLeft < 90 ? '#f59e0b' : '#10b981' }}>
                      {contractDaysLeft < 0
                        ? `Expired ${formatDuration(contractDaysLeft)} ago`
                        : `${formatDuration(contractDaysLeft)} remaining`}
                    </span>
                  )}
                </div>
              )}
              {!vendorInfo?.contractStart && !vendorInfo?.contractEnd && project.completionDate && (
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(229,231,235,0.8)' }}>
                  <InfoRow label="Target Completion" value={safeFormatDate(project.completionDate, { day: 'numeric', month: 'short', year: 'numeric' })} />
                </div>
              )}
              {(vendorInfo?.city || vendorInfo?.state) && (
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(229,231,235,0.8)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Location</span>
                  <span style={{ fontSize: '0.97rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={14} color="var(--accent-color)" />
                    {[vendorInfo.city, vendorInfo.state].filter(Boolean).join(', ')}
                  </span>
                  {vendorInfo.region && (
                    <span style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(0,0,0,0.05)', padding: '0.15rem 0.6rem', borderRadius: '99px', color: 'var(--text-secondary)' }}>
                      {vendorInfo.region} Region
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Technical Specs ── */}
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <Zap size={15} /> Technical Specs
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.09), rgba(59,130,246,0.03))', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(59,130,246,0.2)' }}>
                <InfoRow label="Plant Capacity" value={`${project.capacity} ${project.unit}`} accent="#3b82f6" />
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem 1.25rem', border: '1px solid rgba(229,231,235,0.8)' }}>
                <InfoRow label="Project Code" value={project.projectCode} />
              </div>
            </div>
          </section>

          {/* ── Edit History ── */}
          {((project.editedByHistory && project.editedByHistory.length > 0) || project.lastEditedBy) && (
            <section>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <Clock size={15} /> Edit History
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                {(project.editedByHistory && project.editedByHistory.length > 0 ? project.editedByHistory : [{ name: project.lastEditedBy, time: project.lastEditedAt }])
                  .filter(Boolean)
                  .map((h, i) => {
                    const name = typeof h === 'string' ? h : (h?.name || 'Unknown');
                    const time = typeof h === 'string' ? project.lastEditedAt : h?.time;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', borderRadius: '10px', padding: '0.5rem 0.85rem', border: '1px solid rgba(229,231,235,0.8)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{name}</div>
                          {time && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{safeFormatDateTime(time, { dateStyle: 'medium', timeStyle: 'short' })}</div>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────── Main Projects View ─────────────────── */
const Projects = ({ initialFilter = '', autoOpenProject = null, onClearAutoOpen }) => {
  const { state, dispatch, showToast } = useProcure();
  const [searchTerm, setSearchTerm] = useState(initialFilter);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(autoOpenProject);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    if (initialFilter) {
      setSearchTerm(initialFilter);
    }
  }, [initialFilter]);

  useEffect(() => {
    if (autoOpenProject) {
      setSelectedProject(autoOpenProject);
    }
  }, [autoOpenProject]);

  const handleCloseProjectModal = () => {
    setSelectedProject(null);
    if (onClearAutoOpen) onClearAutoOpen();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const normalizeName = (str) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .replace(/pvt\.?\s*ltd\.?|private\s*limited|inc\.?|corp\.?|llp/gi, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Pre-indexed O(1) vendor maps to avoid O(N^2) scanning on every render frame
  const vendorMaps = useMemo(() => {
    const byCode = new Map();
    const byName = new Map();
    const byNormName = new Map();
    const byFirstWord = new Map();

    (state.vendors || []).forEach(v => {
      if (!v) return;
      if (v.vendorCode) {
        byCode.set(String(v.vendorCode).trim().toLowerCase(), v);
        byCode.set(String(v.vendorCode).trim(), v);
      }
      if (v.vendorName) {
        const trimmedName = String(v.vendorName).trim().toLowerCase();
        byName.set(trimmedName, v);
        const norm = normalizeName(v.vendorName);
        if (norm) byNormName.set(norm, v);

        const words = trimmedName.split(/[\s\-.,]+/).filter(w => w.length > 3);
        if (words.length > 0 && !byFirstWord.has(words[0])) {
          byFirstWord.set(words[0], v);
        }
      }
    });

    return { byCode, byName, byNormName, byFirstWord };
  }, [state.vendors]);

  const getProjectVendorCode = (p) => {
    if (p.vendorCode && p.vendorCode !== '—') return p.vendorCode;
    if (!p.client) return '—';
    
    const clientName = String(p.client).trim().toLowerCase();
    
    // 1. O(1) Exact name match
    let match = vendorMaps.byName.get(clientName);
    if (match?.vendorCode) return match.vendorCode;

    // 2. O(1) Normalized match
    const normClient = normalizeName(p.client);
    if (normClient) {
      match = vendorMaps.byNormName.get(normClient);
      if (match?.vendorCode) return match.vendorCode;
    }

    // 3. O(1) First word match
    const words = clientName.split(/[\s\-.,]+/).filter(w => w.length > 3);
    if (words.length > 0) {
      match = vendorMaps.byFirstWord.get(words[0]);
      if (match?.vendorCode) return match.vendorCode;
    }

    return '—';
  };

  const getProjectEffectiveStatus = (p) => {
    const vCode = getProjectVendorCode(p);
    let matchingVendor = null;
    if (vCode && vCode !== '—') {
      matchingVendor = vendorMaps.byCode.get(String(vCode).trim().toLowerCase()) || vendorMaps.byCode.get(String(vCode).trim());
    }
    if (!matchingVendor && p.client) {
      const pClientNorm = normalizeName(p.client);
      matchingVendor = vendorMaps.byNormName.get(pClientNorm) || vendorMaps.byName.get(String(p.client).trim().toLowerCase());
    }

    const endDate = matchingVendor?.contractEnd || p.contractEnd || p.targetDate;

    if (endDate) {
      const end = new Date(endDate);
      const now = new Date();
      if (!isNaN(end.getTime())) {
        const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffTime = endMidnight - nowMidnight;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Expired';
        if (diffDays <= 30) return 'Expiring Soon'; // Exactly 1 month (30 days) before expiry
        return 'Active';
      }
    }

    // Fallback if no date: strictly map to Active, Expiring Soon, or Expired
    const raw = String(p.status || '').toLowerCase().trim();
    if (raw.includes('expired')) return 'Expired';
    if (raw.includes('expiring')) return 'Expiring Soon';
    return 'Active';
  };

  const isProjectVendorRegistered = (p) => {
    if (!state.vendors || state.vendors.length === 0) return false;
    const vCode = getProjectVendorCode(p);
    if (vCode && vCode !== '—') {
      if (vendorMaps.byCode.has(String(vCode).trim().toLowerCase()) || vendorMaps.byCode.has(String(vCode).trim())) return true;
    }
    if (p.client) {
      const norm = normalizeName(p.client);
      if (norm && vendorMaps.byNormName.has(norm)) return true;
      if (vendorMaps.byName.has(String(p.client).trim().toLowerCase())) return true;
    }
    return false;
  };

  const projects = useMemo(() => {
    // If no vendors exist in the system, NO projects should ever be displayed!
    if (!state.vendors || state.vendors.length === 0) {
      return [];
    }

    let result = (state.projects || []).filter(p => isProjectVendorRegistered(p));

    if (deferredSearchTerm) {
      const q = deferredSearchTerm.toLowerCase();
      result = result.filter(p => {
        const effStatus = getProjectEffectiveStatus(p).toLowerCase();
        return (
          (p.projectCode || '').toLowerCase().includes(q) ||
          (p.projectName || '').toLowerCase().includes(q) ||
          (p.client || '').toLowerCase().includes(q) ||
          effStatus.includes(q)
        );
      });
    }
    result.sort((a, b) => (b.projectCode || '').localeCompare(a.projectCode || ''));
    return result;
  }, [state.projects, state.vendors, deferredSearchTerm, vendorMaps]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return projects.slice(start, start + pageSize);
  }, [projects, currentPage, pageSize]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(paginatedProjects.map(p => p.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectAllPages = () => {
    setSelectedIds(new Set(projects.map(p => p.id)));
  };

  const handleSelect = (id) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Move ${selectedIds.size} project(s) to Recycle Bin?`)) {
      const names = projects.filter(p => selectedIds.has(p.id)).map(p => p.projectName);
      dispatch({
        type: 'SOFT_DELETE_PROJECTS',
        payload: Array.from(selectedIds),
        meta: { deletedBy: state.currentUser?.name, deletedByRole: state.currentUser?.role }
      });
      notifyDeletion(dispatch, {
        itemType: 'Projects',
        itemName: `${selectedIds.size} project(s): ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2} more` : ''}`,
        actorName: state.currentUser?.name || 'Unknown User',
      });
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} projects moved to Recycle Bin`, 'success');
    }
  };

  const handleExportProjects = async () => {
    setIsExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CleanMax Analytics';
      wb.created = new Date();

      const ws = wb.addWorksheet('Projects Pipeline');

      ws.mergeCells('A1:N2');
      const titleRow = ws.getRow(1);
      titleRow.height = 36;
      titleRow.getCell(1).value = 'CLEANMAX — PROJECTS PIPELINE REPORT';
      titleRow.getCell(1).font  = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
      titleRow.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Generated-on sub-row
      ws.mergeCells('A3:N3');
      const subRow = ws.getRow(3);
      subRow.getCell(1).value = `Generated on: ${new Date().toLocaleString('en-IN')}`;
      subRow.getCell(1).font  = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
      subRow.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      subRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      subRow.height = 18;

      ws.addRow([]); // spacer

      // Header row
      const headers = [
        'Project Code', 'Vendor Code', 'Vendor Name', 'Entity', 'Plant Name',
        'Capacity', 'Region', 'State', 'City',
        'Rate (₹)', 'PO No', 'Starting Date', 'Ending Date', 'Status'
      ];
      const hdrRow = ws.addRow(headers);
      hdrRow.height = 24;
      hdrRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });

      // Column widths
      ws.columns = [18, 16, 28, 16, 26, 16, 14, 16, 16, 12, 16, 16, 16, 14].map(w => ({ width: w }));

      // Freeze header
      ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 5, showGridLines: true }];

      const tableBorder = {
        top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };

      // Add data rows - export ONLY active displayed projects matching registered vendors
      const exportProjects = [...projects];
      exportProjects.sort((a, b) => (b.projectCode || '').localeCompare(a.projectCode || ''));

      exportProjects.forEach((p, idx) => {
        const effStatus = getProjectEffectiveStatus(p);
        const matchedVendor = (state.vendors || []).find(v => 
          (v.vendorCode && p.vendorCode && String(v.vendorCode).trim().toLowerCase() === String(p.vendorCode).trim().toLowerCase()) ||
          (v.plantName && p.projectName && String(v.plantName).toLowerCase().trim() === String(p.projectName).toLowerCase().trim()) ||
          (v.vendorName && p.client && String(v.vendorName).toLowerCase().trim() === String(p.client).toLowerCase().trim())
        );

        let rowBg = idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        let rowText = 'FF0F172A';

        if (effStatus === 'Expired') {
          rowBg   = 'FFFECDD3'; // Light red
          rowText = 'FF991B1B';
        } else if (effStatus === 'Expiring Soon') {
          rowBg   = 'FFFED7AA'; // Light orange
          rowText = 'FF7C2D12';
        }

        const row = ws.addRow([
          p.projectCode || `PRJ-${String(idx+1).padStart(4, '0')}`,
          matchedVendor?.vendorCode || p.vendorCode || '—',
          matchedVendor?.vendorName || p.client || '—',
          matchedVendor?.cmesEntity || 'CMES',
          p.projectName || matchedVendor?.plantName || '—',
          p.capacity ? `${p.capacity} ${p.unit || 'kWp'}` : matchedVendor?.plantCapacity ? `${matchedVendor.plantCapacity} ${matchedVendor.capacityUnit || 'kWp'}` : '—',
          matchedVendor?.region || p.location || '—',
          matchedVendor?.state || '—',
          matchedVendor?.city || '—',
          Number((Number(matchedVendor?.rate || 0)).toFixed(2)),
          safeFormatDate(p.startDate || p.completionDate || matchedVendor?.contractStart),
          safeFormatDate(matchedVendor?.contractEnd || p.contractEnd),
          effStatus
        ]);
        row.height = 22;

        row.eachCell({ includeEmpty: true }, (cell, colNo) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          cell.font = { name: 'Arial', size: 9, color: { argb: rowText } };
          cell.border = tableBorder;
          cell.alignment = { vertical: 'middle', horizontal: [1,2,4,6,7,8,9,10,11,12,13,14].includes(colNo) ? 'center' : 'left' };
        });

        // Bold status cell
        const statusCell = row.getCell(14);
        if (effStatus === 'Expired') {
          statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
        } else if (effStatus === 'Expiring Soon') {
          statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFC2410C' } };
        } else {
          statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } };
        }
      });

      const buf  = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `CleanMax_Projects_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Projects exported successfully!', 'success');
    } catch (err) {
      console.error('Projects export error:', err);
      showToast('❌ Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>

      {/* ── Page Header ── */}
      <div className="animate-stagger mobile-flex-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Projects Pipeline</h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Click any project to view its full portfolio details.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Export button — premium green style */}
          {state.currentUser?.role !== 'viewer' && (
            <button
              onClick={handleExportProjects}
              disabled={isExporting}
              className="btn-premium"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', whiteSpace: 'nowrap', opacity: isExporting ? 0.7 : 1 }}
            >
              {isExporting
                ? <React.Fragment><span style={{ display:'inline-block',width:14,height:14,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/> Exporting...</React.Fragment>
                : <React.Fragment><Download size={18} /> Export Excel</React.Fragment>
              }
            </button>
          )}
          {state.currentUser?.role !== 'viewer' && (
            <button
              onClick={() => setShowDrawer(true)}
              className="btn-premium"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}
            >
              <Plus size={18} /> New Project
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
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
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {selectedIds.size > 0 && state.currentUser?.role !== 'viewer' && (
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', borderRadius: '99px' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{selectedIds.size} selected</span>
              <button onClick={handleDeleteSelected} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '0.35rem 1rem', borderRadius: '99px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Trash2 size={16} /> Delete Selected
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Select-all-pages banner */}
        {selectedIds.size > 0 && selectedIds.size < projects.length && selectedIds.size === paginatedProjects.length && (
          <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              All <strong style={{ color: 'var(--text-primary)' }}>{paginatedProjects.length}</strong> projects on this page are selected.
            </span>
            <button
              onClick={handleSelectAllPages}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontWeight: 700, fontSize: '0.875rem', padding: 0 }}
            >
              Select all {projects.length} projects across all pages
            </button>
          </div>
        )}
        {selectedIds.size === projects.length && projects.length > paginatedProjects.length && (
          <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              ✅ All {projects.length} projects selected across all pages.
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: '0.875rem', padding: 0 }}
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && paginatedProjects.every(p => selectedIds.has(p.id))} />
                </th>
                <th>Project Code</th>
                <th>Project Name</th>
                <th>Vendor Code</th>
                <th>Vendor Name</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Last Edited By</th>
                {state.currentUser?.role !== 'viewer' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedProjects.map(p => (
                <tr
                  key={p.id}
                  onClick={e => {
                    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                      setSelectedProject(p);
                    }
                  }}
                  style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(16,185,129,0.04)';
                    const name = e.currentTarget.querySelector('.project-name-cell');
                    if (name) name.style.color = 'var(--accent-color)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    const name = e.currentTarget.querySelector('.project-name-cell');
                    if (name) name.style.color = 'var(--text-primary)';
                  }}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => handleSelect(p.id)} />
                  </td>
                  <td><strong style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{p.projectCode}</strong></td>
                  <td>
                    <span className="project-name-cell" style={{ fontWeight: 700, color: 'var(--text-primary)', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {p.projectName}
                      <ChevronRight size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
                    </span>
                  </td>
                  <td><strong style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{getProjectVendorCode(p)}</strong></td>
                  <td>{p.client}</td>
                  <td style={{ fontWeight: 600 }}>
                    {p.capacity} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.unit}</span>
                  </td>
                  <td>
                    {(() => {
                      const effStatus = getProjectEffectiveStatus(p);
                      const color = statusColors[effStatus] || '#10b981';
                      return (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          background: `${color}18`,
                          color: color,
                          border: `1px solid ${color}40`,
                          padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                          {effStatus}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    {p.editedByHistory && p.editedByHistory.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '100px', overflowY: 'auto' }}>
                        {p.editedByHistory.map((h, i) => {
                          const name = typeof h === 'string' ? h : h.name;
                          const role = typeof h === 'object' && h.role ? h.role : 'Admin';
                          const timeStr = typeof h === 'object' && h?.editedAt ? safeFormatDateTime(h.editedAt, { dateStyle: 'short', timeStyle: 'short' }) : null;
                          return (
                            <div key={i} style={{ background: 'var(--bg-secondary)', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)', fontSize: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                                <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.3rem', borderRadius: '4px', background: role.toLowerCase() === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)', color: role.toLowerCase() === 'admin' ? '#3b82f6' : '#10b981', fontWeight: 700 }}>{role}</span>
                              </div>
                              {timeStr && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{timeStr}</div>}
                            </div>
                          );
                        })}
                      </div>
                    ) : p.lastEditedBy ? (
                      <div style={{ background: 'var(--bg-secondary)', padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)', display: 'inline-block' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.lastEditedBy}</div>
                        {p.lastEditedAt && <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{safeFormatDateTime(p.lastEditedAt, { dateStyle: 'short', timeStyle: 'short' })}</div>}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                  {state.currentUser?.role !== 'viewer' && (
                    <td onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditingProject(p)} className="btn-ghost" style={{ padding: '0.25rem' }} title="Edit">
                        <Edit2 size={16} />
                      </button>
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

        {/* Pagination Bar */}
        {projects.length > pageSize && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, projects.length)}</strong> of <strong>{projects.length}</strong> projects
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="btn-ghost"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem' }}>
                Page {currentPage} of {Math.ceil(projects.length / pageSize)}
              </span>
              <button
                className="btn-ghost"
                disabled={currentPage >= Math.ceil(projects.length / pageSize)}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(projects.length / pageSize), p + 1))}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', opacity: currentPage >= Math.ceil(projects.length / pageSize) ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
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
            initialData={{ ...editingProject, completionDate: new Date(editingProject.completionDate || Date.now()).toISOString().split('T')[0] }}
            isEditing={true}
            initialRenewState={Boolean(editingProject._forceRenewState)}
            onClose={() => setEditingProject(null)}
          />
        </>
      )}

      {selectedProject && (
        <ProjectPortfolioModal
          project={selectedProject}
          onClose={handleCloseProjectModal}
          onEdit={state.currentUser?.role !== 'viewer' ? (p, forceRenew = false) => { setEditingProject(forceRenew ? { ...p, _forceRenewState: true } : p); } : null}
        />
      )}
    </div>
  );
};

export default Projects;
