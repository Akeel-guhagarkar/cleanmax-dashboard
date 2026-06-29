import React, { useMemo } from 'react';
import { useProcure } from '../context/ProcureContext';
import { Building2, FileText, Zap, IndianRupee, AlertTriangle, TrendingUp } from 'lucide-react';

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

const Dashboard = ({ setCurrentTab, setVendorFilter }) => {
  const { state, showToast } = useProcure();
  
  const metrics = useMemo(() => {
    const total = state.vendors.length;
    const active = state.vendors.filter(v => v.status === 'Active').length;
    const totalCapacity = state.vendors.reduce((sum, v) => sum + Number(v.plantCapacity), 0);
    const avgRate = state.vendors.length ? (state.vendors.reduce((sum, v) => sum + Number(v.rate), 0) / state.vendors.length) : 0;
    const expiring = state.vendors.filter(v => v.status === 'Expiring Soon').length;
    
    return { total, active, totalCapacity: totalCapacity.toFixed(1), avgRate: avgRate.toFixed(2), expiring };
  }, [state.vendors]);

  const handleExportReport = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Vendors', metrics.total],
      ['Active Contracts', metrics.active],
      ['Total Capacity (kWp)', metrics.totalCapacity],
      ['Average Rate (INR)', metrics.avgRate],
      ['Expiring Soon', metrics.expiring]
    ];
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_report_${new Date().getTime()}.csv`;
    a.click();
    showToast('Report generated successfully', 'success');
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* True Seamless Integrated Banner Layer */}
      <div style={{ 
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
        <button onClick={handleExportReport} className="btn-premium mobile-w-full" style={{ boxShadow: 'var(--shadow-float)' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <KPICard title="Total Capacity" value={`${metrics.totalCapacity} kWp`} subtitle="+12% from last month" icon={Zap} isAccent={true} delay={1} />
        <KPICard title="Total Vendors" value={metrics.total} subtitle="3 new this week" icon={Building2} delay={2} />
        <KPICard title="Active Contracts" value={metrics.active} icon={FileText} delay={3} />
        <KPICard title="Avg Rate (per kWp INR)" value="₹32" icon={IndianRupee} delay={4} />
      </div>

      <div className="glass-panel animate-stagger delay-4" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Recent Onboarded Vendors</h2>
          <button onClick={() => setCurrentTab('vendors')} className="btn-ghost">View All</button>
        </div>
        
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
            {state.vendors.slice(0, 5).map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 600 }}>{v.vendorCode}</td>
                <td>{v.vendorName}</td>
                <td className="text-secondary">{v.region}</td>
                <td style={{ fontWeight: 600 }}>{v.plantCapacity} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.capacityUnit}</span></td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
