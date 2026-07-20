import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { SEED_VENDORS, SEED_USERS, SEED_PROJECTS, calculateStatus } from "./src/utils/seedData.js";
import { v4 as uuidv4 } from "uuid";

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

const initialNotifications = [
  { id: uuidv4(), type: 'warning', message: 'Vendor "SunPower Innovations" contract is expiring in 15 days.', targetRoles: ['admin', 'user'], timestamp: new Date(Date.now() - 3600000).toISOString(), readBy: [] },
  { id: uuidv4(), type: 'alert', message: 'New viewer role was successfully provisioned.', targetRoles: ['admin'], timestamp: new Date(Date.now() - 86400000).toISOString(), readBy: [] },
  { id: uuidv4(), type: 'success', message: 'Project "Desert Alpha" has successfully completed its planning phase.', targetRoles: ['admin', 'user', 'viewer'], timestamp: new Date(Date.now() - 172800000).toISOString(), readBy: [] },
];

const vendorsData = SEED_VENDORS.map(v => ({ ...v, status: calculateStatus(v.contractEnd) }));

console.log("Migrating data to Firestore Collections...");

import { writeBatch } from "firebase/firestore";

async function migrate() {
  try {
    let batch = writeBatch(db);
    let count = 0;

    const commitBatch = async () => {
      if (count > 0) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    };

    for (const v of vendorsData) {
      batch.set(doc(db, 'vendors', v.id), v);
      count++;
      if (count >= 490) await commitBatch();
    }
    
    for (const p of SEED_PROJECTS) {
      batch.set(doc(db, 'projects', p.id), p);
      count++;
      if (count >= 490) await commitBatch();
    }
    
    for (const u of SEED_USERS) {
      batch.set(doc(db, 'users', u.id), u);
      count++;
      if (count >= 490) await commitBatch();
    }
    
    for (const n of initialNotifications) {
      batch.set(doc(db, 'notifications', n.id), n);
      count++;
      if (count >= 490) await commitBatch();
    }
    
    await commitBatch();

    console.log("Success! Firebase collections initialized with new seed data.");
    process.exit(0);
  } catch (err) {
    console.error("Error updating firebase collections:", err);
    process.exit(1);
  }
}

migrate();
