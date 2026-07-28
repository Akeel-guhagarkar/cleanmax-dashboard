import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProcure } from '../context/ProcureContext';
import { Search, Plus, Download, Trash2, X, GitCompare, Mail, Phone, FileText, User, Building, Edit2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import ExcelJS from 'exceljs';
import { sendNotification, notifyDeletion, notifyNewVendor } from '../utils/notify';
import html2canvas from 'html2canvas';
import { IndiaMap } from './RegionMap';
import { REGION_CENTERS, normalizeStatus, getStatusClass, getCapacityInMW, safeFormatDate, safeFormatDateTime, safeFormatNumber } from '../utils/constants';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ComparisonModal = ({ selectedVendors, onClose }) => {
  if (!selectedVendors || selectedVendors.length < 2) return null;
  
  const properties = [
    { key: 'vendorCode', label: 'Vendor Code' },
    { key: 'vendorName', label: 'Name' },
    { key: 'plantName', label: 'Plant' },
    { key: 'plantCapacity', label: 'Capacity', render: (v) => `${v?.plantCapacity || 0} ${v?.capacityUnit || ''}` },
    { key: 'rate', label: 'Rate (₹)', render: (v) => `₹${safeFormatNumber(v?.rate)}` },
    { key: 'region', label: 'Region' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel animate-stagger" style={{ width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem' }}>Vendor Comparison</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        
        <div className="table-container">
          <table className="premium-table" style={{ background: 'transparent' }}>
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Property</th>
                {selectedVendors.map(v => (
                  <th key={v.id} style={{ width: `${80 / selectedVendors.length}%` }}>{v.vendorName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map(prop => (
                <tr key={prop.key}>
                  <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{prop.label}</td>
                  {selectedVendors.map(v => (
                    <td key={v.id}>
                      {prop.key === 'status' ? (
                        <span className={`status-pill ${getStatusClass(v.status)}`}>
                          {v.status}
                        </span>
                      ) : prop.render ? prop.render(v) : <span style={{ fontWeight: prop.key === 'vendorName' ? 600 : 400 }}>{v[prop.key]}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const VendorRegistrationForm = ({ onClose, initialData = null, isEditing = false }) => {
  const { state, dispatch, showToast } = useProcure();
  const [formData, setFormData] = useState(initialData || {
    vendorCode: '',
    vendorName: '',
    contactPerson: '',
    email: '',
    cmesEntity: 'CMES',
    plantName: '',
    plantCapacity: '',
    capacityUnit: 'kWp',
    rate: '',
    poNumber: '',
    region: 'North',
    state: '',
    city: '',
    contractStart: new Date().toISOString().split('T')[0],
    contractEnd: new Date(Date.now() + 31536000000).toISOString().split('T')[0] // +1 year
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
        type: 'UPDATE_VENDOR',
        payload: {
          ...formData,
          plantCapacity: Number(formData.plantCapacity),
          rate: Number(formData.rate),
          editedByHistory: getUpdatedHistory(),
          lastEditedBy: state.currentUser?.name || 'Unknown',
          lastEditedById: state.currentUser?.id || null,
          lastEditedAt: new Date().toISOString()
        }
      });
      sendNotification(dispatch, {
        title: '✏️ Vendor Updated',
        message: `"${formData.vendorName} — ${formData.plantName}" was edited`,
        type: 'info',
        targetRoles: ['admin'],
        actor: state.currentUser?.name,
        actorRole: state.currentUser?.role,
      });
      showToast('Vendor updated successfully', 'success');
    } else {
      let finalVendorCode = String(formData.vendorCode || '').trim();
      let finalVendorName = String(formData.vendorName || '').trim();

      // STRICT PRIMARY KEY MATCH: Check Vendor Code first!
      let existingVendor = state.vendors.find(v => 
        v.vendorCode && String(v.vendorCode).trim().toLowerCase() === finalVendorCode.toLowerCase()
      );
      if (!existingVendor) {
        existingVendor = state.vendors.find(v => 
          v.vendorName && v.vendorName.toLowerCase().trim() === finalVendorName.toLowerCase()
        );
      }
      if (existingVendor) {
        finalVendorCode = existingVendor.vendorCode || finalVendorCode;
        finalVendorName = existingVendor.vendorName || finalVendorName;
      }

      dispatch({
        type: 'ADD_VENDOR',
        payload: {
          ...formData,
          vendorCode: finalVendorCode,
          vendorName: finalVendorName,
          plantCapacity: Number(formData.plantCapacity),
          rate: Number(formData.rate),
          editedByHistory: [{ name: state.currentUser?.name || 'Unknown', time: new Date().toISOString() }],
          lastEditedBy: state.currentUser?.name || 'Unknown',
          lastEditedById: state.currentUser?.id || null,
          lastEditedAt: new Date().toISOString()
        }
      });
      sendNotification(dispatch, {
        title: '✅ New Vendor Added',
        message: `"${finalVendorName} — ${formData.plantName}" was registered`,
        type: 'success',
        targetRoles: ['admin'],
        actor: state.currentUser?.name,
        actorRole: state.currentUser?.role,
      });
      showToast('Vendor registered successfully', 'success');
    }
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        .vendor-modal-input {
          background-color: #ffffff !important;
          color: #111827 !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
        }
        .vendor-modal-input:focus {
          border-color: var(--accent-color) !important;
        }
      `}</style>
      <div className="glass-panel animate-fade-in-up" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem' }}>{isEditing ? 'Edit Plant Details' : 'Register Vendor'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Vendor Details</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Code *</label>
                <input required type="text" name="vendorCode" placeholder="Enter Vendor Code" className="premium-input vendor-modal-input" value={formData.vendorCode} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Name *</label>
                <input required type="text" name="vendorName" className="premium-input vendor-modal-input" value={formData.vendorName} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>CMES Entity *</label>
                <select name="cmesEntity" className="premium-input vendor-modal-input" value={formData.cmesEntity || 'CMES'} onChange={handleChange}>
                  {['CMES', 'COGEN', 'JUPITER', 'POWER 1'].map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Contact Person <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span></label>
                <input type="text" name="contactPerson" placeholder="e.g. Rahul Sharma" className="premium-input vendor-modal-input" value={formData.contactPerson || ''} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Email <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span></label>
                <input type="email" name="email" placeholder="e.g. contact@vendor.com" className="premium-input vendor-modal-input" value={formData.email || ''} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Project Location</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Region</label>
                <select name="region" className="premium-input vendor-modal-input" value={formData.region} onChange={handleChange}>
                  {['North', 'South', 'East', 'West', 'Central'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>State</label>
                <input required type="text" name="state" className="premium-input vendor-modal-input" placeholder="e.g. Maharashtra" value={formData.state} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>City</label>
                <input required type="text" name="city" className="premium-input vendor-modal-input" placeholder="e.g. Mumbai" value={formData.city} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Plant Details</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Plant Name *</label>
                <input required type="text" name="plantName" className="premium-input vendor-modal-input" value={formData.plantName} onChange={handleChange} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Capacity *</label>
                  <input required type="number" name="plantCapacity" className="premium-input vendor-modal-input" value={formData.plantCapacity} onChange={handleChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Unit</label>
                  <select name="capacityUnit" className="premium-input vendor-modal-input" value={formData.capacityUnit} onChange={handleChange}>
                  <option value="kWp">kWp</option>
                  <option value="MWp">MWp</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Contract & Commercials</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>PO Number *</label>
                <input required type="text" name="poNumber" className="premium-input vendor-modal-input" value={formData.poNumber} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Contract Start *</label>
                <input required type="date" name="contractStart" className="premium-input vendor-modal-input" value={formData.contractStart} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Contract End *</label>
                <input required type="date" name="contractEnd" className="premium-input vendor-modal-input" value={formData.contractEnd} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Rate (₹/unit) *</label>
                <input required type="number" step="0.01" name="rate" className="premium-input vendor-modal-input" value={formData.rate} onChange={handleChange} />
              </div>
              {isEditing && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Contract Status
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>(Changing to Active triggers renewal archive)</span>
                  </label>
                  <select
                    name="manualStatus"
                    className="premium-input vendor-modal-input"
                    value={formData.manualStatus || ''}
                    onChange={handleChange}
                    style={{
                      borderLeft: formData.manualStatus === 'Active' ? '3px solid #10b981' :
                                  formData.manualStatus === 'Expiring Soon' ? '3px solid #f59e0b' :
                                  formData.manualStatus === 'Expired' ? '3px solid #ef4444' : undefined
                    }}
                  >
                    <option value="">— Auto (based on dates) —</option>
                    <option value="Active">✅ Active</option>
                    <option value="Expiring Soon">⚠️ Expiring Soon</option>
                    <option value="Expired">🔴 Expired</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ padding: '0.75rem 2rem' }}>Cancel</button>
            <button type="submit" className="btn-premium" style={{ padding: '0.75rem 2rem' }}>Save Vendor</button>
          </div>
        </form>
      </div>
    </div>
  );
};



const VendorPortfolioModal = ({ vendorName, onClose }) => {
  const { state, dispatch, showToast } = useProcure();
  const [isExporting, setIsExporting] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const dashboardRef = useRef(null);
  const mapSectionRef = useRef(null);
  
  const [hoveredState, setHoveredState] = useState(null);
  const [focusedVendor, setFocusedVendor] = useState(null);
  
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

  const portfolio = useMemo(() => {
    const targetKey = String(vendorName || '').trim().toLowerCase();
    const projects = (state.vendors || []).filter(v => 
      v && (
        (v.vendorCode && String(v.vendorCode).trim().toLowerCase() === targetKey) ||
        (v.vendorName && String(v.vendorName).trim().toLowerCase() === targetKey)
      )
    );
    const totalCapacity = projects.reduce((sum, v) => sum + getCapacityInMW(v.plantCapacity, v.capacityUnit), 0);
    const avgRate = projects.length > 0 ? projects.reduce((sum, v) => sum + (Number(v.rate) || 0), 0) / projects.length : 0;
    
    // Add default lat/lng for mapping if missing
    const projectsWithCoords = projects.map((v, i) => {
      if (!v.lat || !v.lng) {
        const center = REGION_CENTERS[v.region] || [79, 23.5];
        const offsetLng = (i % 5) * 0.8 - 1.6;
        const offsetLat = (i % 3) * 0.8 - 0.8;
        return { ...v, lat: center[1] + offsetLat, lng: center[0] + offsetLng };
      }
      return v;
    });

    return {
      projects: projectsWithCoords,
      totalCapacity: safeFormatNumber(totalCapacity),
      avgRate: safeFormatNumber(avgRate),
      primaryUnit: 'MWp',
      primaryRegion: projectsWithCoords.length > 0 ? projectsWithCoords[0].region : null
    };
  }, [state.vendors, vendorName]);

  const vendorSpecificChartData = useMemo(() => {
    if (!portfolio || !portfolio.projects) return [];
    return portfolio.projects.map(p => ({
      name: p.plantName || 'Plant',
      fullName: p.plantName || 'Plant',
      capacity: Number(p.plantCapacity) || 0,
      rate: Number(p.rate) || 0
    }));
  }, [portfolio.projects]);

  const handleDeletePlant = (id) => {
    if (window.confirm('Move this plant/contract to the Recycle Bin?')) {
      const plant = (state.vendors || []).find(v => v && v.id === id);
      dispatch({
        type: 'SOFT_DELETE_VENDOR',
        payload: id,
        meta: { deletedBy: state.currentUser?.name, deletedByRole: state.currentUser?.role }
      });
      notifyDeletion(dispatch, {
        itemType: 'Vendor Contract',
        itemName: plant ? `${plant.vendorName} — ${plant.plantName}` : 'Vendor Plant',
        actorName: state.currentUser?.name || 'Unknown User',
      });
      showToast('Plant moved to Recycle Bin', 'success');
    }
  };

  if (!vendorName) return null;

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Vendor Report');
      const dashSheet = workbook.addWorksheet('Dashboard');

      // Add Title Row
      const titleRow = worksheet.addRow([`CLEANMAX — VENDOR PORTFOLIO REPORT: ${vendorName.toUpperCase()}`]);
      worksheet.mergeCells('A1:L1');
      titleRow.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow.height = 34;

      worksheet.addRow([]); // Empty row for spacing

      // Add Headers
      const headers = ['Vendor Code', 'Vendor Name', 'CMES Entity', 'Plant Name', 'Capacity', 'Region', 'City', 'PO No', 'Starting Date', 'Ending Date', 'Escalation Ratio', 'Status'];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tableBorder = {
        top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right:  { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      headerRow.eachCell(cell => {
        cell.border = tableBorder;
      });

      // Add Data & Apply Highlighting Logic
      (portfolio.projects || []).forEach((p, idx) => {
        const escalation = p.previousRate ? safeFormatNumber(Number(p.rate) - Number(p.previousRate)) : 0;
        
        // End-date & status calculation for highlighting
        const endDate = p.contractEnd ? new Date(p.contractEnd) : null;
        if (endDate) endDate.setHours(0, 0, 0, 0);
        const daysLeft = endDate ? Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) : null;

        const rawStatus = String(p.status || '').trim().toLowerCase();
        const isExpiring = (daysLeft !== null && daysLeft >= 0 && daysLeft <= 90) || rawStatus.includes('expiring');
        const isExpired  = (daysLeft !== null && daysLeft < 0) || rawStatus.includes('expired');

        let displayStatus = p.status || 'Active';
        if (isExpired && !rawStatus.includes('expired')) displayStatus = 'Expired';
        else if (isExpiring && !rawStatus.includes('expiring')) displayStatus = 'Expiring Soon';

        const row = worksheet.addRow([
          p.vendorCode || '-',
          p.vendorName || '-',
          p.cmesEntity || '-',
          p.plantName || '-',
          `${p.plantCapacity || 0} ${p.capacityUnit || ''}`,
          p.region || '-',
          p.city || '-',
          p.poNumber || '-',
          safeFormatDate(p.contractStart),
          safeFormatDate(p.contractEnd),
          `₹${escalation}`,
          displayStatus
        ]);
        row.height = 22;

        let rowBgColor   = idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        let rowTextColor = 'FF0F172A';

        if (isExpiring) {
          rowBgColor   = 'FFFED7AA'; // Rich Light Warm Orange/Amber whole row
          rowTextColor = 'FF7C2D12';
        } else if (isExpired) {
          rowBgColor   = 'FFFECDD3'; // Rich Light Red/Rose whole row
          rowTextColor = 'FF991B1B';
        }

        row.eachCell({ includeEmpty: true }, (cell, colNo) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowBgColor }
          };
          cell.font = { 
            name: 'Arial', 
            size: 9, 
            bold: isExpiring || isExpired || colNo === 12,
            color: { argb: rowTextColor } 
          };
          cell.border = tableBorder;
          cell.alignment = { vertical: 'middle', horizontal: [1, 3, 6, 8, 9, 10, 12].includes(colNo) ? 'center' : [5, 11].includes(colNo) ? 'right' : 'left' };
        });

        // Color coding for status cell
        const statusCell = row.getCell(12);
        if (isExpiring) {
          statusCell.font = { name: 'Arial', size: 9, color: { argb: 'FFC2410C' }, bold: true };
        } else if (isExpired) {
          statusCell.font = { name: 'Arial', size: 9, color: { argb: 'FFB91C1C' }, bold: true };
        } else {
          statusCell.font = { name: 'Arial', size: 9, color: { argb: 'FF047857' }, bold: true };
        }
      });

      // Add Column Widths
      worksheet.columns = [16, 26, 16, 26, 14, 16, 18, 18, 16, 16, 16, 16].map(w => ({ width: w }));

      // Embed Dashboard Image
      if (dashboardRef.current) {
        // Wait slightly to ensure map tiles are loaded if they were just rendered
        await new Promise(r => setTimeout(r, 500));
        
        const canvas = await html2canvas(dashboardRef.current, { 
          scale: 2, 
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true
        });
        const imgData = canvas.toDataURL('image/png');
        const imageId = workbook.addImage({
          base64: imgData,
          extension: 'png',
        });
        dashSheet.addImage(imageId, {
          tl: { col: 1, row: 1 },
          ext: { width: canvas.width / 2.5, height: canvas.height / 2.5 }
        });
        
        dashSheet.views = [
          {showGridLines: false}
        ];
      }

      // Generate Excel File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vendorName.replace(/\s+/g, '_')}_Dashboard.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel animate-fade-in-up" style={{ width: '98%', maxWidth: '1400px', maxHeight: '98vh', overflowY: 'auto', padding: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.5rem' }}>Vendor Portfolio</div>
            <h2 style={{ fontSize: '2.5rem', lineHeight: 1.1, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>{vendorName}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={handleExportReport}
              disabled={isExporting}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.5rem 1rem', 
                backgroundColor: isExporting ? '#6ee7b7' : '#10b981', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 600,
                cursor: isExporting ? 'wait' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => !isExporting && (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseLeave={(e) => !isExporting && (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              <Download size={18} /> {isExporting ? 'Exporting...' : 'Export Report'}
            </button>
            <button 
              onClick={onClose} 
              className="btn-ghost" 
              style={{ 
                padding: '0.75rem', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <X size={28} />
            </button>
          </div>
        </div>

        {/* This div is screenshotted by html2canvas for the Excel Dashboard */}
        <div ref={dashboardRef} style={{ background: '#ffffff', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
          
          <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{vendorName}</h2>
            <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '1.1rem' }}>Vendor Performance & Regional Dashboard</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Total Projects</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>{portfolio.projects.length}</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Total Capacity</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>
                {portfolio.totalCapacity} <span style={{ fontSize: '1.2rem', color: '#64748b' }}>{portfolio.primaryUnit}</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>Average Rate</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>₹{portfolio.avgRate}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
             {/* Map Section */}
             <div ref={mapSectionRef}>
               <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827', fontWeight: 600 }}>Regional Presence</h3>
               {focusedVendor && (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.4rem 0.75rem', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px', fontSize: '0.82rem', color: '#065f46' }}>
                   <span style={{ fontWeight: 700 }}>📍 Viewing:</span>
                   <span>{focusedVendor.plantName}</span>
                   <button onClick={() => setFocusedVendor(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontSize: '1rem', lineHeight: 1 }} title="Clear focus">✕</button>
                 </div>
               )}
               <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${focusedVendor ? '#10b981' : '#e2e8f0'}`, position: 'relative', transition: 'border-color 0.3s' }}>
                 <IndiaMap 
                   selectedRegion={focusedVendor ? null : portfolio.primaryRegion} 
                   onRegionClick={() => {}} 
                   hoveredState={hoveredState}
                   setHoveredState={setHoveredState}
                   vendors={portfolio.projects} 
                   focusedVendor={focusedVendor}
                   setFocusedVendor={setFocusedVendor}
                 />
               </div>
             </div>
             
             {/* Chart Section */}
             <div>
               <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#111827', fontWeight: 600 }}>Project Capacities & Rates</h3>
               <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#4b5563' }}>
                 Overview of plant capacity and PPA rates for {vendorName}'s projects.
               </p>
               <div style={{ height: '350px', width: '100%' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={vendorSpecificChartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                      <defs>
                        <linearGradient id="colorProjectCapacityModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280" 
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#6b7280" 
                        fontSize={12} 
                        tickFormatter={(val) => `₹${val}`} 
                        axisLine={false}
                        tickLine={false}
                        dx={-10}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#6b7280" 
                        fontSize={12} 
                        tickFormatter={(val) => `${val}kWp`} 
                        axisLine={false}
                        tickLine={false}
                        dx={10}
                      />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', color: '#111827', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ fontWeight: 600, fontSize: '0.95rem' }}
                        labelStyle={{ color: '#6b7280', marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        formatter={(value, name) => {
                          if (name === "Project Rate") return [`₹${value}/unit`, name];
                          if (name === "Plant Capacity") return [`${value} kWp`, name];
                          return [value, name];
                        }}
                        labelFormatter={(label, entries) => entries.length > 0 ? entries[0].payload.fullName : label}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '0.9rem', fontWeight: 600, color: '#4b5563' }} 
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="capacity" 
                        name="Plant Capacity"
                        fill="url(#colorProjectCapacityModal)"
                        radius={[6, 6, 0, 0]}
                        barSize={50}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone"
                        dataKey="rate" 
                        name="Project Rate"
                        stroke="#f59e0b"
                        strokeWidth={4}
                        dot={{ r: 5, strokeWidth: 2, fill: '#ffffff', stroke: '#f59e0b' }}
                        activeDot={{ r: 7, strokeWidth: 0, fill: '#f59e0b' }}
                      />
                    </ComposedChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#111827', fontWeight: 600 }}>Active Plants &amp; Contracts</h3>
              <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#ecfdf5', padding: '0.3rem 0.65rem', borderRadius: '999px', border: '1px solid #a7f3d0' }}>
                📍 Click any row to locate on map
              </span>
            </div>
            <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
              <table className="premium-table" style={{ background: 'transparent', width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent', padding: '0.65rem 0.75rem' }}>Plant &amp; References</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent', padding: '0.65rem 0.75rem' }}>Location</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent', padding: '0.65rem 0.75rem' }}>Capacity</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent', padding: '0.65rem 0.75rem' }}>Rate</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent', padding: '0.65rem 0.75rem' }}>Contract Period</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent', padding: '0.65rem 0.75rem' }}>Status</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent', padding: '0.65rem 0.75rem' }}>Last Edited By</th>
                    {state.currentUser?.role !== 'viewer' && (
                      <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent', padding: '0.65rem 0.75rem', textAlign: 'center' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {portfolio.projects.map(p => {
                    const isFocused = focusedVendor?.id === p.id;
                    return (
                    <tr 
                      key={p.id} 
                      style={{ 
                        borderBottom: '1px solid #e2e8f0', 
                        background: isFocused ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        outline: isFocused ? '2px solid #10b981' : 'none',
                        outlineOffset: '-2px'
                      }}
                      title={`Click to locate ${p.plantName} on map`}
                      onClick={() => {
                        setFocusedVendor(isFocused ? null : p);
                        // Scroll the map section into view smoothly
                        if (!isFocused && mapSectionRef.current) {
                          mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }}
                      onMouseEnter={e => { if (!isFocused) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isFocused) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {isFocused && <span style={{ color: '#10b981', fontSize: '0.85rem' }}>📍</span>}
                          <div style={{ fontWeight: 600, color: isFocused ? '#065f46' : '#0f172a' }}>{p.plantName}</div>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.15rem' }}>PO: {p.poNumber}</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ color: '#0f172a', fontSize: '0.85rem' }}>{p.city ? `${p.city}, ` : ''}{p.state}</div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{p.region} Region</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap' }}>{p.plantCapacity || 0} {p.capacityUnit || ''}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap' }}>₹{safeFormatNumber(p.rate)}</td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {safeFormatDate(p.contractStart)} - <br/>
                        <strong style={{ color: '#0f172a' }}>{safeFormatDate(p.contractEnd)}</strong>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <span className={`status-pill ${getStatusClass(p.status)}`}>
                          {p.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        {(p.lastEditedBy || p.lastEditedById || (p.editedByHistory && p.editedByHistory.length > 0)) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '100px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {p.editedByHistory && p.editedByHistory.length > 0 ? (
                              p.editedByHistory.map((h, i) => {
                                const name = typeof h === 'string' ? h : (h?.name || 'Unknown');
                                const time = typeof h === 'string' ? (p.lastEditedAt || p.createdAt) : h?.time;
                                return (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', padding: '0.25rem 0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                    <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.78rem' }}>{name}</span>
                                    <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{safeFormatDateTime(time, { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', padding: '0.25rem 0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.78rem' }}>{getEditorName(p)}</span>
                                <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{safeFormatDateTime(p.lastEditedAt || p.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
                        )}
                      </td>
                      {state.currentUser?.role !== 'viewer' && (
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button onClick={() => setEditingPlant(p)} className="btn-ghost" style={{ padding: '0.35rem' }} title="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeletePlant(p.id)} className="btn-ghost" style={{ padding: '0.35rem', color: '#ef4444' }} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
      {editingPlant && (
        <VendorRegistrationForm
          initialData={{
            ...editingPlant,
            contractStart: new Date(editingPlant.contractStart).toISOString().split('T')[0],
            contractEnd: new Date(editingPlant.contractEnd).toISOString().split('T')[0]
          }}
          isEditing={true}
          onClose={() => setEditingPlant(null)}
        />
      )}
    </div>
  );
};

const Vendors = ({ initialFilter = '' }) => {
  const { state, dispatch, showToast } = useProcure();
  const [searchTerm, setSearchTerm] = useState(initialFilter);
  const [isExporting, setIsExporting] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [sortConfig, setSortConfig] = useState({ key: 'vendorName', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDrawer, setShowDrawer] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [portfolioVendor, setPortfolioVendor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Reset page on search or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  // Debounced search logic could be added here, simplified for now
  
  const filteredAndSortedVendors = useMemo(() => {
    let result = [...(state.vendors || [])];

    const vendorGroups = {};
    result.forEach(v => {
      if (!v) return;
      const key = (v.vendorCode && String(v.vendorCode).trim())
        ? String(v.vendorCode).trim()
        : (v.vendorName || 'Unknown Vendor');
      
      if (!vendorGroups[key]) {
        vendorGroups[key] = {
          ...v,
          vendorCode: v.vendorCode || key,
          vendorName: v.vendorName || key,
          id: v.id || v.vendorCode || key,
          projectIds: [],
          projectsCount: 0,
          totalCapacity: 0,
          totalRate: 0,
          allRegions: new Set(),
          allStatuses: new Set()
        };
      }
      const group = vendorGroups[key];
      if (v.id) group.projectIds.push(v.id);
      group.projectsCount += 1;
      group.totalCapacity += getCapacityInMW(v.plantCapacity, v.capacityUnit);
      group.totalRate += (Number(v.rate) || 0);
      if (v.region && v.region !== '—') group.allRegions.add(v.region);
      if (v.status) group.allStatuses.add(v.status);
    });

    let groupedResult = Object.values(vendorGroups).map(group => {
      const statuses = Array.from(group.allStatuses).map(s => String(s || '').toLowerCase().trim());
      
      let finalStatus = 'Active';
      if (statuses.some(s => s.includes('expiring'))) {
        finalStatus = 'Expiring Soon'; // Orange warning
      } else if (statuses.length > 0 && statuses.every(s => s.includes('expired'))) {
        finalStatus = 'Expired'; // Red only if ALL plants are expired
      } else if (statuses.some(s => s.includes('active') || s.includes('completed') || s.includes('progress'))) {
        finalStatus = 'Active'; // Green
      } else if (statuses.some(s => s.includes('expired'))) {
        finalStatus = 'Expiring Soon'; // If some are expired but others are active/unknown, treat as warning
      }

      const avgRate = group.projectsCount > 0 ? group.totalRate / group.projectsCount : 0;

      return {
        ...group,
        plantCapacity: Number(safeFormatNumber(group.totalCapacity)),
        capacityUnit: 'MWp',
        rate: Number(safeFormatNumber(avgRate)),
        region: group.allRegions.size > 1 ? 'Multiple' : (Array.from(group.allRegions)[0] || '—'),
        status: finalStatus
      };
    });

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      groupedResult = groupedResult.filter(v => 
        (v.vendorCode && v.vendorCode.toLowerCase().includes(lowerSearch)) || 
        (v.vendorName && v.vendorName.toLowerCase().includes(lowerSearch)) ||
        (v.status && v.status.toLowerCase().includes(lowerSearch))
      );
    }

    groupedResult.sort((a, b) => {
      let valA = a[sortConfig.key] ?? '';
      let valB = b[sortConfig.key] ?? '';
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return groupedResult;
  }, [state.vendors, searchTerm, sortConfig]);

  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedVendors.slice(start, start + pageSize);
  }, [filteredAndSortedVendors, currentPage, pageSize]);

  const overallChartData = useMemo(() => {
    const vendorMap = {};
    (state.vendors || []).forEach(v => {
      if (!v) return;
      const vName = v.vendorName || 'Unknown';
      if (!vendorMap[vName]) {
        vendorMap[vName] = { name: vName, capacity: 0, totalRate: 0, count: 0 };
      }
      vendorMap[vName].capacity += getCapacityInMW(v.plantCapacity, v.capacityUnit);
      vendorMap[vName].totalRate += Number(v.rate) || 0;
      vendorMap[vName].count += 1;
    });

    return Object.values(vendorMap).map(v => {
      const nameStr = String(v.name || 'Unknown');
      const words = nameStr.split(' ');
      let shortName = words.length > 1 ? words.slice(0, 2).join(' ') : words[0];
      if (shortName.length > 15) {
        shortName = shortName.substring(0, 15) + '...';
      }
      const avgRate = v.count > 0 ? v.totalRate / v.count : 0;
      return {
        name: shortName,
        fullName: nameStr,
        capacity: Number(safeFormatNumber(v.capacity)),
        rate: Number(safeFormatNumber(avgRate))
      };
    }).sort((a, b) => b.capacity - a.capacity).slice(0, 20); // Top 20 practical view
  }, [state.vendors]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(paginatedVendors.map(v => v.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectAllPages = () => {
    setSelectedIds(new Set(filteredAndSortedVendors.map(v => v.id)));
  };

  const handleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Move ${selectedIds.size} vendor(s) to Recycle Bin?`)) {
      const idsToDelete = [];
      const names = [];
      filteredAndSortedVendors.forEach(group => {
        if (selectedIds.has(group.id)) {
          idsToDelete.push(...group.projectIds);
          names.push(group.vendorName);
        }
      });
      dispatch({
        type: 'SOFT_DELETE_VENDORS',
        payload: idsToDelete,
        meta: { deletedBy: state.currentUser?.name, deletedByRole: state.currentUser?.role }
      });
      sendNotification(dispatch, {
        title: '🗑️ Vendors Moved to Recycle Bin',
        message: `${selectedIds.size} vendor(s) moved to Recycle Bin: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3} more` : ''}`,
        type: 'error',
        targetRoles: ['admin'],
        actor: state.currentUser?.name,
        actorRole: state.currentUser?.role,
      });
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} vendors moved to Recycle Bin`, 'success');
    }
  };

  const handleExportVendorRegistry = async () => {
    setIsExporting(true);
    showToast('📦 Preparing complete vendor registry export...', 'info');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CleanMax Analytics';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Vendor Registry');

      // Title Banner (Merged A1:O2) - Green Theme
      worksheet.mergeCells('A1:O2');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'CLEANMAX — VENDOR REGISTRY FULL PORTFOLIO REPORT';
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' } // Green banner
      };

      // Header Row (Row 3) - Grey Header
      const headers = [
        'Vendor Code', 'Vendor Name', 'CMES Entity', 'Region', 'State', 'City',
        'Plant Name', 'Plant Capacity', 'Contract Rate (INR)',
        'PO Number', 'Status', 'Contract Start', 'Contract End', 'Contact Person', 'Email'
      ];
      worksheet.getRow(3).values = headers;
      worksheet.getRow(3).height = 24;

      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4B5563' } // Grey sub-header
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Column Widths
      const columnWidths = [16, 28, 18, 16, 16, 20, 26, 16, 16, 20, 16, 16, 16, 22, 28];
      columnWidths.forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
        worksheet.getColumn(index + 1).alignment = { vertical: 'middle' };
      });

      // Freeze header rows
      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }
      ];

      const tableBorder = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      headerRow.eachCell(cell => {
        cell.border = tableBorder;
      });

      // Add Data Rows for all vendors
      (state.vendors || []).forEach(v => {
        const row = worksheet.addRow([
          v.vendorCode || '-',
          v.vendorName || '-',
          v.cmesEntity || '-',
          v.region || '-',
          v.state || '-',
          v.city || '-',
          v.plantName || '-',
          `${v.plantCapacity || 0} ${v.capacityUnit || 'MWp'}`,
          v.rate !== undefined && v.rate !== null ? Number(v.rate) : 0,
          v.poNumber || '-',
          v.status || 'Active',
          safeFormatDate(v.contractStart),
          safeFormatDate(v.contractEnd),
          v.contactPerson || '-',
          v.email || '-'
        ]);
        row.height = 22;
      });

      // Alternating row colors & whole-row status highlights
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 3) { // Skip title and header
          const statusVal = String(row.getCell(11).value || '');

          let rowBgColor = rowNumber % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
          let rowTextColor = 'FF0F172A';

          if (statusVal === 'Expiring Soon') {
            rowBgColor = 'FFFED7AA'; // Rich Warm Orange/Amber whole row
            rowTextColor = 'FF7C2D12'; // Dark Amber/Orange Text
          } else if (statusVal === 'Expired') {
            rowBgColor = 'FFFECDD3'; // Rich Light Red/Rose whole row
            rowTextColor = 'FF991B1B'; // Dark Red Text
          }

          row.eachCell((cell, colNo) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: rowBgColor }
            };
            cell.border = tableBorder;
            cell.font = { name: 'Arial', size: 9, color: { argb: rowTextColor } };
            cell.alignment = { vertical: 'middle' };

            // Center align codes, region, state, PO, status, dates
            if ([1, 3, 4, 5, 10, 11, 12, 13].includes(colNo)) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            // Right align rates & capacity
            if ([8, 9].includes(colNo)) {
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
            }
          });

          // Highlight Expiring or Expired status cell
          const statusCell = row.getCell(11); // Status column
          if (statusCell.value === 'Expiring Soon') {
            statusCell.font = { name: 'Arial', size: 9, color: { argb: 'FFC2410C' }, bold: true };
          } else if (statusCell.value === 'Expired') {
            statusCell.font = { name: 'Arial', size: 9, color: { argb: 'FFB91C1C' }, bold: true };
          } else {
            statusCell.font = { name: 'Arial', size: 9, color: { argb: 'FF047857' }, bold: true };
          }
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CleanMax_Vendor_Registry_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      showToast('✅ All vendor data exported successfully!', 'success');
      setIsReportModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('❌ Failed to export vendor data', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      <div className="animate-stagger mobile-flex-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Vendor Registry</h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Manage and oversee all vendor contracts.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', width: '100%', overflowX: 'auto' }}>
          <button
            onClick={handleExportVendorRegistry}
            disabled={isExporting}
            className="btn-premium"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center', opacity: isExporting ? 0.7 : 1 }}
          >
            {isExporting ? (
              <React.Fragment>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Exporting...
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Calendar size={18} /> Generate Report
              </React.Fragment>
            )}
          </button>
          {state.currentUser?.role !== 'viewer' && (
            <button onClick={() => setShowDrawer(true)} className="btn-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
              <Plus size={18} /> New Vendor
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
              placeholder="Search by Code, Name, or Status..." 
              className="premium-input" 
              style={{ paddingLeft: '2.75rem', borderRadius: '99px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {selectedIds.size > 0 && (
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', borderRadius: '99px' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{selectedIds.size} selected</span>
              {selectedIds.size >= 2 && selectedIds.size <= 3 && (
                <button onClick={() => setShowComparison(true)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem' }}>
                  <GitCompare size={16} /> Compare
                </button>
              )}
              {state.currentUser?.role !== 'viewer' && (
                <button onClick={handleDeleteSelected} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.35rem 1rem', borderRadius: '99px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Trash2 size={16} /> Delete Selected
                </button>
              )}
              <button onClick={() => setSelectedIds(new Set())} className="btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Select-all-pages banner */}
        {selectedIds.size > 0 && selectedIds.size < filteredAndSortedVendors.length && selectedIds.size === paginatedVendors.length && (
          <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              All <strong style={{ color: 'var(--text-primary)' }}>{paginatedVendors.length}</strong> vendors on this page are selected.
            </span>
            <button
              onClick={handleSelectAllPages}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontWeight: 700, fontSize: '0.875rem', padding: 0 }}
            >
              Select all {filteredAndSortedVendors.length} vendors across all pages
            </button>
          </div>
        )}
        {selectedIds.size === filteredAndSortedVendors.length && filteredAndSortedVendors.length > paginatedVendors.length && (
          <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              ✅ All {filteredAndSortedVendors.length} vendors selected across all pages.
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: '0.875rem', padding: 0 }}
            >
              Clear Selection
            </button>
          </div>
        )}

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectedIds.size > 0 && paginatedVendors.every(v => selectedIds.has(v.id))} 
                  />
                </th>
                {['vendorCode', 'vendorName', 'region', 'plantCapacity', 'rate', 'status'].map((key) => (
                  <th key={key} onClick={() => requestSort(key)} style={{ cursor: 'pointer' }}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    {sortConfig.key === key && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedVendors.map(v => (
                <tr key={v.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.has(v.id)} onChange={() => handleSelect(v.id)} />
                  </td>
                  <td><strong>{v.vendorCode}</strong></td>
                  <td>
                    <button 
                      onClick={() => setPortfolioVendor(v.vendorName)} 
                      style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600, color: 'var(--accent-color)', cursor: 'pointer', textAlign: 'left', transition: 'color var(--transition-fast)' }}
                      onMouseEnter={(e) => e.target.style.color = '#fff'}
                      onMouseLeave={(e) => e.target.style.color = 'var(--accent-color)'}
                    >
                      {v.vendorName}
                    </button>
                  </td>
                  <td className="text-secondary">{v.region}</td>
                  <td style={{ fontWeight: 600 }}>{v.plantCapacity} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.capacityUnit}</span></td>
                  <td style={{ fontWeight: 600 }}>₹{safeFormatNumber(v.rate)}</td>
                  <td>
                    <span className={`status-pill ${getStatusClass(v.status)}`}>
                      {normalizeStatus(v.status) === 'active' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>}
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAndSortedVendors.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No vendors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredAndSortedVendors.length > pageSize && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, filteredAndSortedVendors.length)}</strong> of <strong>{filteredAndSortedVendors.length}</strong> vendors
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
                Page {currentPage} of {Math.ceil(filteredAndSortedVendors.length / pageSize)}
              </span>
              <button
                className="btn-ghost"
                disabled={currentPage >= Math.ceil(filteredAndSortedVendors.length / pageSize)}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredAndSortedVendors.length / pageSize), p + 1))}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', opacity: currentPage >= Math.ceil(filteredAndSortedVendors.length / pageSize) ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel animate-stagger delay-2" style={{ marginTop: '2rem', padding: '2.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Rate & Capacity by Vendor</h3>
        <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '1rem' }}>
          Overview of total capacity and average PPA rates across all registered vendors.
        </p>
        <div style={{ height: '450px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={overallChartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="colorOverallCapacity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="var(--text-secondary)" 
                axisLine={false}
                tickLine={false}
                tick={false}
                dy={10}
              />
              <YAxis 
                yAxisId="left"
                stroke="var(--text-secondary)" 
                fontSize={12} 
                tickFormatter={(val) => `₹${val}`} 
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="var(--text-secondary)" 
                fontSize={12} 
                tickFormatter={(val) => `${val} MWp`} 
                axisLine={false}
                tickLine={false}
                dx={10}
              />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ fontWeight: 600, fontSize: '0.95rem' }}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                formatter={(value, name) => {
                  if (name === "Average Rate") return [`₹${value}/unit`, name];
                  if (name === "Total Capacity") return [`${value} MWp`, name];
                  return [value, name];
                }}
                labelFormatter={(label, entries) => entries.length > 0 ? entries[0].payload.fullName : label}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }} 
              />
              <Bar 
                yAxisId="right"
                dataKey="capacity" 
                name="Total Capacity"
                fill="url(#colorOverallCapacity)"
                radius={[6, 6, 0, 0]}
                barSize={50}
              />
              <Line 
                yAxisId="left"
                type="monotone"
                dataKey="rate" 
                name="Average Rate"
                stroke="#f59e0b"
                strokeWidth={4}
                dot={{ r: 5, strokeWidth: 2, fill: '#0a1128', stroke: '#f59e0b' }}
                activeDot={{ r: 7, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showDrawer && (
        <React.Fragment>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={() => setShowDrawer(false)} />
          <VendorRegistrationForm onClose={() => setShowDrawer(false)} />
        </React.Fragment>
      )}

      {showComparison && (
        <ComparisonModal 
          selectedVendors={filteredAndSortedVendors.filter(v => selectedIds.has(v.id))} 
          onClose={() => setShowComparison(false)} 
        />
      )}

      {portfolioVendor && (
        <VendorPortfolioModal 
          vendorName={portfolioVendor} 
          onClose={() => setPortfolioVendor(null)} 
        />
      )}

      {isReportModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{ 
            width: '100%',
            maxWidth: '550px', 
            padding: '2.5rem', 
            animation: 'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative background glow */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
              pointerEvents: 'none',
              zIndex: 0
            }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', margin: 0, fontWeight: 700 }}>
                  <div style={{ background: 'var(--accent-gradient)', padding: '0.75rem', borderRadius: '1rem', color: '#fff', display: 'flex', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)' }}>
                    <Calendar size={28} />
                  </div>
                  Generate Report
                </h2>
                <button 
                  onClick={() => setIsReportModalOpen(false)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', 
                    color: 'var(--text-secondary)', display: 'flex', padding: '0.75rem',
                    borderRadius: '50%', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
                Select a month to generate a comprehensive Excel portfolio of all vendors. This includes capacities, rates, and detailed contract statuses.
              </p>

              {/* Custom Date Picker UI */}
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '1.25rem', 
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '1.5rem',
                marginBottom: '2.5rem'
              }}>
                {/* Year Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                  <button 
                    onClick={() => setSelectedYear(y => y - 1)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '0.5rem', borderRadius: '0.5rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>{selectedYear}</span>
                  <button 
                    onClick={() => setSelectedYear(y => y + 1)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '0.5rem', borderRadius: '0.5rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>

                {/* Month Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {MONTHS.map((month, index) => {
                    const isSelected = selectedMonth === index;
                    return (
                      <button
                        key={month}
                        onClick={() => setSelectedMonth(index)}
                        style={{
                          padding: '1rem 0.5rem',
                          borderRadius: '0.75rem',
                          border: isSelected ? '1px solid transparent' : '1px solid rgba(255,255,255,0.05)',
                          background: isSelected ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          fontSize: '0.95rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isSelected ? '0 8px 16px rgba(16, 185, 129, 0.2)' : 'none',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {month}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  style={{ 
                    padding: '0.875rem 1.5rem', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'transparent', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: '#fff', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} 
                  onClick={() => setIsReportModalOpen(false)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Cancel
                </button>
                <button 
                  className="btn-premium" 
                  onClick={handleExportVendorRegistry} 
                  disabled={isExporting}
                  style={{
                    padding: '0.875rem 2rem',
                    fontSize: '1.05rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: isExporting ? 0.7 : 1,
                    cursor: isExporting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isExporting ? (
                    <React.Fragment>
                      <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Exporting...
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <Download size={20} />
                      Export Report
                    </React.Fragment>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
