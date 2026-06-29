import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useProcure } from '../context/ProcureContext';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const STATE_TO_REGION = {
  // North
  'Jammu and Kashmir': 'North', 'Himachal Pradesh': 'North', 'Punjab': 'North', 'Chandigarh': 'North',
  'Uttaranchal': 'North', 'Haryana': 'North', 'Delhi': 'North', 'Uttar Pradesh': 'North',
  
  // West
  'Rajasthan': 'West', 'Gujarat': 'West', 'Maharashtra': 'West', 'Goa': 'West', 'Dadra and Nagar Haveli': 'West', 'Daman and Diu': 'West',
  
  // Central
  'Madhya Pradesh': 'Central', 'Chhattisgarh': 'Central',
  
  // East & North East
  'Bihar': 'East', 'Jharkhand': 'East', 'Orissa': 'East', 'West Bengal': 'East', 'Sikkim': 'East',
  'Assam': 'East', 'Arunachal Pradesh': 'East', 'Nagaland': 'East', 'Manipur': 'East', 'Mizoram': 'East',
  'Tripura': 'East', 'Meghalaya': 'East',
  
  // South
  'Andhra Pradesh': 'South', 'Karnataka': 'South', 'Kerala': 'South', 'Tamil Nadu': 'South',
  'Puducherry': 'South', 'Andaman and Nicobar': 'South', 'Lakshadweep': 'South'
};

const REGION_COLORS = {
  'North': 'var(--region-north)',
  'West': 'var(--region-west)',
  'Central': 'var(--region-central)',
  'East': 'var(--region-east)',
  'South': 'var(--region-south)',
  'Unknown': '#cbd5e1'
};

const REGION_CENTERS = {
  'North': [77, 28.5],
  'West': [72, 22.5],
  'Central': [79, 23.5],
  'East': [85, 24.5],
  'South': [78, 14.5]
};

const MapController = ({ selectedRegion, focusedVendor }) => {
  const map = useMap();
  useEffect(() => {
    if (focusedVendor && focusedVendor.lat && focusedVendor.lng) {
      map.flyTo([focusedVendor.lat, focusedVendor.lng], 10, {
        animate: true,
        duration: 1.8,
        easeLinearity: 0.2
      });
    } else if (selectedRegion && REGION_CENTERS[selectedRegion]) {
      const [lng, lat] = REGION_CENTERS[selectedRegion];
      map.flyTo([lat, lng], 6.5, {
        animate: true,
        duration: 1.8,
        easeLinearity: 0.2
      });
    } else {
      map.flyTo([22, 80.5], 4.5, {
        animate: true,
        duration: 1.8,
        easeLinearity: 0.2
      });
    }
  }, [selectedRegion, focusedVendor, map]);
  return null;
};

