import React, { useState, useMemo } from 'react';
import { useProcure } from '../context/ProcureContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';

// Updated Vibrant Premium Color Palette
const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#A28CFE'];
const STATUS_COLORS = { 'Active': '#00C49F', 'Expiring Soon': '#FFBB28', 'Expired': '#FF8042' };

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } }
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
  </defs>
);

const Analytics = () => {
  const { state } = useProcure();
  const [activeTab, setActiveTab] = useState('Overview');

  const regionData = useMemo(() => {
    const data = {};
    state.vendors.forEach(v => {
      const region = v.region || 'Unknown';
      if (!data[region]) data[region] = { name: region, count: 0, capacity: 0 };
      data[region].count += 1;
      data[region].capacity += (Number(v.plantCapacity) || 0);
    });
    return Object.values(data).sort((a, b) => b.capacity - a.capacity);
  }, [state.vendors]);

  const statusData = useMemo(() => {
    const data = { 'Active': 0, 'Expiring Soon': 0, 'Expired': 0 };
    state.vendors.forEach(v => {
      if (data[v.status] !== undefined) data[v.status] += 1;
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] })).filter(d => d.value > 0);
  }, [state.vendors]);

  const rateTrendData = useMemo(() => {
    const sorted = [...state.vendors].sort((a, b) => new Date(a.contractStart) - new Date(b.contractStart));
    return sorted.map(v => ({
      name: v.vendorCode,
      rate: v.rate,
      date: new Date(v.contractStart).toLocaleDateString()
    }));
  }, [state.vendors]);

  const rateCapacityData = useMemo(() => {
    return state.vendors.map(v => ({
      name: v.vendorName,
      rate: v.rate,
      capacity: Number(v.plantCapacity)
    }));
  }, [state.vendors]);

  const topVendorsData = useMemo(() => {
    return [...state.vendors]
      .sort((a, b) => {
        const capA = Number(a.plantCapacity) || 0;
        const capB = Number(b.plantCapacity) || 0;
        return capB - capA;
      })
      .slice(0, 5)
      .map(v => ({
        name: v.vendorName,
        capacity: Number(v.plantCapacity) || 0
      }));
  }, [state.vendors]);

  const capacityStatusData = useMemo(() => {
    const regions = {};
    state.vendors.forEach(v => {
      const region = v.region || 'Unknown';
      if (!regions[region]) regions[region] = { name: region, 'Active': 0, 'Expiring Soon': 0, 'Expired': 0, total: 0 };
      const cap = Number(v.plantCapacity) || 0;
      if (regions[region][v.status] !== undefined) {
        regions[region][v.status] += cap;
        regions[region].total += cap;
      }
    });
    return Object.values(regions).sort((a, b) => b.total - a.total);
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
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}
            >
              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Vendors by Region</h3>
                <div style={{ height: 450 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={regionData} dataKey="count" nameKey="name" 
                        cx="50%" cy="50%" innerRadius={80} outerRadius={120} 
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
                <div style={{ height: 450 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={statusData} dataKey="value" nameKey="name" 
                        cx="50%" cy="50%" outerRadius={120} stroke="none"
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
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}
            >
              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Rate Trends Over Time (₹/unit)</h3>
                <div style={{ height: 450 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rateTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <ChartDefs />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} dx={-10} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="rate" stroke="#00C49F" strokeWidth={4} fill="url(#colorGreen)" animationDuration={1500} activeDot={{ r: 8, fill: '#00C49F', stroke: '#fff', strokeWidth: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Rate vs Capacity Correlation</h3>
                <div style={{ height: 450 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                      <XAxis type="number" dataKey="capacity" name="Capacity" unit=" kWp" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis type="number" dataKey="rate" name="Rate" unit=" ₹" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} dx={-10} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                      <ZAxis type="number" range={[100, 500]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-color)' }} content={<CustomTooltip />} />
                      <Scatter name="Vendors" data={rateCapacityData} fill="#FFBB28" animationDuration={1500}>
                        {rateCapacityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#FFBB28" />
                        ))}
                      </Scatter>
                    </ScatterChart>
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
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}
            >
              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Capacity by Region (kWp)</h3>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
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

              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Top Vendors by Capacity (kWp)</h3>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topVendorsData} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                      <ChartDefs />
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.5} />
                      <XAxis type="number" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 600}} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--border-highlight)'}}/>
                      <Bar dataKey="capacity" fill="url(#colorOrange)" radius={[0, 8, 8, 0]} barSize={32} animationDuration={1500}>
                        <LabelList dataKey="capacity" position="right" style={{ fill: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Capacity Risk by Region (kWp)</h3>
                <div style={{ height: 450 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capacityStatusData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis type="number" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)', fontWeight: 500}} axisLine={false} tickLine={false} />
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
