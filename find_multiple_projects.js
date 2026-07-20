import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function findVendorsWithMultipleProjects() {
  const snapshot = await getDocs(collection(db, 'vendors'));
  const firebaseVendors = snapshot.docs.map(doc => doc.data());
  
  const vendorMap = new Map();
  firebaseVendors.forEach(v => {
    const name = v.vendorName || 'Unknown';
    if (!vendorMap.has(name)) {
      vendorMap.set(name, 0);
    }
    vendorMap.set(name, vendorMap.get(name) + 1);
  });
  
  console.log('Vendors with more than 1 project:');
  const results = [];
  vendorMap.forEach((count, name) => {
    if (count > 1) {
      results.push({ name, count });
    }
  });
  
  results.sort((a, b) => b.count - a.count);
  
  results.forEach(v => {
    console.log(`- ${v.name}: ${v.count} projects`);
  });
  
  if (results.length === 0) {
    console.log("No vendors have more than 1 project.");
  }
  
  process.exit(0);
}

findVendorsWithMultipleProjects().catch(console.error);
