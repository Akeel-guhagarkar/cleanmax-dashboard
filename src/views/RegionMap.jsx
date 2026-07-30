import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useProcure } from '../context/ProcureContext';
import { ChevronLeft, ChevronRight, Sliders, List, Search, MapPin, Zap, ExternalLink } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { STATE_TO_REGION, REGION_COLORS, REGION_CENTERS, getStatusClass, getCapacityInMW, normalizeRegion } from '../utils/constants';
import 'leaflet/dist/leaflet.css';
import { createContainerComponent, useLeafletContext } from '@react-leaflet/core';
import 'leaflet.markercluster';

function useMarkerClusterGroup(props) {
  const context = useLeafletContext();
  const instanceRef = useRef();

  if (!instanceRef.current) {
    // Extract clusterRef so it doesn't get passed to Leaflet as an option
    const { children, clusterRef, ...options } = props;
    const instance = new L.markerClusterGroup(options);
    // Expose the raw Leaflet cluster instance for external use
    if (clusterRef) clusterRef.current = instance;
    instanceRef.current = {
      instance,
      context: { ...context, layerContainer: instance },
    };
  }

  const { instance } = instanceRef.current;

  useEffect(() => {
    const container = context.layerContainer ?? context.map;
    container.addLayer(instance);
    return () => {
      container.removeLayer(instance);
    };
  }, [context.layerContainer, context.map, instance]);

  return instanceRef;
}

const MarkerClusterGroup = createContainerComponent(useMarkerClusterGroup);

const MapController = ({ selectedRegion, focusedVendor }) => {
  const map = useMap();
  useEffect(() => {
    if (focusedVendor && focusedVendor.lat && focusedVendor.lng) {
      map.flyTo([focusedVendor.lat, focusedVendor.lng], 13, {
        animate: true,
        duration: 1.8,
        easeLinearity: 0.15
      });
    } else if (selectedRegion && REGION_CENTERS[selectedRegion]) {
      const [lng, lat] = REGION_CENTERS[selectedRegion];
      const targetZoom = selectedRegion === 'South' ? 5.8 : selectedRegion === 'North' ? 6.2 : 6.0;
      map.flyTo([lat, lng], targetZoom, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.2
      });
    } else {
      map.flyTo([19.8, 78.5], 4.2, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.2
      });
    }
  }, [selectedRegion, focusedVendor, map]);
  return null;
};

// Listens for flyTo end then uses zoomToShowLayer to break clusters and open popup
const PopupController = ({ focusedVendor, clusterRef, markerRefsMap }) => {
  const map = useMap();

  useEffect(() => {
    if (!focusedVendor) return;

    const handleMoveEnd = () => {
      const marker = markerRefsMap.current[focusedVendor.id];
      const cluster = clusterRef.current;
      if (!marker || !cluster) return;

      // zoomToShowLayer ensures the marker is visible (unspiderfies cluster if needed)
      // then we open the popup in the callback
      setTimeout(() => {
        try {
          cluster.zoomToShowLayer(marker, () => {
            setTimeout(() => {
              if (marker) marker.openPopup();
            }, 100);
          });
        } catch (e) {
          // fallback: try direct popup open
          try { marker.openPopup(); } catch (_) {}
        }
      }, 150);
    };

    map.once('moveend', handleMoveEnd);
    return () => map.off('moveend', handleMoveEnd);
  }, [focusedVendor, map, clusterRef, markerRefsMap]);

  return null;
};

const createClusterCustomIcon = function (cluster) {
  return L.divIcon({
    html: `<span style="
             display: flex;
             justify-content: center;
             align-items: center;
             width: 32px;
             height: 32px;
             background: rgba(255, 255, 255, 0.95);
             color: #0f172a;
             border: 2px solid #ffffff;
             border-radius: 50%;
             box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 255, 255, 0.6);
             font-weight: 800;
             font-size: 13px;
             transition: all 0.2s ease;
           ">${cluster.getChildCount()}</span>`,
    className: 'custom-marker-cluster-circle',
    iconSize: L.point(32, 32, true),
    iconAnchor: L.point(16, 16),
  });
};

