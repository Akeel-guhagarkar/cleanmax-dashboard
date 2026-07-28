import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection, doc, updateDoc } from 'firebase/firestore';

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

async function fixCapacityUnits() {
  const snap = await getDocs(collection(db, 'vendors'));
  let fixedCount = 0;
  let skippedCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const unit = (data.capacityUnit || '').trim();

    // Fix MWp → kWp and KWp → kWp (normalize all to kWp)
    if (unit === 'MWp' || unit === 'KWp') {
      await updateDoc(doc(db, 'vendors', docSnap.id), { capacityUnit: 'kWp' });
      console.log(`Fixed: ${data.vendorName} | ${data.plantName} | ${unit} → kWp`);
      fixedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`\n✅ Done! Fixed ${fixedCount} vendors, skipped ${skippedCount} (already kWp or empty).`);
  process.exit(0);
}

fixCapacityUnits().catch(e => { console.error(e); process.exit(1); });
