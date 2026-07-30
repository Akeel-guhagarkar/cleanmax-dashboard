import React, { useState, useMemo } from 'react';
import { useProcure } from '../context/ProcureContext';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeRegion, getCapacityInMW } from '../utils/constants';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  AreaChart, Area, ScatterChart, Scatter, ZAxis, ComposedChart, Line, LineChart, Brush
} from 'recharts';

// Updated Vibrant Premium Color Palette
const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#A28CFE'];
const STATUS_COLORS = { 'Active': '#00C49F', 'Completed': '#00C49F', 'Expiring Soon': '#FFBB28', 'In Progress': '#FFBB28', 'Expired': '#FF8042', 'Planning': '#FF8042' };

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.3, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.9 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.8, ease: "easeOut" } 
  }
};

// Premium Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.25rem',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-float)'
      }}>
        <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label || (payload[0] && payload[0].payload.name)}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
            <span style={{ 
              display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', 
              background: entry.color || entry.fill,
              boxShadow: `0 0 10px ${entry.color || entry.fill}`
            }}></span>
            {entry.name}: <span style={{ color: 'var(--text-primary)' }}>{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Label with lines pointing to slices
const renderCustomizedLabel = (props) => {
  const { cx, cy, midAngle, outerRadius, name, value, index, color } = props;
  const RADIAN = Math.PI / 180;
  // Increase distance from the chart
  const radius = outerRadius * 1.25; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  return (
    <text 
      x={x} 
      y={y} 
      fill={color} 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      style={{ fontWeight: 700, fontSize: '15px' }}
    >
      {`${name}: ${value}`}
    </text>
  );
};
// Custom Y-Axis tick for vendor names on a single unbroken line
const renderVendorYAxisTick = ({ x, y, payload }) => {
  const val = String(payload.value || '');
  const displayVal = val.length > 32 ? val.substring(0, 30) + '…' : val;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-10}
        y={4}
        textAnchor="end"
        fill="var(--text-secondary)"
        style={{ fontWeight: 600, fontSize: '12.5px', whiteSpace: 'nowrap' }}
      >
        {displayVal}
      </text>
    </g>
  );
};

// SVG Gradients for Charts
const ChartDefs = () => (
  <defs>
    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#00C49F" stopOpacity={0.0}/>
    </linearGradient>
    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#0088FE" stopOpacity={0.9}/>
      <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.6}/>
    </linearGradient>
    <linearGradient id="colorOrange" x1="0" y1="0" x2="1" y2="0">
      <stop offset="5%" stopColor="#FFBB28" stopOpacity={0.9}/>
      <stop offset="95%" stopColor="#d97706" stopOpacity={0.7}/>
    </linearGradient>
    <linearGradient id="rateTrendGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
    </linearGradient>
  </defs>
);

