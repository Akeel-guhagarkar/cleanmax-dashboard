import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const firebaseConfig = {
  apiKey: 'AIzaSyBU0vnY8f8yALba0Na4ZQnQAfya4zeitRI',
  authDomain: 'cleanmax-dashboard.firebaseapp.com',
  projectId: 'cleanmax-dashboard',
  storageBucket: 'cleanmax-dashboard.firebasestorage.app',
  messagingSenderId: '274045208324',
  appId: '1:274045208324:web:05539f3f109400ea91b251'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const userVendors = [
  { vendorCode: '100505', vendorName: 'FEATURE GREEN ENERGY SOLUTIONS' },
  { vendorCode: '101681', vendorName: 'Advik Energy Solution Private Limited' },
  { vendorCode: '101711', vendorName: 'D Square Solar Services' },
  { vendorCode: '101727', vendorName: 'Fast & Reliable Services (P) Limited' },
  { vendorCode: '101731', vendorName: 'Fussionsolar Services Private Limited' },
  { vendorCode: '101736', vendorName: 'Geone Solar Private Limited' },
  { vendorCode: '101737', vendorName: 'Global Power' },
  { vendorCode: '101745', vendorName: 'Icon Engineering Works' },
  { vendorCode: '101793', vendorName: 'Mekeran Energy & Infra Private Limited' },
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
];

async function checkAndAddVendors() {
  const snapshot = await getDocs(collection(db, 'vendors'));
  const firebaseVendors = snapshot.docs.map(doc => doc.data());
  const firebaseVendorCodes = new Set(firebaseVendors.map(v => v.vendorCode));
  
  let addedCount = 0;
  
  for (const v of userVendors) {
    if (!firebaseVendorCodes.has(v.vendorCode)) {
      console.log(`Adding missing vendor: ${v.vendorCode} - ${v.vendorName}`);
      const id = uuidv4();
      const payload = {
        id,
        vendorCode: v.vendorCode,
        vendorName: v.vendorName,
        vendorType: 'Manufacturer',
        plantName: `${v.vendorName} Main Plant`,
        plantCapacity: 0,
        capacityUnit: 'kWp',
        rate: 0,
        region: 'Unknown',
        status: 'Active',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'vendors', id), payload);
      addedCount++;
    }
  }
  
  console.log(`Finished checking. Added ${addedCount} new vendors.`);
  process.exit(0);
}

checkAndAddVendors().catch(console.error);