const createVendorIcon = (region) => {
  const color = REGION_COLORS[region] || '#fff';
  return L.divIcon({
    className: 'custom-vendor-icon',
    html: `<div style="
             width: 14px; height: 14px;
             background: ${color};
             border: 2px solid white;
             border-radius: 50%;
             box-shadow: 0 0 10px ${color}, 0 0 20px ${color};
             animation: pulse 2s infinite;
           ">
           </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10]
  });
};

const IndiaMap = ({ selectedRegion, onRegionClick, hoveredState, setHoveredState, vendors, focusedVendor }) => {
  const [geoData, setGeoData] = useState(null);
  const geoJsonRef = useRef(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}india.json`)
      .then(res => res.json())
      .then(data => setGeoData(data));
  }, []);

  const style = (feature) => {
    const stateName = feature.properties.NAME_1;
    const regionName = STATE_TO_REGION[stateName] || 'Unknown';
    const isSelected = selectedRegion === regionName;
    
    return {
      fillColor: REGION_COLORS[regionName],
      weight: 1,
      opacity: 1,
      color: 'rgba(255,255,255,0.5)',
      fillOpacity: selectedRegion ? (isSelected ? 0.6 : 0.1) : 0.35,
      className: 'leaflet-interactive-region'
    };
  };

  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.eachLayer(layer => {
        geoJsonRef.current.resetStyle(layer);
      });
    }
  }, [selectedRegion]);

  const onEachFeature = (feature, layer) => {
    const stateName = feature.properties.NAME_1;
    const regionName = STATE_TO_REGION[stateName] || 'Unknown';
    
    layer.on({
      mouseover: (e) => {
        setHoveredState({ name: stateName, region: regionName });
        const l = e.target;
        l.setStyle({
          weight: 2,
          color: '#FFF',
          fillOpacity: 0.8
        });
        l.bringToFront();
      },
      mouseout: (e) => {
        setHoveredState(null);
        geoJsonRef.current?.resetStyle(e.target);
      },
      click: () => {
        onRegionClick(regionName);
      }
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      
      {/* Tooltip for hover */}
      {hoveredState && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-float)',
          border: '1px solid var(--border-color)',
          zIndex: 1000,
          pointerEvents: 'none',
          animation: 'fadeScaleUp 0.2s var(--ease-spring)'
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{hoveredState.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Region: <span style={{ color: REGION_COLORS[hoveredState.region], fontWeight: 700 }}>{hoveredState.region}</span></div>
        </div>
      )}

      <MapContainer 
        center={[22, 80.5]} 
        zoom={4.5} 
        style={{ width: '100%', height: '100%', background: '#0a0a0a', borderRadius: 'var(--radius-xl)' }}
        zoomControl={true}
        minZoom={4}
      >
        <MapController selectedRegion={selectedRegion} focusedVendor={focusedVendor} />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri'
        />
        {geoData && (
          <GeoJSON
            ref={geoJsonRef}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
        
        {vendors.map(vendor => {
          if (selectedRegion !== vendor.region) return null;
          return vendor.lat && vendor.lng && (
            <Marker 
              key={vendor.id} 
              position={[vendor.lat, vendor.lng]}
              icon={createVendorIcon(vendor.region)}
            >
              <Popup className="premium-popup" closeButton={false}>
                <div style={{ padding: '0.25rem', minWidth: '220px' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: REGION_COLORS[vendor.region], fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: REGION_COLORS[vendor.region], boxShadow: `0 0 8px ${REGION_COLORS[vendor.region]}` }} />
                    {vendor.region} Region {vendor.state ? `• ${vendor.state}` : ''}
                  </div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{vendor.plantName}</h4>
                  <div style={{ background: 'var(--bg-app)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                    <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Vendor: <strong style={{ color: 'var(--text-primary)' }}>{vendor.vendorName}</strong></p>
                    <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Capacity: <strong style={{ color: 'var(--text-primary)' }}>{vendor.plantCapacity} {vendor.capacityUnit}</strong> at ₹{vendor.rate}/unit</p>
                  </div>
                  <span className={`status-pill ${vendor.status === 'Active' ? 'status-active' : vendor.status === 'Expiring Soon' ? 'status-warning' : 'status-danger'}`} style={{ width: '100%', justifyContent: 'center' }}>
                    {vendor.status}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

const RegionMap = () => {
  const { state } = useProcure();
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [focusedVendor, setFocusedVendor] = useState(null);

  const filteredVendors = useMemo(() => {
    return state.vendors.map((v, i) => {
      // If a vendor doesn't have coordinates, place them around the region center
      if (!v.lat || !v.lng) {
        const center = REGION_CENTERS[v.region] || [79, 23.5]; // Default to central
        const offsetLng = (i % 5) * 0.8 - 1.6;
        const offsetLat = (i % 3) * 0.8 - 0.8;
        return { ...v, lat: center[1] + offsetLat, lng: center[0] + offsetLng };
      }
      return v;
    }).filter(v => statusFilter === 'All' || v.status === statusFilter);
  }, [state.vendors, statusFilter]);

  const regionStats = useMemo(() => {
    const stats = {};
    Object.keys(REGION_COLORS).forEach(r => {
      if (r !== 'Unknown') stats[r] = { vendors: [], capacity: 0 };
    });
    
    state.vendors.forEach(v => {
      if (stats[v.region]) {
        stats[v.region].vendors.push(v);
        stats[v.region].capacity += Number(v.plantCapacity);
      }
    });
    return stats;
  }, [state.vendors]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div className="animate-stagger">
        <h1 style={{ fontSize: '2rem' }}>Geographic Distribution</h1>
        <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Interactive map of your vendor assets across India.</p>
      </div>

      <div className="animate-stagger delay-1" style={{ display: 'flex', flex: 1, gap: '2rem', minHeight: 0 }}>
        {/* Map Container */}
        <div className="glass-panel" style={{ flex: 2, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative' }}>
          
          <div style={{ position: 'absolute', top: '20px', left: '60px', zIndex: 400, display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', backdropFilter: 'blur(16px)', padding: '0.35rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-float)', border: '1px solid var(--border-color)' }}>
            {['All', 'Active', 'Expiring Soon', 'Expired'].map(f => (
              <button 
                key={f}
                onClick={(e) => { e.stopPropagation(); setStatusFilter(f); }}
                style={{
                  background: statusFilter === f ? 'var(--accent-gradient)' : 'transparent',
                  color: statusFilter === f ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  boxShadow: statusFilter === f ? '0 4px 15px var(--accent-glow)' : 'none',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 400 }} />
          
          <IndiaMap 
            selectedRegion={selectedRegion} 
            onRegionClick={(r) => { setSelectedRegion(selectedRegion === r ? null : r); setFocusedVendor(null); }} 
            hoveredState={hoveredState}
            setHoveredState={setHoveredState}
            vendors={filteredVendors}
            focusedVendor={focusedVendor}
          />
        </div>

        {/* Legend / Details Drawer */}
        <div className="glass-panel slide-in-drawer delay-2" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', padding: '2rem' }}>
          
          {focusedVendor ? (
            <div className="animate-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
              <button onClick={() => setFocusedVendor(null)} className="btn-ghost" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to {selectedRegion} Vendors
              </button>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: REGION_COLORS[focusedVendor.region], boxShadow: `0 0 10px ${REGION_COLORS[focusedVendor.region]}` }} />
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: REGION_COLORS[focusedVendor.region], fontWeight: 800 }}>{focusedVendor.region} Region {focusedVendor.state ? `• ${focusedVendor.state}` : ''}</span>
                </div>
                
                <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>{focusedVendor.plantName}</h2>
                
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', marginTop: '1rem' }}>
                  <div className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Operating Vendor</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{focusedVendor.vendorName}</div>
                  
                  <div className="responsive-grid" style={{ gap: '1.5rem' }}>
                    <div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Capacity</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{focusedVendor.plantCapacity} {focusedVendor.capacityUnit}</div>
                    </div>
                    <div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PPA Rate</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>₹{focusedVendor.rate}/unit</div>
                    </div>
                    <div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <span className={`status-pill ${focusedVendor.status === 'Active' ? 'status-active' : focusedVendor.status === 'Expiring Soon' ? 'status-warning' : 'status-danger'}`}>
                          {focusedVendor.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PO Number</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '0.5rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{focusedVendor.poNumber}</div>
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', marginTop: '0.5rem' }}>
                  <div className="text-secondary" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Contract Timeline</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Start Date</span>
                      <strong style={{ fontSize: '0.9rem' }}>{new Date(focusedVendor.contractStart).toLocaleDateString()}</strong>
                    </div>
                    <div style={{ height: 1, background: 'var(--border-color)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-secondary" style={{ fontSize: '0.9rem' }}>End Date</span>
                      <strong style={{ fontSize: '0.9rem', color: focusedVendor.status === 'Active' ? 'inherit' : 'var(--accent-color)' }}>{new Date(focusedVendor.contractEnd).toLocaleDateString()}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedRegion ? (
            <div className="animate-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '4px', backgroundColor: REGION_COLORS[selectedRegion], boxShadow: `0 0 10px ${REGION_COLORS[selectedRegion]}` }} />
                  <h3 style={{ fontSize: '1.5rem' }}>{selectedRegion} Region</h3>
                </div>
                <button onClick={() => { setSelectedRegion(null); setFocusedVendor(null); }} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>Close</button>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: REGION_COLORS[selectedRegion] }}>{regionStats[selectedRegion].vendors.length}</div>
                  <div className="text-secondary" style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendors</div>
                </div>
                <div style={{ flex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: REGION_COLORS[selectedRegion] }}>{regionStats[selectedRegion].capacity.toFixed(1)}</div>
                  <div className="text-secondary" style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Capacity (kWp)</div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                <h4 style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendors in {selectedRegion}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {regionStats[selectedRegion].vendors.map((v, i) => (
                    <div 
                      key={v.id} 
                      onClick={() => setFocusedVendor(v)}
                      className={`animate-stagger delay-${(i % 4) + 1}`} 
                      style={{ 
                        padding: '1rem', 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        transition: 'all var(--transition-fast)',
                        cursor: 'pointer'
                      }} 
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = REGION_COLORS[v.region]; }} 
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{v.vendorName}</div>
                        <div className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.plantCapacity} {v.capacityUnit}</span>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }}></span>
                          <span>₹{v.rate}/unit</span>
                          {v.state && (
                            <>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }}></span>
                              <span>{v.state}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`status-pill ${v.status === 'Active' ? 'status-active' : v.status === 'Expiring Soon' ? 'status-warning' : 'status-danger'}`} style={{ transform: 'scale(0.85)' }}>
                        {v.status}
                      </span>
                    </div>
                  ))}
                  {regionStats[selectedRegion].vendors.length === 0 && (
                    <div className="text-secondary" style={{ textAlign: 'center', padding: '2rem 0', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                      No vendors found in this region.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-stagger" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Region Overview</h3>
              <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '2rem' }}>Select any region on the map for detailed metrics.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.keys(REGION_COLORS).filter(r => r !== 'Unknown').map((region, i) => (
                  <div 
                    key={region}
                    onClick={() => setSelectedRegion(region)}
                    className={`animate-stagger delay-${(i % 4) + 1}`}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '1.25rem', 
                      background: 'var(--bg-primary)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = 'var(--shadow-float)'; e.currentTarget.style.borderColor = REGION_COLORS[region]; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: REGION_COLORS[region] }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{region}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800 }}>{regionStats[region].vendors.length}</div>
                        <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendors</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800 }}>{regionStats[region].capacity.toFixed(0)}</div>
                        <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>kWp</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegionMap;
