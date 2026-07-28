export const STATE_TO_REGION = {
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

export const REGION_COLORS = {
  'North': 'var(--region-north)',
  'West': 'var(--region-west)',
  'Central': 'var(--region-central)',
  'East': 'var(--region-east)',
  'South': 'var(--region-south)',
  'Unknown': '#cbd5e1'
};

export const REGION_CENTERS = {
  'North': [77, 28.5],
  'West': [72, 22.5],
  'Central': [79, 23.5],
  'East': [85, 24.5],
  'South': [78, 14.5]
};

export const normalizeStatus = (status) => String(status || '').toLowerCase().trim();

/**
 * Normalizes a region string to Title Case so that "west", "WEST", and "West" all
 * become "West" — preventing duplicate chart entries caused by inconsistent casing.
 */
export const normalizeRegion = (region) => {
  if (!region || String(region).trim() === '') return 'Unknown';
  return String(region).trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

export const getStatusClass = (status) => {
  const s = normalizeStatus(status);
  
  // 1. Green: Active / Completed
  if (s.includes('active') || s.includes('completed')) {
    return 'status-active';
  }
  
  // 2. Orange: Expiring Soon / Expiring / In Progress / Warning
  if (s.includes('expiring') || s.includes('warning') || s.includes('progress')) {
    return 'status-warning';
  }
  
  // 3. Red: Expired / Terminated / Inactive / Cancelled
  if (s.includes('expired') || s.includes('inactive') || s.includes('terminated') || s.includes('cancel')) {
    return 'status-danger';
  }

  // Default fallback is Orange (status-warning) so unmapped values are never mistakenly Red
  return 'status-warning';
};

export const getCapacityInMW = (capacity, unit) => {
  const cap = Number(capacity) || 0;
  if (String(unit || '').toLowerCase().trim() === 'kwp') {
    return cap / 1000;
  }
  return cap; // assume MWp if not kWp
};

export const safeFormatDate = (dateVal, options = {}) => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(options.locale || 'en-IN', options);
  } catch (e) {
    return '—';
  }
};

export const safeFormatDateTime = (dateVal, options = {}) => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(options.locale || 'en-IN', options);
  } catch (e) {
    return '—';
  }
};

export const safeFormatNumber = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
};


