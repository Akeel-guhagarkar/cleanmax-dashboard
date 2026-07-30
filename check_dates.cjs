const { initializeApp } = require("firebase/app");
const { getFirestore, getDocs, collection } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyBU0vnY8f8yALba0Na4ZQnQAfya4zeitRI",
  authDomain: "cleanmax-dashboard.firebaseapp.com",
  projectId: "cleanmax-dashboard",
  storageBucket: "cleanmax-dashboard.firebasestorage.app",
  messagingSenderId: "274045208324",
  appId: "1:274045208324:web:05539f3f109400ea91b251"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDates() {
  const snap = await getDocs(collection(db, 'vendors'));
  console.log("Found", snap.size, "vendors in Firestore.");
  let countSameDate = 0;
  snap.forEach(d => {
    const data = d.data();
    if (data.contractStart === data.contractEnd) {
      countSameDate++;
      console.log(`SAME DATE -> ID: ${d.id} | Plant: ${data.plantName} | Vendor: ${data.vendorName} | Start: ${data.contractStart} | End: ${data.contractEnd}`);
    } else if (data.plantName && (data.plantName.includes('Brookfield') || data.plantName.includes('Sigma'))) {
      console.log(`MATCH -> ID: ${d.id} | Plant: ${data.plantName} | Vendor: ${data.vendorName} | Start: ${data.contractStart} | End: ${data.contractEnd}`);
    }
  });
  console.log("Total records where Start === End:", countSameDate);
  process.exit(0);
}

checkDates().catch(console.error);
