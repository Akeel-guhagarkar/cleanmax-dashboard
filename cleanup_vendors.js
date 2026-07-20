import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function cleanup() {
  const snapshot = await getDocs(collection(db, 'vendors'));
  const docs = snapshot.docs;
  
  console.log(`Found ${docs.length} total vendors in DB.`);
  
  const seenCodes = new Set();
  const toDelete = [];
  
  for (const document of docs) {
    const data = document.data();
    if (seenCodes.has(data.vendorCode)) {
      toDelete.push(document.id);
    } else {
      seenCodes.add(data.vendorCode);
    }
  }
  
  console.log(`Found ${toDelete.length} duplicates. Deleting...`);
  
  let count = 0;
  for (const id of toDelete) {
    await deleteDoc(doc(db, 'vendors', id));
    count++;
    if (count % 20 === 0) console.log(`Deleted ${count}...`);
  }
  
  console.log('Cleanup complete. Unique vendors left:', seenCodes.size);
  process.exit(0);
}

cleanup().catch(console.error);
