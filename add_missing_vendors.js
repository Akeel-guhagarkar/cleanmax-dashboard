import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { SEED_VENDORS } from './src/utils/seedData.js';

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

async function addMissingVendors() {
  const snapshot = await getDocs(collection(db, 'vendors'));
  const firebaseVendors = snapshot.docs.map(doc => doc.data());
  const firebaseVendorCodes = new Set(firebaseVendors.map(v => v.vendorCode));
  
  console.log(`Found ${firebaseVendors.length} vendor docs with ${firebaseVendorCodes.size} unique codes in Firebase.`);
  
  const missingVendors = SEED_VENDORS.filter(v => !firebaseVendorCodes.has(v.vendorCode));
  
  console.log(`Found ${missingVendors.length} missing vendor records to add.`);
  
  let addedCodes = new Set();
  
  for (const v of missingVendors) {
    await setDoc(doc(db, 'vendors', v.id), v);
    addedCodes.add(v.vendorCode);
  }
  
  console.log(`Successfully added missing vendor records for codes:`, Array.from(addedCodes));
  process.exit(0);
}

addMissingVendors().catch(console.error);