const createVendorIcon = (region) => {
  const color = REGION_COLORS[region] || '#fff';
  return L.divIcon({
    className: 'custom-vendor-icon',
    html: `<div style="
             width: 8px; height: 8px;
             background: ${color};
             border: 1px solid white;
             border-radius: 50%;
             box-shadow: 0 0 5px ${color}, 0 0 10px ${color};
             animation: pulse 2s infinite;
           ">
           </div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
    popupAnchor: [0, -10]
  });
};

const MarkerWithPopup = ({ vendor, focusedVendor, setFocusedVendor, onMount }) => {
  const markerRef = useRef(null);
  const closingProgrammatically = useRef(false);
  const isFocused = focusedVendor?.id === vendor.id;

  // Register this marker instance with the parent (IndiaMap) so PopupController can access it
  const setRef = (marker) => {
    markerRef.current = marker;
    if (marker && onMount) onMount(vendor.id, marker);
  };

  // Close popup when vendor loses focus
  useEffect(() => {
    if (!isFocused && markerRef.current) {
      closingProgrammatically.current = true;
      markerRef.current.closePopup();
      closingProgrammatically.current = false;
    }
  }, [isFocused]);

  return (
    <Marker 
      position={[vendor.lat, vendor.lng]}
      icon={createVendorIcon(vendor.region)}
      ref={setRef}
      vendor={vendor}
      eventHandlers={{
        click: () => setFocusedVendor(vendor)
      }}
    >
      <Popup 
        className="premium-popup" 
        closeButton={true} 
        onClose={() => {
          if (!closingProgrammatically.current && isFocused) {
            setFocusedVendor(null);
          }
        }}
      >
        <div style={{ padding: '0.25rem', minWidth: '220px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: REGION_COLORS[vendor.region], fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: REGION_COLORS[vendor.region], boxShadow: `0 0 8px ${REGION_COLORS[vendor.region]}` }} />
            {vendor.region} Region {vendor.state ? `• ${vendor.state}` : ''}{vendor.city ? ` • ${vendor.city}` : ''}
          </div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{vendor.plantName}</h4>
          <div style={{ background: 'var(--bg-app)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
            <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Vendor: <strong style={{ color: 'var(--text-primary)' }}>{vendor.vendorName}</strong></p>
            <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Capacity: <strong style={{ color: 'var(--text-primary)' }}>{vendor.plantCapacity} {vendor.capacityUnit}</strong> at ₹{vendor.rate}/unit</p>
          </div>
          <span className={`status-pill ${getStatusClass(vendor.status)}`} style={{ width: '100%', justifyContent: 'center' }}>
            {vendor.status}
          </span>
        </div>
      </Popup>
    </Marker>
  );
};

export const IndiaMap = ({ selectedRegion, onRegionClick, hoveredState, setHoveredState, vendors, focusedVendor, setFocusedVendor }) => {
  const [geoData, setGeoData] = useState(null);
  const geoJsonRef = useRef(null);
  const clusterInstanceRef = useRef(null);   // holds raw L.markerClusterGroup
  const markerRefsMap = useRef({});          // vendorId -> L.Marker instance

  const handleMarkerMount = (id, marker) => {
    markerRefsMap.current[id] = marker;
  };

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
        <PopupController
          focusedVendor={focusedVendor}
          clusterRef={clusterInstanceRef}
          markerRefsMap={markerRefsMap}
        />
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
        
        <MarkerClusterGroup
          clusterRef={clusterInstanceRef}
          iconCreateFunction={createClusterCustomIcon}
          showCoverageOnHover={false}
          maxClusterRadius={50}
        >
          {vendors.map(vendor => {
            if (selectedRegion && selectedRegion !== vendor.region) return null;
            return vendor.lat && vendor.lng && (
              <MarkerWithPopup 
                key={vendor.id} 
                vendor={vendor} 
                focusedVendor={focusedVendor} 
                setFocusedVendor={setFocusedVendor}
                onMount={handleMarkerMount}
              />
            );
          })}
        </MarkerClusterGroup>
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
  const [regionSearch, setRegionSearch] = useState('');

  const filteredVendors = useMemo(() => {
    // City & plant location geocoder map
    const knownLocations = [
      { keys: ['blr', 'bangalore', 'bengaluru'], lat: 12.9716, lng: 77.5946 },
      { keys: ['bidadi'], lat: 12.7958, lng: 77.3857 },
      { keys: ['madurai'], lat: 9.9252, lng: 78.1198 },
      { keys: ['pataudi'], lat: 28.3228, lng: 76.7820 },
      { keys: ['bareilly'], lat: 28.3670, lng: 79.4304 },
      { keys: ['jhansi'], lat: 25.4484, lng: 78.5685 },
      { keys: ['lucknow'], lat: 26.8467, lng: 80.9462 },
      { keys: ['jhajjar'], lat: 28.6068, lng: 76.6565 },
      { keys: ['rudrapur'], lat: 28.9800, lng: 79.4000 },
      { keys: ['roorkee'], lat: 29.8543, lng: 77.8880 },
      { keys: ['haridwar'], lat: 29.9457, lng: 78.1642 },
      { keys: ['manesar'], lat: 28.3516, lng: 76.9405 },
      { keys: ['hyderabad'], lat: 17.3850, lng: 78.4867 },
      { keys: ['vizag', 'visakhapatnam'], lat: 17.6868, lng: 83.2185 },
      { keys: ['wagholi'], lat: 18.5793, lng: 73.9822 },
      { keys: ['shirur'], lat: 18.8285, lng: 74.3768 },
      { keys: ['nashik'], lat: 19.9975, lng: 73.7898 },
      { keys: ['pune'], lat: 18.5204, lng: 73.8567 },
      { keys: ['khurda'], lat: 20.1824, lng: 85.6170 },
      { keys: ['hosur'], lat: 12.7409, lng: 77.8253 }
    ];

    return state.vendors.map((v, i) => {
      const realRegion = normalizeRegion(v.region, v.state, v.city);
      let lat = v.lat ? Number(v.lat) : null;
      let lng = v.lng ? Number(v.lng) : null;

      if (!lat || !lng) {
        const searchStr = `${v.plantName || ''} ${v.city || ''} ${v.state || ''}`.toLowerCase();
        const matched = knownLocations.find(loc => loc.keys.some(k => searchStr.includes(k)));

        if (matched) {
          const offsetLat = ((i % 3) - 1) * 0.02;
          const offsetLng = ((i % 5) - 2) * 0.02;
          lat = matched.lat + offsetLat;
          lng = matched.lng + offsetLng;
        } else {
          const center = REGION_CENTERS[realRegion] || [79, 23.5];
          const offsetLng = (i % 5) * 0.6 - 1.2;
          const offsetLat = (i % 3) * 0.6 - 0.6;
          lat = center[1] + offsetLat;
          lng = center[0] + offsetLng;
        }
      }

      return {
        ...v,
        region: realRegion,
        lat,
        lng
      };
    }).filter(v => statusFilter === 'All' || v.status === statusFilter);
  }, [state.vendors, statusFilter]);

  const regionStats = useMemo(() => {
    const stats = {};
    Object.keys(REGION_COLORS).forEach(r => {
      if (r !== 'Unknown') stats[r] = { vendors: [], capacity: 0 };
    });
    // Use filteredVendors so each vendor has lat/lng assigned (for map zoom to work)
    filteredVendors.forEach(v => {
      if (stats[v.region]) {
        stats[v.region].vendors.push(v);
        stats[v.region].capacity += getCapacityInMW(v.plantCapacity, v.capacityUnit);
      }
    });
    return stats;
  }, [filteredVendors]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 150px)', gap: '1rem' }}>
      <div className="animate-stagger">
        <h1 style={{ fontSize: '2rem' }}>Geographic Distribution</h1>
        <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Interactive map of your project assets across India.</p>
      </div>

      <div className="animate-stagger delay-1 mobile-flex-col" style={{ display: 'flex', flex: 1, gap: '2rem', minHeight: 0, width: '100%' }}>
        {/* Map Container */}
        <div className="glass-panel mobile-map-container" style={{ flex: 2, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative', width: '100%' }}>



          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 400 }} />
          
          <IndiaMap 
            selectedRegion={selectedRegion} 
            onRegionClick={(r) => { setSelectedRegion(selectedRegion === r ? null : r); setFocusedVendor(null); }} 
            hoveredState={hoveredState}
            setHoveredState={setHoveredState}
            vendors={filteredVendors}
            focusedVendor={focusedVendor}
            setFocusedVendor={setFocusedVendor}
          />
        </div>

        {/* Legend / Details Drawer */}
        <div className="glass-panel slide-in-drawer delay-2 mobile-responsive-width" style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', padding: '1.25rem', height: 'calc(100vh - 165px)', maxHeight: '780px' }}>
          
          {focusedVendor ? (
            <div className="animate-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto' }}>
              <button onClick={() => setFocusedVendor(null)} className="btn-ghost" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.65rem', fontSize: '0.85rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to {selectedRegion} Projects
              </button>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto', paddingRight: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: REGION_COLORS[focusedVendor.region], boxShadow: `0 0 8px ${REGION_COLORS[focusedVendor.region]}` }} />
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: REGION_COLORS[focusedVendor.region], fontWeight: 800 }}>{focusedVendor.region} Region {focusedVendor.state ? `• ${focusedVendor.state}` : ''}{focusedVendor.city ? ` • ${focusedVendor.city}` : ''}</span>
                </div>
                
                <h2 style={{ fontSize: '1.65rem', color: 'var(--text-primary)', lineHeight: 1.1, margin: 0 }}>{focusedVendor.plantName}</h2>
                
                <div className="glass-panel" style={{ padding: '1.15rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', marginTop: '0.5rem' }}>
                  <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Operating Vendor</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>{focusedVendor.vendorName}</div>
                  
                  <div className="responsive-grid" style={{ gap: '1rem' }}>
                    <div>
                      <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Capacity</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{focusedVendor.plantCapacity} {focusedVendor.capacityUnit}</div>
                    </div>
                    <div>
                      <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PPA Rate</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>₹{focusedVendor.rate}/unit</div>
                    </div>
                    <div>
                      <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                      <div style={{ marginTop: '0.35rem' }}>
                        <span className={`status-pill ${getStatusClass(focusedVendor.status)}`}>
                          {focusedVendor.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PO Number</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '0.35rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{focusedVendor.poNumber || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: '1.15rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', marginTop: '0.25rem' }}>
                  <div className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Contract Timeline</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Start Date</span>
                      <strong style={{ fontSize: '0.85rem' }}>{new Date(focusedVendor.contractStart).toLocaleDateString()}</strong>
                    </div>
                    <div style={{ height: 1, background: 'var(--border-color)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-secondary" style={{ fontSize: '0.85rem' }}>End Date</span>
                      <strong style={{ fontSize: '0.85rem', color: focusedVendor.status === 'Active' ? 'inherit' : 'var(--accent-color)' }}>{new Date(focusedVendor.contractEnd).toLocaleDateString()}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedRegion ? (
            <div className="animate-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', height: '100%', overflow: 'hidden' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '4px', backgroundColor: REGION_COLORS[selectedRegion], boxShadow: `0 0 8px ${REGION_COLORS[selectedRegion]}` }} />
                  <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{selectedRegion} Region</h3>
                </div>
                <button onClick={() => { setSelectedRegion(null); setFocusedVendor(null); setRegionSearch(''); }} className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}>Close ✕</button>
              </div>
              
              {/* Region Stats */}
              <div style={{ display: 'flex', gap: '0.65rem', flexShrink: 0 }}>
                <div style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: REGION_COLORS[selectedRegion] }}>{regionStats[selectedRegion].vendors.length}</div>
                  <div className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projects</div>
                </div>
                <div style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: REGION_COLORS[selectedRegion] }}>{regionStats[selectedRegion].capacity.toFixed(2)}</div>
                  <div className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MWp Capacity</div>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Filter region projects..." 
                  className="premium-input" 
                  style={{ paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.8rem', borderRadius: '8px' }}
                  value={regionSearch}
                  onChange={(e) => setRegionSearch(e.target.value)}
                />
              </div>

              {/* Compact List Content */}
              {(() => {
                const filteredRegionVendors = regionStats[selectedRegion].vendors.filter(v => {
                  if (!regionSearch.trim()) return true;
                  const q = regionSearch.toLowerCase();
                  return (
                    (v.plantName && v.plantName.toLowerCase().includes(q)) ||
                    (v.vendorName && v.vendorName.toLowerCase().includes(q)) ||
                    (v.city && v.city.toLowerCase().includes(q)) ||
                    (v.state && v.state.toLowerCase().includes(q))
                  );
                });

                if (filteredRegionVendors.length === 0) {
                  return (
                    <div className="text-secondary" style={{ textAlign: 'center', padding: '1.5rem 0', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', fontSize: '0.82rem' }}>
                      {regionSearch.trim() ? `No projects matching "${regionSearch}".` : 'No projects found in this region.'}
                    </div>
                  );
                }

                return (
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredRegionVendors.map((v) => {
                      const isActive = focusedVendor?.id === v.id;
                      return (
                        <div 
                          key={v.id} 
                          onClick={() => {
                            setFocusedVendor(isActive ? null : v);
                          }}
                          style={{ 
                            padding: '0.75rem 0.85rem', 
                            background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', 
                            border: `2px solid ${isActive ? REGION_COLORS[v.region] : 'var(--border-color)'}`, 
                            borderRadius: '8px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }} 
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isActive ? REGION_COLORS[v.region] : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {v.plantName || v.vendorName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {v.vendorName}
                            </div>
                            <div style={{ fontSize: '0.72rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.plantCapacity} {v.capacityUnit}</span>
                              <span>•</span>
                              <span>₹{v.rate}/unit</span>
                            </div>
                          </div>
                          <span className={`status-pill ${getStatusClass(v.status)}`} style={{ transform: 'scale(0.8)', transformOrigin: 'right center', flexShrink: 0 }}>
                            {v.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="animate-stagger" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '0.15rem', fontWeight: 700 }}>Region Overview</h3>
              <p className="text-secondary" style={{ fontSize: '0.82rem', marginBottom: '0.85rem' }}>Select any region on the map for detailed metrics.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', paddingRight: '0.25rem', flex: 1 }}>
                {Object.keys(REGION_COLORS).filter(r => r !== 'Unknown').map((region, i) => (
                  <div 
                    key={region}
                    onClick={() => setSelectedRegion(region)}
                    className={`animate-stagger delay-${(i % 4) + 1}`}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '0.85rem 1rem', 
                      background: 'var(--bg-primary)', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.boxShadow = 'var(--shadow-float)'; e.currentTarget.style.borderColor = REGION_COLORS[region]; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: REGION_COLORS[region] }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{region}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', textAlign: 'right' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{regionStats[region].vendors.length}</div>
                        <div className="text-secondary" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projects</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{regionStats[region].capacity.toFixed(2)}</div>
                        <div className="text-secondary" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MWp</div>
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
