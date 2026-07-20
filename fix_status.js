import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, writeBatch, doc } from "firebase/firestore";
import { calculateStatus } from "./src/utils/seedData.js";

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

async function fixStatus() {
  try {
    let batch = writeBatch(db);
    let count = 0;
    let totalUpdated = 0;
    
    const processBatch = async () => {
      if (count > 0) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    };

    const vendorsRef = collection(db, 'vendors');
    const vendorsSnap = await getDocs(vendorsRef);
    vendorsSnap.forEach(d => {
      const data = d.data();
      if (!data.status) {
        batch.update(d.ref, { status: calculateStatus(data.contractEnd) });
        count++;
        totalUpdated++;
      }
    });

    await processBatch();

    const projectsRef = collection(db, 'projects');
    const projectsSnap = await getDocs(projectsRef);
    projectsSnap.forEach(d => {
      const data = d.data();
      if (data.status === 'In Progress' && data.completionDate) {
        // recalculate
        const newStatus = calculateStatus(data.completionDate) === 'Active' ? 'In Progress' : 'Completed';
        if (newStatus !== data.status) {
          batch.update(d.ref, { status: newStatus });
          count++;
          totalUpdated++;
        }
      } else if (!data.status && data.completionDate) {
        const newStatus = calculateStatus(data.completionDate) === 'Active' ? 'In Progress' : 'Completed';
        batch.update(d.ref, { status: newStatus });
        count++;
        totalUpdated++;
      }
    });

    await processBatch();
    console.log("Success! Updated " + totalUpdated + " records with missing statuses.");
    process.exit(0);
  } catch (e) {
    console.error("Error fixing statuses:", e);
    process.exit(1);
  }
}

fixStatus();
