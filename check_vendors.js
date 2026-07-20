import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";

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

async function check() {
  const snap = await getDocs(collection(db, 'vendors'));
  const names = new Set();
  const codes = new Set();
  snap.forEach(d => {
    const data = d.data();
    names.add(data.vendorName?.trim().toLowerCase());
    codes.add(data.vendorCode?.trim());
  });
  console.log("Total entries:", snap.size);
  console.log("Unique names:", names.size);
  console.log("Unique codes:", codes.size);
  console.log(Array.from(codes));
  process.exit(0);
}
check();
