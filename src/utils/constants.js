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