const Analytics = () => {
  const { state } = useProcure();
  const [activeTab, setActiveTab] = useState('Overview');

  const regionData = useMemo(() => {
    const data = {};
    (state.vendors || []).forEach(v => {
      const region = normalizeRegion(v.region, v.state, v.city);
      if (!data[region]) data[region] = { name: region, count: 0, capacity: 0 };
      data[region].count += 1;
      data[region].capacity += getCapacityInMW(v.plantCapacity, v.capacityUnit);
    });
    return Object.values(data).map(d => ({...d, capacity: Number(d.capacity.toFixed(2))})).sort((a, b) => b.capacity - a.capacity);
  }, [state.vendors]);

  const statusData = useMemo(() => {
    const data = { 'Active': 0, 'Expiring Soon': 0, 'Expired': 0 };
    (state.vendors || []).forEach(v => {
      if (data[v.status] !== undefined) data[v.status] += 1;
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] })).filter(d => d.value > 0);
  }, [state.vendors]);

  const rateTrendData = useMemo(() => {
    const allRecords = [];
    (state.vendors || []).forEach(v => {
      if (v.rate && v.contractStart && !isNaN(new Date(v.contractStart).getTime())) {
        allRecords.push({
          rawDate: new Date(v.contractStart),
          rate: Number(v.rate) || 0,
          plantName: v.plantName || v.vendorName,
          type: 'Active Contract'
        });
      }
    });
    (state.archivedContracts || []).forEach(a => {
      if (a.oldRate && a.oldContractStart && !isNaN(new Date(a.oldContractStart).getTime())) {
        allRecords.push({
          rawDate: new Date(a.oldContractStart),
          rate: Number(a.oldRate) || 0,
          plantName: a.plantName || a.oldVendorName,
          type: 'Archived Snapshot'
        });
      }
    });

    if (allRecords.length === 0) {
      return { chartData: [], metrics: { avg: 0, min: 0, max: 0, count: 0 } };
    }

    // Group by Year-Month
    const monthGroups = new Map();
    allRecords.forEach(rec => {
      const year = rec.rawDate.getFullYear();
      const monthIdx = rec.rawDate.getMonth();
      const sortKey = year * 100 + monthIdx;
      const monthLabel = rec.rawDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthGroups.has(sortKey)) {
        monthGroups.set(sortKey, {
          sortKey,
          date: monthLabel,
          rates: [],
          contractsCount: 0
        });
      }
      const group = monthGroups.get(sortKey);
      group.rates.push(rec.rate);
      group.contractsCount += 1;
    });

    const chartData = Array.from(monthGroups.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(group => {
        const avg = group.rates.reduce((sum, r) => sum + r, 0) / group.rates.length;
        const min = Math.min(...group.rates);
        const max = Math.max(...group.rates);
        return {
          date: group.date,
          'Avg Rate (₹/unit)': Number(avg.toFixed(2)),
          'Min Rate': Number(min.toFixed(2)),
          'Max Rate': Number(max.toFixed(2)),
          contracts: group.contractsCount
        };
      });

    const allRatesList = allRecords.map(r => r.rate);
    const overallAvg = allRatesList.reduce((sum, r) => sum + r, 0) / allRatesList.length;
    const overallMin = Math.min(...allRatesList);
    const overallMax = Math.max(...allRatesList);

    return {
      chartData,
      metrics: {
        avg: (overallAvg || 0).toFixed(2),
        min: (overallMin || 0).toFixed(2),
        max: (overallMax || 0).toFixed(2),
      }
    };
  }, [state.vendors, state.archivedContracts]);

  const rateCapacityData = useMemo(() => {
    const vendorMap = new Map();
    (state.vendors || []).forEach(v => {
      const name = v.vendorName || 'Unknown';
      const cap = getCapacityInMW(v.plantCapacity, v.capacityUnit);
      const rate = Number(v.rate) || 0;
      if (!vendorMap.has(name)) {
        vendorMap.set(name, { capacity: 0, totalRate: 0, count: 0 });
      }
      const existing = vendorMap.get(name);
      existing.capacity += cap;
      existing.totalRate += rate;
      existing.count += 1;
    });

    return Array.from(vendorMap.entries())
      .map(([name, data]) => ({
        name,
        shortName: name.length > 18 ? name.slice(0, 16) + '...' : name,
        'Total Capacity': Number(data.capacity.toFixed(2)),
        'Average Rate': Number((data.totalRate / data.count).toFixed(2))
      }))
      .filter(d => d['Total Capacity'] > 0 || d['Average Rate'] > 0)
      .sort((a, b) => b['Total Capacity'] - a['Total Capacity']);
  }, [state.vendors]);



  const topVendorsData = useMemo(() => {
    const vendorMap = new Map();
    (state.vendors || []).forEach(v => {
      const name = v.vendorName || 'Unknown';
      const cap = getCapacityInMW(v.plantCapacity, v.capacityUnit);
      if (!vendorMap.has(name)) {
        vendorMap.set(name, 0);
      }
      vendorMap.set(name, vendorMap.get(name) + cap);
    });

    return Array.from(vendorMap.entries())
      .map(([name, capacity]) => ({
        name,
        capacity: Number(capacity.toFixed(2))
      }))
      .sort((a, b) => b.capacity - a.capacity);
  }, [state.vendors]);

  const capacityStatusData = useMemo(() => {
    const regions = {};
    (state.vendors || []).forEach(v => {
      const region = normalizeRegion(v.region, v.state, v.city);
      if (!regions[region]) regions[region] = { name: region, 'Active': 0, 'Expiring Soon': 0, 'Expired': 0, total: 0 };
      const cap = getCapacityInMW(v.plantCapacity, v.capacityUnit);
      if (regions[region][v.status] !== undefined) {
        regions[region][v.status] += cap;
        regions[region].total += cap;
      }
    });
    return Object.values(regions).map(r => ({
      ...r,
      Active: Math.round(r.Active),
      'Expiring Soon': Math.round(r['Expiring Soon']),
      Expired: Math.round(r.Expired),
      total: Math.round(r.total)
    })).sort((a, b) => b.total - a.total);
  }, [state.vendors]);

  const tabs = ['Overview', 'Financials', 'Capacity'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingBottom: '3rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0, letterSpacing: '-0.03em' }}>Procurement Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>Interactive insights into vendors, capacity, and rates.</p>
        </div>
        
        {/* Sleek Tab Bar */}
        <div style={{ 
          display: 'flex', 
          background: 'var(--bg-card)', 
          backdropFilter: 'blur(16px)',
          borderRadius: '99px',
          padding: '0.35rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-float)'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                position: 'relative',
                padding: '0.75rem 1.75rem',
                borderRadius: '99px',
                border: 'none',
                background: 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'color 0.3s ease',
                zIndex: 1
              }}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'var(--accent-gradient)',
                    borderRadius: '99px',
                    zIndex: -1,
                    boxShadow: '0 0 20px var(--accent-glow)'
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content Area */}
      <div style={{ minHeight: '600px' }}>
        <AnimatePresence mode="wait">
          
          {activeTab === 'Overview' && (
            <motion.div
              key="Overview"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}
            >
              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Vendors by Region</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={regionData} dataKey="count" nameKey="name" 
                        cx="50%" cy="50%" innerRadius={60} outerRadius={100} 
                        paddingAngle={6} stroke="none"
                        animationDuration={1500} animationEasing="ease-out"
                        labelLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2, strokeDasharray: '3 3' }}
                        label={(props) => renderCustomizedLabel({ ...props, color: COLORS[props.index % COLORS.length] })}
                      >
                        {regionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Vendor Status Distribution</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={statusData} dataKey="value" nameKey="name" 
                        cx="50%" cy="50%" outerRadius={100} stroke="none"
                        animationDuration={1500} animationEasing="ease-out"
                        labelLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2, strokeDasharray: '3 3' }}
                        label={(props) => renderCustomizedLabel({ ...props, color: STATUS_COLORS[props.name] })}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'Financials' && (
            <motion.div
              key="Financials"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}
            >
              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Rate Trends Over Time (₹/unit)</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Monthly tariff escalation and average PPA rates across all contracts</p>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.4rem 0.9rem', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Rate</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>₹{rateTrendData.metrics.avg}</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.4rem 0.9rem', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Lowest Tariff</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>₹{rateTrendData.metrics.min}</div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.4rem 0.9rem', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Highest Tariff</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>₹{rateTrendData.metrics.max}</div>
                    </div>
                  </div>
                </div>

                <div className="chart-container" style={{ height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rateTrendData.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <ChartDefs />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500, fontSize: 12}} minTickGap={35} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} dy={10} />
                      <YAxis stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 600, fontSize: 12}} axisLine={false} tickLine={false} dx={-10} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Avg Rate (₹/unit)" stroke="#3b82f6" strokeWidth={3.5} fill="url(#rateTrendGlow)" activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#3b82f6' }} animationDuration={1500} />
                      <Brush dataKey="date" height={28} stroke="#3b82f6" fill="rgba(59, 130, 246, 0.08)" travellerWidth={12} tickFormatter={() => ''} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Rate & Capacity by Vendor</h3>
                <p style={{ margin: '0.25rem 0 1.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Overview of total capacity and average PPA rates across all registered vendors.
                </p>

                <div className="chart-container" style={{ height: '420px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rateCapacityData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <ChartDefs />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                      <XAxis dataKey="shortName" stroke="var(--text-secondary)" tick={false} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#f59e0b" tick={{fill: 'var(--text-secondary)', fontWeight: 500, fontSize: 12}} axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => `₹${val}`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" tick={{fill: 'var(--text-secondary)', fontWeight: 500, fontSize: 12}} axisLine={false} tickLine={false} dx={10} tickFormatter={(val) => `${val} MWp`} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontWeight: 600, fontSize: '0.9rem', paddingBottom: '10px' }} iconType="circle" />
                      <Bar yAxisId="right" dataKey="Total Capacity" name="Total Capacity" fill="url(#colorBlue)" radius={[6, 6, 0, 0]} barSize={36} animationDuration={1500} />
                      <Line yAxisId="left" type="monotone" dataKey="Average Rate" name="Average Rate" stroke="#f59e0b" strokeWidth={3.5} dot={{ r: 4, fill: '#000', stroke: '#f59e0b', strokeWidth: 2 }} activeDot={{ r: 7 }} animationDuration={1500} />
                      <Brush dataKey="name" height={24} stroke="#3b82f6" fill="rgba(59, 130, 246, 0.08)" travellerWidth={12} tickFormatter={() => ''} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'Capacity' && (
            <motion.div
              key="Capacity"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}
            >
              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Capacity by Region (MWp)</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                      <ChartDefs />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis type="number" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--border-highlight)'}}/>
                      <Bar dataKey="capacity" fill="url(#colorBlue)" radius={[8, 8, 0, 0]} animationDuration={1500}>
                        <LabelList dataKey="capacity" position="top" style={{ fill: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Top Vendors by Capacity (MWp)</h3>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.3rem 0.8rem', borderRadius: '99px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    Showing all {topVendorsData.length} vendors (Scroll to view)
                  </span>
                </div>
                <div style={{ maxHeight: '520px', overflowY: 'auto', paddingRight: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <div style={{ height: `${Math.max(450, topVendorsData.length * 44)}px`, width: '100%', maxWidth: '1100px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topVendorsData} layout="vertical" margin={{ top: 15, right: 80, left: 250, bottom: 15 }}>
                          <ChartDefs />
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.5} />
                          <XAxis type="number" allowDecimals={false} stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" width={250} stroke="var(--text-secondary)" tick={renderVendorYAxisTick} axisLine={false} tickLine={false} interval={0} />
                          <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--border-highlight)'}}/>
                          <Bar dataKey="capacity" fill="url(#colorOrange)" radius={[0, 8, 8, 0]} barSize={24} animationDuration={1500}>
                            <LabelList dataKey="capacity" position="right" style={{ fill: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Capacity Risk by Region (MWp)</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capacityStatusData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis type="number" allowDecimals={false} stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} tickFormatter={(val) => Math.round(val)} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--border-highlight)'}}/>
                      <Legend wrapperStyle={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem', paddingTop: '20px' }} iconType="circle" />
                      <Bar dataKey="Active" stackId="a" fill="#00C49F" animationDuration={1500} />
                      <Bar dataKey="Expiring Soon" stackId="a" fill="#FFBB28" animationDuration={1500} />
                      <Bar dataKey="Expired" stackId="a" fill="#FF8042" radius={[8, 8, 0, 0]} animationDuration={1500} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Analytics;


