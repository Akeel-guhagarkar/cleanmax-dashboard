import { v4 as uuidv4 } from 'uuid';
import { addDays, subDays, isBefore, isAfter, differenceInDays } from 'date-fns';
import { STATE_TO_REGION, parseFlexibleDate, formatDateToISO } from './constants.js';

export const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
export const STATUSES = ['Active', 'Expiring Soon', 'Expired'];

export const calculateStatus = (endDate) => {
  if (!endDate) return 'Active';
  const end = parseFlexibleDate(endDate);
  if (!end) return 'Active';
  const now = new Date();

  const endMidnight = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const nowMidnight = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diffTime = endMidnight - nowMidnight;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 30) return 'Expiring Soon'; // Exactly 1 month (30 days) before expiry
  return 'Active'; // More than 1 month away
};

// SEED_PROJECTS is generated below

export const SEED_USERS = [
  {
    id: 'user-admin-seed-1',
    name: 'System Admin',
    email: 'admin@cleanmax.com',
    password: 'admin',
    phone: '1234567890',
    role: 'admin',
    department: 'IT Operations',
    jobTitle: 'System Administrator',
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-viewer-seed-2',
    name: 'Viewer User',
    email: 'viewer@cleanmax.com',
    password: 'viewer',
    phone: '0987654321',
    role: 'viewer',
    department: 'Analytics',
    jobTitle: 'Data Analyst',
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
  }
];

const parseDate = (dateStr) => {
  if (!dateStr || dateStr === '—') return new Date().toISOString();
  const d = parseFlexibleDate(dateStr);
  return d ? d.toISOString() : new Date().toISOString();
};

