import React, { useMemo, useState } from 'react';
import { useProcure } from '../context/ProcureContext';
import { Building2, FileText, Zap, IndianRupee, AlertTriangle, TrendingUp, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import ExcelJS from 'exceljs';
import { normalizeStatus, getStatusClass, getCapacityInMW } from '../utils/constants';

const KPICard = ({ title, value, subtitle, icon: Icon, delay, isAccent }) => (
  <div className={`glass-panel animate-stagger delay-${delay}`} style={{ 
    padding: '1.5rem', 
    display: 'flex', 
    alignItems: 'flex-start', 
    justifyContent: 'space-between',
    background: isAccent ? 'var(--accent-gradient)' : 'var(--bg-card)',
    color: isAccent ? '#fff' : 'inherit'
  }}>
    <div>
      <div style={{ color: isAccent ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem', fontSize: '0.875rem', color: isAccent ? '#fff' : '#10b981', fontWeight: 500 }}>
          <TrendingUp size={16} /> {subtitle}
        </div>
      )}
    </div>
    <div style={{ 
      padding: '1rem', 
      borderRadius: 'var(--radius-lg)', 
      background: isAccent ? 'rgba(255,255,255,0.2)' : 'var(--bg-primary)',
      color: isAccent ? '#fff' : 'var(--accent-color)'
    }}>
      <Icon size={28} />
    </div>
  </div>
);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Dashboard = ({ setCurrentTab, setVendorFilter }) => {
  const { state, showToast } = useProcure();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const metrics = useMemo(() => {
    const uniqueVendors = new Set(state.vendors.map(v => v.vendorCode).filter(Boolean));
    const total = uniqueVendors.size;
    
    const activeVendors = new Set(state.vendors.filter(v => normalizeStatus(v.status) === 'active').map(v => v.vendorCode).filter(Boolean));
    const active = activeVendors.size;
    
    const expiring = state.vendors.filter(v => normalizeStatus(v.status) === 'expiring soon').length;
    
    const totalCapacity = state.vendors.reduce((sum, v) => sum + getCapacityInMW(v.plantCapacity, v.capacityUnit), 0);
    const avgRate = state.vendors.length ? (state.vendors.reduce((sum, v) => sum + Number(v.rate || 0), 0) / state.vendors.length) : 0;
    
    return { total, active, totalCapacity: totalCapacity.toFixed(2), avgRate: avgRate.toFixed(2), expiring };
  }, [state.vendors]);

  const handleExportExcel = async () => {
    if (selectedMonth === null) {
      showToast('Please select a month', 'error');
      return;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
      showToast('No data available for future dates', 'error');
      return;
    }

    const reportDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CleanMax Analytics';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet(`Vendor Report - ${reportDate}`);

      // Premium Title Row (Merged Cells A1 to O2)
      worksheet.mergeCells('A1:O2');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `CLEANMAX VENDOR PORTFOLIO REPORT - ${MONTHS[selectedMonth].toUpperCase()} ${selectedYear}`;
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Dark modern slate background
      };

      // Header Row (Row 3)
      const headers = [
        'Vendor Code', 'Vendor Name', 'Type', 'Region', 'State', 'City',
        'Plant Name', 'Capacity', 'Rate (INR)', 'Previous Rate',
        'PO Number', 'PR Number', 'Status', 'Contract Start', 'Contract End'
      ];
      worksheet.getRow(3).values = headers;

      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' } // Green accent color
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Column Widths
      const columnWidths = [15, 25, 15, 15, 15, 15, 25, 15, 15, 15, 20, 20, 15, 15, 15];
      columnWidths.forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
        worksheet.getColumn(index + 1).alignment = { vertical: 'middle' };
      });

      // Freeze header rows so when scrolling data, headers & title stay
      worksheet.views = [
        {state: 'frozen', xSplit: 0, ySplit: 3}
      ];

      // Add Data Rows
      state.vendors.forEach(v => {
        worksheet.addRow([
          v.vendorCode,
          v.vendorName,
          v.vendorType,
          v.region,
          v.state,
          v.city,
          v.plantName,
          `${v.plantCapacity} ${v.capacityUnit}`,
          v.rate,
          v.previousRate,
          v.poNumber,
          v.prNumber,
          v.status,
          new Date(v.contractStart).toLocaleDateString(),
          new Date(v.contractEnd).toLocaleDateString()
        ]);
      });

      // Add subtle alternating row colors for better readability
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 3) { // Skip title and header
          if (rowNumber % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' } // Very light slate/gray
            };
          }
          // Highlight Expiring or Expired statuses
          const statusCell = row.getCell(13); // Status column
          if (statusCell.value === 'Expiring Soon') {
            statusCell.font = { color: { argb: 'FFD97706' }, bold: true }; // Amber
          } else if (statusCell.value === 'Expired') {
            statusCell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Red
          } else {
            statusCell.font = { color: { argb: 'FF059669' }, bold: true }; // Green
          }
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CleanMax_Vendor_Report_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      showToast('Excel report generated successfully!', 'success');
      setIsReportModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Failed to generate Excel report', 'error');
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* True Seamless Integrated Banner Layer */}
      <div className="hero-banner-container" style={{ 
        position: 'relative',
        width: '100%', 
        /* Pulls the content below it UP significantly onto the image */
        marginBottom: '-9rem',
        zIndex: 0
      }}>
        <img 
          src={`${import.meta.env.BASE_URL}dashboard-hero-bg.png`} 
          alt="CleanMax Dashboard Banner"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            /* Longer, smoother fade gradient so it melts into the background perfectly */
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 98%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 98%)',
          }}
        />
      </div>

      {/* Welcome Text pulled up into the fade zone */}
      <div className="animate-stagger mobile-flex-col" style={{ 
        position: 'relative', 
        zIndex: 10, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: '3rem', 
        padding: '0 1rem',
        gap: '1rem'
      }}>
        <div style={{ textShadow: '0 4px 20px rgba(255,255,255,0.6)' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '0.25rem', color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Welcome back, <span className="text-gradient" style={{ textShadow: 'none' }}>{state.currentUser?.role === 'admin' ? 'Admin' : state.currentUser?.name?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="text-secondary" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
            Here is what's happening with your vendors today.
          </p>
        </div>
        <button onClick={() => setIsReportModalOpen(true)} className="btn-premium mobile-w-full" style={{ boxShadow: 'var(--shadow-float)' }}>
          Generate Report
        </button>
      </div>

      {metrics.expiring > 0 && (
        <div 
          className="glass-panel animate-stagger delay-1" 
          style={{ 
            borderLeft: '4px solid #f59e0b', 
            padding: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => {
            if (setVendorFilter) setVendorFilter('Expiring Soon');
            if (setCurrentTab) setCurrentTab('vendors');
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(245, 158, 11, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
        >
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '50%', color: '#f59e0b' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Action Required</h3>
            <p className="text-secondary">You have <strong>{metrics.expiring}</strong> contract(s) expiring within the next 30 days. Please review them immediately.</p>
          </div>
          <button className="btn-ghost" style={{ marginLeft: 'auto', pointerEvents: 'none' }}>View Contracts →</button>
        </div>
      )}

      <div className="kpi-grid">
        <KPICard title="Total Capacity" value={`${metrics.totalCapacity} MWp`} subtitle="Live metrics" icon={Zap} isAccent={true} delay={1} />
        <KPICard title="Total Vendors" value={metrics.total} subtitle="Active unique vendors" icon={Building2} delay={2} />
        <KPICard title="Active Contracts" value={metrics.active} icon={FileText} delay={3} />
        <KPICard title="Avg Rate (per kWp INR)" value={`₹${metrics.avgRate}`} icon={IndianRupee} delay={4} />
      </div>

      <div className="glass-panel animate-stagger delay-4" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Recent Onboarded Vendors</h2>
          <button onClick={() => setCurrentTab('vendors')} className="btn-ghost">View All</button>
        </div>
        
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Vendor Code</th>
                <th>Name</th>
                <th>Region</th>
                <th>Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...state.vendors]
                .sort((a, b) => {
                  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return dateB - dateA;
                })
                .slice(0, 5)
                .map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{v.vendorCode}</td>
                  <td>{v.vendorName}</td>
                  <td className="text-secondary">{v.region}</td>
                  <td style={{ fontWeight: 600 }}>{v.plantCapacity} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.capacityUnit}</span></td>
                  <td>
                    <span className={`status-pill ${getStatusClass(v.status)}`}>
                      {normalizeStatus(v.status) === 'active' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>}
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                  Export Report
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
                  onClick={handleExportExcel} 
                  disabled={selectedMonth === null}
                  style={{
                    padding: '0.875rem 2rem',
                    fontSize: '1.05rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <FileText size={20} />
                  Download Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

