import React, { useState, useMemo } from 'react';
import { useProcure } from '../context/ProcureContext';
import { Search, Plus, Download, Trash2, X, GitCompare } from 'lucide-react';

const ComparisonModal = ({ selectedVendors, onClose }) => {
  if (!selectedVendors || selectedVendors.length < 2) return null;
  
  const properties = [
    { key: 'vendorCode', label: 'Vendor Code' },
    { key: 'vendorName', label: 'Name' },
    { key: 'plantName', label: 'Plant' },
    { key: 'plantCapacity', label: 'Capacity', render: (v) => `${v.plantCapacity} ${v.capacityUnit}` },
    { key: 'rate', label: 'Rate (₹)', render: (v) => `₹${v.rate}` },
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
          <table>
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
                        <span className={`status-pill ${
                          v.status === 'Active' ? 'status-active' :
                          v.status === 'Expiring Soon' ? 'status-warning' : 'status-danger'
                        }`}>
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

const VendorRegistrationForm = ({ onClose }) => {
  const { dispatch, showToast } = useProcure();
  const [formData, setFormData] = useState({
    vendorName: '',
    plantName: '',
    plantCapacity: '',
    capacityUnit: 'MWp',
    rate: '',
    poNumber: '',
    prNumber: '',
    region: 'North',
    state: '',
    contractStart: new Date().toISOString().split('T')[0],
    contractEnd: new Date(Date.now() + 31536000000).toISOString().split('T')[0] // +1 year
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const vendorCode = `VND-${Math.floor(1000 + Math.random() * 9000)}`;
    
    dispatch({
      type: 'ADD_VENDOR',
      payload: {
        ...formData,
        vendorCode,
        plantCapacity: Number(formData.plantCapacity),
        rate: Number(formData.rate)
      }
    });
    
    showToast('Vendor registered successfully');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <h2 style={{ fontSize: '1.75rem' }}>Register Vendor</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>General Information</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Name *</label>
                <input required type="text" name="vendorName" className="premium-input vendor-modal-input" value={formData.vendorName} onChange={handleChange} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Region</label>
                  <select name="region" className="premium-input vendor-modal-input" value={formData.region} onChange={handleChange}>
                    {['North', 'South', 'East', 'West', 'Central'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>State</label>
                  <input type="text" name="state" className="premium-input vendor-modal-input" placeholder="e.g. Maharashtra" value={formData.state} onChange={handleChange} />
                </div>
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
                    <option value="MWp">MWp</option>
                    <option value="KWp">KWp</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Contract & Commercials</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>PR Number *</label>
                <input required type="text" name="prNumber" className="premium-input vendor-modal-input" value={formData.prNumber} onChange={handleChange} />
              </div>
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

const Vendors = ({ initialFilter = '' }) => {
  const { state, dispatch, showToast } = useProcure();
  const [searchTerm, setSearchTerm] = useState(initialFilter);
  const [sortConfig, setSortConfig] = useState({ key: 'vendorCode', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDrawer, setShowDrawer] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Debounced search logic could be added here, simplified for now
  
  const filteredAndSortedVendors = useMemo(() => {
    let result = [...state.vendors];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(v => 
        v.vendorCode.toLowerCase().includes(lowerSearch) || 
        v.vendorName.toLowerCase().includes(lowerSearch) ||
        (v.status && v.status.toLowerCase().includes(lowerSearch))
      );
    }

    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [state.vendors, searchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(filteredAndSortedVendors.map(v => v.id)));
    else setSelectedIds(new Set());
  };

  const handleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (window.confirm('Delete selected vendors?')) {
      dispatch({ type: 'DELETE_VENDORS', payload: Array.from(selectedIds) });
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} vendors deleted`, 'success');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Vendor Code', 'Name', 'Plant', 'Capacity', 'Unit', 'Rate', 'Region', 'Status'];
    const rows = filteredAndSortedVendors.map(v => 
      [v.vendorCode, v.vendorName, v.plantName, v.plantCapacity, v.capacityUnit, v.rate, v.region, v.status].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors_export_${new Date().getTime()}.csv`;
    a.click();
    showToast('Export successful', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      <div className="animate-stagger" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Vendor Registry</h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Manage and oversee all vendor contracts.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleExportCSV} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Export CSV
          </button>
          <button onClick={() => setShowDrawer(true)} className="btn-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> New Vendor
          </button>
        </div>
      </div>

      <div className="animate-stagger delay-1" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '350px' }}>
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
              <button onClick={handleDeleteSelected} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.35rem 1rem', borderRadius: '99px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Trash2 size={16} /> Delete
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
                    checked={selectedIds.size === filteredAndSortedVendors.length && filteredAndSortedVendors.length > 0} 
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
              {filteredAndSortedVendors.map(v => (
                <tr key={v.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.has(v.id)} onChange={() => handleSelect(v.id)} />
                  </td>
                  <td><strong>{v.vendorCode}</strong></td>
                  <td style={{ fontWeight: 500 }}>{v.vendorName}</td>
                  <td className="text-secondary">{v.region}</td>
                  <td style={{ fontWeight: 600 }}>{v.plantCapacity} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.capacityUnit}</span></td>
                  <td style={{ fontWeight: 600 }}>₹{v.rate}</td>
                  <td>
                    <span className={`status-pill ${
                      v.status === 'Active' ? 'status-active' :
                      v.status === 'Expiring Soon' ? 'status-warning' : 'status-danger'
                    }`}>
                      {v.status === 'Active' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>}
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
      </div>

      {showDrawer && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={() => setShowDrawer(false)} />
          <VendorRegistrationForm onClose={() => setShowDrawer(false)} />
        </>
      )}

      {showComparison && (
        <ComparisonModal 
          selectedVendors={filteredAndSortedVendors.filter(v => selectedIds.has(v.id))} 
          onClose={() => setShowComparison(false)} 
        />
      )}
    </div>
  );
};

export default Vendors;
