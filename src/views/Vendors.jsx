import React, { useState, useMemo, useRef } from 'react';
import { useProcure } from '../context/ProcureContext';
import { Search, Plus, Download, Trash2, X, GitCompare, Mail, Phone, FileText, User, Building } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import { IndiaMap } from './RegionMap';
import { REGION_CENTERS } from '../utils/constants';

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
    vendorType: 'Manufacturer',
    plantName: '',
    plantCapacity: '',
    capacityUnit: 'MWp',
    rate: '',
    poNumber: '',
    prNumber: '',
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
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>Vendor Details</h3>
            <div className="responsive-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Name *</label>
                <input required type="text" name="vendorName" className="premium-input vendor-modal-input" value={formData.vendorName} onChange={handleChange} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Vendor Type</label>
                <select name="vendorType" className="premium-input vendor-modal-input" value={formData.vendorType} onChange={handleChange}>
                  {['Manufacturer', 'Service Provider'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
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



const VendorPortfolioModal = ({ vendorName, onClose }) => {
  const { state } = useProcure();
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef(null);
  
  const [hoveredState, setHoveredState] = useState(null);
  
  const portfolio = useMemo(() => {
    const projects = state.vendors.filter(v => v.vendorName === vendorName);
    const totalCapacity = projects.reduce((sum, v) => sum + (Number(v.plantCapacity) || 0), 0);
    const avgRate = projects.reduce((sum, v) => sum + (Number(v.rate) || 0), 0) / (projects.length || 1);
    
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
      totalCapacity,
      avgRate: avgRate.toFixed(2),
      primaryUnit: projectsWithCoords.length > 0 ? projectsWithCoords[0].capacityUnit : 'MWp',
      primaryRegion: projectsWithCoords.length > 0 ? projectsWithCoords[0].region : null
    };
  }, [state.vendors, vendorName]);

  const vendorSpecificChartData = useMemo(() => {
    if (!portfolio || !portfolio.projects) return [];
    return portfolio.projects.map(p => ({
      name: p.plantName,
      fullName: p.plantName,
      capacity: Number(p.plantCapacity) || 0,
      rate: Number(p.rate) || 0
    }));
  }, [portfolio.projects]);

  if (!vendorName) return null;

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Vendor Report');
      const dashSheet = workbook.addWorksheet('Dashboard');

      // Add Title Row
      const titleRow = worksheet.addRow([`Vendor Portfolio Report: ${vendorName}`]);
      worksheet.mergeCells('A1:L1');
      titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      worksheet.addRow([]); // Empty row for spacing

      // Add Headers
      const headers = ['Vendor Code', 'Vendor Name', 'Plant Name', 'Capacity', 'Region', 'City', 'PO No', 'PR No', 'Starting Date', 'Ending Date', 'Escalation Ratio', 'Status'];
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add Data
      portfolio.projects.forEach(p => {
        const escalation = p.previousRate ? (Number(p.rate) - Number(p.previousRate)).toFixed(2) : 0;
        const row = worksheet.addRow([
          p.vendorCode,
          p.vendorName,
          p.plantName,
          `${p.plantCapacity} ${p.capacityUnit}`,
          p.region,
          p.city,
          p.poNumber,
          p.prNumber,
          new Date(p.contractStart).toLocaleDateString(),
          new Date(p.contractEnd).toLocaleDateString(),
          `₹${escalation}`,
          p.status
        ]);
        row.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // Add Borders & Column Widths
      worksheet.columns.forEach((column) => {
        column.width = 20;
      });
      
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 2) return; // Skip empty row
        row.eachCell({ includeEmpty: false }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
             <div>
               <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#111827', fontWeight: 600 }}>Regional Presence</h3>
               <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
                 <IndiaMap 
                   selectedRegion={portfolio.primaryRegion} 
                   onRegionClick={() => {}} 
                   hoveredState={hoveredState}
                   setHoveredState={setHoveredState}
                   vendors={portfolio.projects} 
                   focusedVendor={null} 
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

          <div style={{ marginTop: '3rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#111827', fontWeight: 600 }}>Active Plants & Contracts</h3>
            <div className="table-container">
              <table className="premium-table" style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent' }}>Plant & References</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent' }}>Location</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent' }}>Capacity</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent' }}>Rate</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent' }}>Contract Period</th>
                    <th style={{ color: '#4b5563', borderBottom: '2px solid #e2e8f0', background: 'transparent' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.projects.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0', background: 'transparent' }}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.plantName}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>PO: {p.poNumber} | PR: {p.prNumber}</div>
                      </td>
                      <td>
                        <div style={{ color: '#0f172a' }}>{p.city ? `${p.city}, ` : ''}{p.state}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{p.region} Region</div>
                      </td>
                      <td style={{ color: '#0f172a', fontWeight: 500 }}>{p.plantCapacity} {p.capacityUnit}</td>
                      <td style={{ color: '#0f172a', fontWeight: 500 }}>₹{p.rate}</td>
                      <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        {new Date(p.contractStart).toLocaleDateString()} - <br/>
                        <strong style={{ color: '#0f172a' }}>{new Date(p.contractEnd).toLocaleDateString()}</strong>
                      </td>
                      <td>
                        <span className={`status-pill ${p.status === 'Active' ? 'status-active' : p.status === 'Expiring Soon' ? 'status-warning' : 'status-danger'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
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
  const [portfolioVendor, setPortfolioVendor] = useState(null);

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

  const overallChartData = useMemo(() => {
    const vendorMap = {};
    state.vendors.forEach(v => {
      if (!vendorMap[v.vendorName]) {
        vendorMap[v.vendorName] = { name: v.vendorName, capacity: 0, totalRate: 0, count: 0 };
      }
      vendorMap[v.vendorName].capacity += Number(v.plantCapacity) || 0;
      vendorMap[v.vendorName].totalRate += Number(v.rate) || 0;
      vendorMap[v.vendorName].count += 1;
    });

    return Object.values(vendorMap).map(v => ({
      name: v.name.split(' ')[0],
      fullName: v.name,
      capacity: v.capacity,
      rate: Number((v.totalRate / v.count).toFixed(2))
    }));
  }, [state.vendors]);

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
      <div className="animate-stagger mobile-flex-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Vendor Registry</h1>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Manage and oversee all vendor contracts.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', width: '100%', overflowX: 'auto' }}>
          <button onClick={handleExportCSV} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <Download size={18} /> Export CSV
          </button>
          <button onClick={() => setShowDrawer(true)} className="btn-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <Plus size={18} /> New Vendor
          </button>
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
                tickFormatter={(val) => `${val}kWp`} 
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
                  if (name === "Total Capacity") return [`${value} kWp`, name];
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

      {portfolioVendor && (
        <VendorPortfolioModal 
          vendorName={portfolioVendor} 
          onClose={() => setPortfolioVendor(null)} 
        />
      )}
    </div>
  );
};

export default Vendors;