const genericVendors = [
  { vendorCode: '101711', vendorName: 'D Square Solar Services' },
  { vendorCode: '101727', vendorName: 'Fast & Reliable Services (P) Limited' },
  { vendorCode: '101736', vendorName: 'Geone Solar Private Limited' },
  { vendorCode: '101737', vendorName: 'Global Power' },
  { vendorCode: '101745', vendorName: 'Icon Engineering Works' },
  { vendorCode: '101827', vendorName: 'Pry Solar Services Private Limited' },
  { vendorCode: '105129', vendorName: 'MARUT SOLAR & TECHNOLOGY PRIVATE LIMITED' },
  { vendorCode: '106050', vendorName: 'ACES' },
  { vendorCode: '106078', vendorName: 'Winsun Green Private Limited' },
  { vendorCode: '106463', vendorName: 'SWAYAMURJA RENEWABLE ENERGY PRIVATE LIMITED' },
  { vendorCode: '107121', vendorName: 'AVANI ECO SOLUTIONS PRIVATE LIMITED' },
  { vendorCode: '109627', vendorName: 'Sundroid Solutions Pvt. Ltd.' },
  { vendorCode: '101835', vendorName: 'S V D Energy' },
  { vendorCode: '101863', vendorName: 'Skyfri Energy Private Limited' },
  { vendorCode: '101883', vendorName: 'Suntrap Energy Solutions Private Limited' },
  { vendorCode: '109793', vendorName: 'Surya Shakti-Solutions' },
  { vendorCode: '101893', vendorName: 'Swapsol Energy' },
  { vendorCode: '101900', vendorName: 'Technica Green Energy Private Limited' },
  { vendorCode: '105349', vendorName: 'SAHYOGYA GREEN ENERGY PVT LTD' },
  { vendorCode: '110253', vendorName: 'Shivank Renewables' },
  { vendorCode: '100468', vendorName: 'Swing Solar' },
  { vendorCode: '110385', vendorName: 'Solar City Ventures' },
  { vendorCode: '109874', vendorName: 'Anor Sunshine' },
  { vendorCode: '106399', vendorName: 'Truboard Cleantech Private Limited' }
].map(v => ({
  id: uuidv4(),
  vendorCode: v.vendorCode,
  vendorName: v.vendorName,
  vendorType: 'O&M Vendor',
  plantName: 'TBD',
  region: 'North',
  city: 'TBD',
  plantCapacity: 0,
  capacityUnit: 'kWp',
  rate: 0,
  poNumber: 'TBD',
  prNumber: 'TBD',
  contractStart: parseDate('01/01/2026'),
  contractEnd: parseDate('01/01/2027'),
  status: calculateStatus(parseDate('01/01/2027')),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const mekeranVendors = [
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'Nykaa BLR2 (E-Retail)', region: 'South', city: '—', plantCapacity: 53.36, capacityUnit: 'kWp', rate: 187, poNumber: '4600000600', prNumber: '1700000599', contractStart: parseDate('08/12/2025'), contractEnd: parseDate('07/12/2027') },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'Nykaa BLR3 (Fashion)', region: 'South', city: '—', plantCapacity: 29.58, capacityUnit: 'kWp', rate: 321, poNumber: '4600000600', prNumber: '1700000599', contractStart: parseDate('08/12/2025'), contractEnd: parseDate('07/12/2027') },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'TATA Smartfoodz', region: '—', city: '—', plantCapacity: 998.50, capacityUnit: 'kWp', rate: 28, poNumber: '4600000051', prNumber: '1700000071 / 1700000755', contractStart: parseDate('31/05/2024'), contractEnd: parseDate('30/05/2027') },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'SFL Madurai', region: '—', city: '—', plantCapacity: 1526.00, capacityUnit: 'kWp', rate: 29, poNumber: '4600000061', prNumber: '1700000069 / 1700000755', contractStart: parseDate('04/06/2024'), contractEnd: parseDate('03/06/2027') },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'HCL Technologies Ltd', region: 'South', city: '—', plantCapacity: 72.54, capacityUnit: 'kWp', rate: 32, poNumber: '4600000620', prNumber: '1700000623', contractStart: parseDate('29/12/2025'), contractEnd: parseDate('28/12/2027') },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'Modherson Mate', region: 'South', city: '—', plantCapacity: 945.20, capacityUnit: 'kWp', rate: 35, poNumber: '4600000809', prNumber: '1700000753', contractStart: parseDate('01/04/2026'), contractEnd: parseDate('31/03/2028') },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'Henkel', region: '—', city: '—', plantCapacity: 196.00, capacityUnit: 'kWp', rate: 35, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2028') },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'Aravind Mills', region: 'South', city: '—', plantCapacity: 499.20, capacityUnit: 'kWp', rate: 30, poNumber: '4600000837', prNumber: '1700000802', contractStart: parseDate('06/05/2026'), contractEnd: parseDate('05/05/2028') },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'Manipal County', region: '—', city: '—', plantCapacity: 135.00, capacityUnit: 'kWp', rate: 30, poNumber: '4600000838', prNumber: '1700000802', contractStart: parseDate('06/05/2026'), contractEnd: parseDate('05/05/2028') },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Pvt Ltd', plantName: 'Toyota Bidadi', region: 'South', city: '—', plantCapacity: 1096.00, capacityUnit: 'kWp', rate: 30, poNumber: '4600000885', prNumber: '—', contractStart: parseDate('02/06/2026'), contractEnd: parseDate('01/06/2028') }
].map(v => ({
  ...v,
  id: uuidv4(),
  vendorType: 'O&M Vendor',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const advikVendors = [
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'Paramount Bed', region: 'West', city: '—', plantCapacity: 665, capacityUnit: 'kWp', rate: 29, poNumber: '4600000241', prNumber: '1700000729', contractStart: parseDate('26/11/2024'), contractEnd: parseDate('25/11/2026') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'ABFRL Pataudi', region: 'North', city: '—', plantCapacity: 272.78, capacityUnit: 'kWp', rate: 29, poNumber: '4600000769', prNumber: '1700000715', contractStart: parseDate('18/03/2026'), contractEnd: parseDate('17/03/2028') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'IVRI', region: 'West', city: '—', plantCapacity: 750, capacityUnit: 'kWp', rate: 30, poNumber: '4600000805', prNumber: '1700000733', contractStart: parseDate('31/03/2026'), contractEnd: parseDate('30/03/2028') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'CARI, Bareilly', region: '—', city: '—', plantCapacity: 126.45, capacityUnit: 'kWp', rate: 30, poNumber: '4600000806', prNumber: '1700000733', contractStart: parseDate('31/03/2026'), contractEnd: parseDate('30/03/2028') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'Indian Institute', region: '—', city: '—', plantCapacity: 179.20, capacityUnit: 'kWp', rate: 27, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'CAFRI Building', region: '—', city: '—', plantCapacity: 80, capacityUnit: 'kWp', rate: 28, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'IGFRI, Jhansi', region: '—', city: '—', plantCapacity: 168, capacityUnit: 'kWp', rate: 28, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'Babasaheb Bhim (Site 1)', region: '—', city: '—', plantCapacity: 500.50, capacityUnit: 'kWp', rate: 27, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'Babasaheb Bhim (Site 2)', region: '—', city: '—', plantCapacity: 245.375, capacityUnit: 'kWp', rate: 28, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'Avantibai, Lucknow', region: '—', city: '—', plantCapacity: 179.725, capacityUnit: 'kWp', rate: 27, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'Banda University', region: '—', city: '—', plantCapacity: 650, capacityUnit: 'kWp', rate: 28, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'NABARD, Lucknow', region: '—', city: '—', plantCapacity: 108.875, capacityUnit: 'kWp', rate: 27, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'CISH, Lucknow', region: '—', city: '—', plantCapacity: 127.075, capacityUnit: 'kWp', rate: 27, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'CSAUT (Project) – Site 1', region: '—', city: '—', plantCapacity: 349.70, capacityUnit: 'kWp', rate: 28, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'CSAUT (Project) – Site 2', region: '—', city: '—', plantCapacity: 248.95, capacityUnit: 'kWp', rate: 28, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'CSAUT (Project) – Site 3', region: '—', city: '—', plantCapacity: 90.35, capacityUnit: 'kWp', rate: 28, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'HV Farms, Jhajjar', region: 'North', city: '—', plantCapacity: 200.70, capacityUnit: 'kWp', rate: 30, poNumber: '4600000853', prNumber: '1700000818', contractStart: parseDate('12/05/2026'), contractEnd: parseDate('11/05/2028') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'Welspun Rudrapur', region: '—', city: '—', plantCapacity: 373, capacityUnit: 'kWp', rate: 29, poNumber: '4600000855', prNumber: '1700000826, 1700000827, 1700000828', contractStart: parseDate('14/05/2026'), contractEnd: parseDate('13/05/2028') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'JATL Roorkee', region: '—', city: '—', plantCapacity: 501, capacityUnit: 'kWp', rate: 30, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited', plantName: 'JNS Haridwar', region: '—', city: '—', plantCapacity: 350.46, capacityUnit: 'kWp', rate: 29, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2026'), contractEnd: parseDate('01/01/2027') },
].map(v => ({
  ...v,
  id: uuidv4(),
  vendorType: 'O&M Vendor',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const geoneVendors = [
  { vendorCode: '101736', vendorName: 'Geone Solar Private Limited', plantName: 'JNS Instruments Manesar', region: 'South', city: '—', plantCapacity: 136.88, capacityUnit: 'kWp', rate: 30, poNumber: '4600000610', prNumber: '1700000611', contractStart: parseDate('15/12/2025'), contractEnd: parseDate('14/12/2027') },
  { vendorCode: '101736', vendorName: 'Geone Solar Private Limited', plantName: 'Nitto Denko', region: 'North', city: '—', plantCapacity: 100, capacityUnit: 'kWp', rate: 35, poNumber: '4600000084', prNumber: '1700000730', contractStart: parseDate('13/06/2024'), contractEnd: parseDate('12/06/2026') },
  { vendorCode: '101736', vendorName: 'Geone Solar Private Limited', plantName: 'KEI Pathredi', region: 'North', city: '—', plantCapacity: 1250, capacityUnit: 'kWp', rate: 35, poNumber: '4600000928', prNumber: '1700000918', contractStart: parseDate('17/06/2026'), contractEnd: parseDate('16/06/2028') }
].map(v => ({
  ...v,
  id: uuidv4(),
  vendorType: 'O&M Vendor',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const svdVendors = [
  { vendorCode: '101835', vendorName: 'S V D Energy', plantName: 'CMES IPE', region: 'South', city: 'Hyderabad', plantCapacity: 135, capacityUnit: 'kWp', rate: 30, poNumber: '4600000163', prNumber: '1700000173', contractStart: parseDate('09/08/2024'), contractEnd: parseDate('08/08/2026') },
  { vendorCode: '101835', vendorName: 'S V D Energy', plantName: 'Vizag Steel', region: 'West', city: '—', plantCapacity: 500.30, capacityUnit: 'kWp', rate: 32, poNumber: '4600000815', prNumber: '1700000713', contractStart: parseDate('07/04/2026'), contractEnd: parseDate('06/04/2028') }
].map(v => ({
  ...v,
  id: uuidv4(),
  vendorType: 'O&M Vendor',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const sahyogVendors = [
  { vendorCode: '101838 / 109627', vendorName: 'Sahyog Sales Corporation', plantName: 'TE Wagholi', region: 'West', city: 'Pune', plantCapacity: 454.53, capacityUnit: 'kWp', rate: 29, poNumber: '4600000284', prNumber: '1700000306, 1700000867', contractStart: parseDate('06/02/2025'), contractEnd: parseDate('05/08/2026') },
  { vendorCode: '101838 / 109627', vendorName: 'Sahyog Sales Corporation', plantName: 'Sandhar Shirur', region: 'West', city: 'Pune', plantCapacity: 716.65, capacityUnit: 'kWp', rate: 29, poNumber: '4600000272', prNumber: '1700000279, 1700000298, 1700000867', contractStart: parseDate('09/01/2025'), contractEnd: parseDate('08/08/2027') },
  { vendorCode: '101838 / 109627', vendorName: 'Sahyog Sales Corporation', plantName: 'IAC Nashik', region: 'West', city: 'Nashik', plantCapacity: 908, capacityUnit: 'kWp', rate: 30, poNumber: '4600000776', prNumber: '1700000724', contractStart: parseDate('23/03/2026'), contractEnd: parseDate('22/03/2028') },
  { vendorCode: '101838 / 109627', vendorName: 'Sahyog Sales Corporation', plantName: 'Tata Ficosa – Phase 2', region: 'West', city: '—', plantCapacity: 370, capacityUnit: 'kWp', rate: 30, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2024'), contractEnd: parseDate('31/12/2026') },
  { vendorCode: '101838 / 109627', vendorName: 'Sahyog Sales Corporation', plantName: 'TM Setting', region: 'West', city: '—', plantCapacity: 330, capacityUnit: 'kWp', rate: 30, poNumber: '—', prNumber: '—', contractStart: parseDate('01/01/2024'), contractEnd: parseDate('31/12/2026') }
].map(v => ({
  ...v,
  id: uuidv4(),
  vendorType: 'O&M Vendor',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const fussionVendors = [
  { vendorCode: '101731', vendorName: 'Fussionsolar Services Pvt. Ltd.', plantName: 'Indo Nissin Khurda', region: 'East', city: '—', plantCapacity: 679.70, capacityUnit: 'kWp', rate: 30, poNumber: '4600000740', prNumber: '1700000680', contractStart: parseDate('09/03/2026'), contractEnd: parseDate('08/03/2028') }
].map(v => ({
  ...v,
  id: uuidv4(),
  vendorType: 'O&M Vendor',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const featureGreenVendors = [
  { vendorCode: '100505', vendorName: 'Feature Green Energy Solutions', plantName: 'TACO Bidadi', region: 'South', city: '—', plantCapacity: 149.27, capacityUnit: 'kWp', rate: 27, poNumber: '4600000572', prNumber: '1700000569, 1700000748', contractStart: parseDate('04/11/2025'), contractEnd: parseDate('04/12/2026') },
  { vendorCode: '100505', vendorName: 'Feature Green Energy Solutions', plantName: 'SACL Hosur', region: 'South', city: '—', plantCapacity: 960, capacityUnit: 'kWp', rate: 39, poNumber: '4600000868', prNumber: '1700000815', contractStart: parseDate('18/05/2026'), contractEnd: parseDate('17/05/2028') }
].map(v => ({
  ...v,
  id: uuidv4(),
  vendorType: 'O&M Vendor',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const tvsVendors = [
  { vendorCode: '101186', vendorName: 'TVS Electronics Limited', plantName: 'Sanmina Phase 1', region: 'South', city: '—', plantCapacity: 1041.30, capacityUnit: 'kWp', rate: 29, poNumber: '4600000604', prNumber: '1700000615', contractStart: parseDate('12/12/2025'), contractEnd: parseDate('11/12/2027') }
].map(v => ({
  ...v,
  id: uuidv4(),
  vendorType: 'O&M Vendor',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const RAW_SEED_VENDORS = [...genericVendors, ...mekeranVendors, ...advikVendors, ...geoneVendors, ...svdVendors, ...sahyogVendors, ...fussionVendors, ...featureGreenVendors, ...tvsVendors];

export const SEED_VENDORS = RAW_SEED_VENDORS.map(v => ({
  ...v,
  status: calculateStatus(v.contractEnd)
}));

export const SEED_PROJECTS = RAW_SEED_VENDORS.map((v, i) => ({
  id: uuidv4(),
  projectCode: `PRJ-${new Date(v.contractStart).getFullYear()}-${String(i + 1).padStart(2, '0')}`,
  projectName: v.plantName,
  client: v.vendorName,
  type: 'O&M Project',
  capacity: v.plantCapacity,
  unit: v.capacityUnit,
  status: calculateStatus(v.contractEnd) === 'Active' ? 'In Progress' : 'Planning',
  completionDate: v.contractStart,
  createdAt: v.createdAt
}));

export const SEED_ARCHIVED_CONTRACTS = [
  {
    id: 'archived-sample-1',
    vendorCode: '101793',
    vendorName: 'Mekeran Energy & Infra Pvt Ltd',
    plantName: 'Nykaa BLR2 (E-Retail)',
    region: 'South',
    state: 'Karnataka',
    city: 'Bengaluru',
    oldPoNumber: '4600000410',
    newPoNumber: '4600000600',
    oldRate: 175,
    newRate: 187,
    oldContractStart: '2023-12-08T00:00:00.000Z',
    oldContractEnd: '2025-12-07T00:00:00.000Z',
    newContractStart: '2025-12-08T00:00:00.000Z',
    newContractEnd: '2027-12-07T00:00:00.000Z',
    plantCapacity: 53.36,
    capacityUnit: 'kWp',
    renewalStatus: 'Renewed',
    renewedAt: '2025-12-08T10:30:00.000Z',
    renewedBy: 'Akeel Guhagarkar',
    renewedByRole: 'Admin'
  },
  {
    id: 'archived-sample-2',
    vendorCode: '101681',
    vendorName: 'Advik Energy Solution Private Limited',
    plantName: 'Paramount Bed',
    region: 'West',
    state: 'Gujarat',
    city: 'Vadodara',
    oldPoNumber: '4600000100',
    newPoNumber: '4600000241',
    oldRate: 27,
    newRate: 29,
    oldContractStart: '2022-11-26T00:00:00.000Z',
    oldContractEnd: '2024-11-25T00:00:00.000Z',
    newContractStart: '2024-11-26T00:00:00.000Z',
    newContractEnd: '2026-11-25T00:00:00.000Z',
    plantCapacity: 665,
    capacityUnit: 'kWp',
    renewalStatus: 'Renewed',
    renewedAt: '2024-11-26T14:15:00.000Z',
    renewedBy: 'System Admin',
    renewedByRole: 'Admin'
  }
];
