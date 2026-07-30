export const STATE_TO_REGION = {
  // North
  'Jammu and Kashmir': 'North', 'Himachal Pradesh': 'North', 'Punjab': 'North', 'Chandigarh': 'North',
  'Uttaranchal': 'North', 'Haryana': 'North', 'Delhi': 'North', 'Uttar Pradesh': 'North',
  
  // West (including MP, Chhattisgarh)
  'Rajasthan': 'West', 'Gujarat': 'West', 'Maharashtra': 'West', 'Goa': 'West', 'Dadra and Nagar Haveli': 'West', 'Daman and Diu': 'West',
  'Madhya Pradesh': 'West', 'Chhattisgarh': 'West',
  
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
  'East': 'var(--region-east)',
  'South': 'var(--region-south)',
  'Unknown': '#cbd5e1'
};

export const REGION_CENTERS = {
  'North': [77, 28.5],
  'West': [73, 21.5],
  'East': [85, 24.5],
  'South': [77.5, 12.0]
};

export const normalizeStatus = (status) => String(status || '').toLowerCase().trim();

/**
 * Normalizes a region string to one of the 4 standard geographic regions:
 * North, South, West, or East.
 * Maps state names, city names, and abbreviations (e.g. Raj., UP, Hr, Kolkata, Assam)
 * directly to their respective primary regions.
 */
export const normalizeRegion = (regionStr, stateStr, cityStr) => {
  const combined = `${regionStr || ''} ${stateStr || ''} ${cityStr || ''}`.trim();
  if (!combined) return 'North';

  const s = combined.toLowerCase();

  // 1. Direct standard region keyword matching
  if (/\b(west|wr|central|cr)\b/i.test(s)) return 'West';
  if (/\b(south|sr)\b/i.test(s)) return 'South';
  if (/\b(north|nr)\b/i.test(s)) return 'North';
  if (/\b(east|er)\b/i.test(s)) return 'East';

  // 2. State & City Mapping to Primary Regions:

  // WEST (Maharashtra, Gujarat, Goa, Daman & Diu, Dadra & Nagar Haveli, MP, Chhattisgarh)
  if (/\b(maharashtra|mh|mumbai|pune|nagpur|nashik|thane|gujarat|gj|ahmedabad|surat|vadodara|rajkot|goa|daman|diu|dadra|madhya\s*pradesh|mp|bhopal|indore|gwalior|jabalpur|chhattisgarh|cg|raipur|bilaspur)\b/i.test(s)) {
    return 'West';
  }

  // SOUTH (Tamil Nadu, Karnataka, Telangana, Andhra Pradesh, Kerala, Puducherry)
  if (/\b(tamil\s*nadu|tn|chennai|coimbatore|madurai|karnataka|ka|bangalore|bengaluru|mysore|mysuru|telangana|ts|hyderabad|andhra|ap|vizag|visakhapatnam|vijayawada|kerala|kl|kochi|trivandrum|thiruvananthapuram)\b/i.test(s)) {
    return 'South';
  }

  // NORTH (Rajasthan, UP, Haryana, Punjab, Delhi, HP, J&K, Uttarakhand, Chandigarh)
  if (/\b(rajasthan|raj\.|raj|jaipur|uttar\s*pradesh|up|u\.p\.|lucknow|kanpur|noida|agra|varanasi|haryana|hr|gurgaon|gurugram|faridabad|punjab|pb|ludhiana|amritsar|delhi|dl|ncr|jammu|kashmir|jk|j&k|himachal|hp|shimla|uttarakhand|uk|dehradun|chandigarh|ch)\b/i.test(s)) {
    return 'North';
  }

  // EAST (West Bengal, Kolkata, Assam, Bihar, Jharkhand, Odisha, Sikkim, NE states)
  if (/\b(west\s*bengal|wb|kolkata|calcutta|howrah|siliguri|assam|guwahati|bihar|patna|jharkhand|ranchi|odisha|orissa|bhubaneswar|sikkim|meghalaya|manipur|mizoram|nagaland|tripura|arunachal)\b/i.test(s)) {
    return 'East';
  }

  // Fallback to first clean word
  const firstWord = String(regionStr || '').trim().split(/[\s,]+/)[0];
  if (firstWord && firstWord.length > 2) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }

  return 'North';
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

export const parseFlexibleDate = (dateVal) => {
  if (!dateVal || dateVal === '—' || dateVal === 'N/A' || String(dateVal).trim() === '') return null;

  // 1. If dateVal is already a Date instance
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }

  // 2. Excel numeric serial date (e.g. 45868)
  if (typeof dateVal === 'number' || (!isNaN(dateVal) && !isNaN(parseFloat(dateVal)) && String(dateVal).trim().length <= 6 && !String(dateVal).includes('-') && !String(dateVal).includes('/'))) {
    const num = Number(dateVal);
    if (!isNaN(num) && num > 1000 && num < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const msPerDay = 24 * 60 * 60 * 1000;
      const d = new Date(excelEpoch.getTime() + num * msPerDay);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  // 3. YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2}/.test(str)) {
    const parts = str.split(/[-\/\.T ]/);
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(Date.UTC(y, m, d));
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // 4. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  if (/^\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{4}/.test(str)) {
    const parts = str.split(/[-\/\. ]/);
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    let day, month;
    if (p1 > 12) {
      day = p1;
      month = p2 - 1;
    } else if (p2 > 12) {
      day = p2;
      month = p1 - 1;
    } else {
      // In CleanMax/India standard Excel format, DD/MM/YYYY is standard
      day = p1;
      month = p2 - 1;
    }
    const dateObj = new Date(Date.UTC(year, month, day));
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // 5. Fallback native parse
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
};

/**
 * Formats any date input into YYYY-MM-DD string for HTML inputs or ISO database storage
 */
export const formatDateToISO = (dateVal, defaultFallback = null) => {
  const d = parseFlexibleDate(dateVal);
  if (!d) return defaultFallback || new Date().toISOString().split('T')[0];
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats any date input into clean display format e.g. "30 Jul 2028"
 */
export const formatDateForDisplay = (dateVal) => {
  const d = parseFlexibleDate(dateVal);
  if (!d) return '—';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
};

export const safeFormatDate = (dateVal, options = {}) => {
  if (!dateVal) return '—';
  const d = parseFlexibleDate(dateVal);
  if (!d) return '—';
  try {
    return d.toLocaleDateString(options.locale || 'en-IN', options);
  } catch (e) {
    return formatDateForDisplay(d);
  }
};

export const safeFormatDateTime = (dateVal, options = {}) => {
  if (!dateVal) return '—';
  const d = parseFlexibleDate(dateVal);
  if (!d) return '—';
  try {
    return d.toLocaleString(options.locale || 'en-IN', options);
  } catch (e) {
    return formatDateForDisplay(d);
  }
};

export const safeFormatNumber = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
};

/**
 * Formats any phone number string into a standard, clean international format: +91 XXXXX XXXXX
 * Example: "8275177216" -> "+91 82751 77216"
 * Example: "+918275177216" -> "+91 82751 77216"
 */
export const formatPhoneNumber = (phone) => {
  if (!phone || phone === '-' || phone === 'N/A' || String(phone).trim() === '') return '-';

  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');
  if (!digits) return str;

  let num = digits;

  // Handle leading country code 91 or leading 0
  if (num.startsWith('91') && num.length === 12) {
    num = num.slice(2);
  } else if (num.startsWith('0') && num.length >= 10) {
    num = num.replace(/^0+/, '');
  }

  // Standardize demo seed numbers
  if (num === '987654321' || num === '0987654321') {
    num = '9876543210';
  }

  if (num.length === 10) {
    return `+91 ${num.slice(0, 5)} ${num.slice(5)}`;
  }

  if (str.startsWith('+')) return str;
  return `+91 ${num}`;
};

export const generateDeterministicId = (prefix, ...parts) => {
  const raw = parts
    .map(p => String(p || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .join('_');
  if (!raw) return `${prefix}_${Math.floor(100000 + Math.random() * 900000)}`;
  return `${prefix}_${raw}`;
};


