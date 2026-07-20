import React, { createContext, useReducer, useEffect, useContext, useState } from 'react';
import { SEED_VENDORS, SEED_USERS, SEED_PROJECTS, calculateStatus } from '../utils/seedData';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, deleteDoc, writeBatch, collection } from 'firebase/firestore';

const ProcureContext = createContext();

const getInitialState = () => {
  const savedCurrentUser = localStorage.getItem('procure360_current_user');
  const savedDarkMode = localStorage.getItem('procure360_darkmode');
  return {
    vendors: [],
    users: [],
    projects: [],
    currentUser: savedCurrentUser ? JSON.parse(savedCurrentUser) : null,
    isDarkMode: savedDarkMode === 'true',
    toasts: [],
    notifications: [],
    uploadHistory: [],
  };
};

const initialState = getInitialState();

const vendorReducer = (state, action) => {
  switch (action.type) {
    case 'SYNC_COLLECTION': {
      return {
        ...state,
        [action.payload.key]: action.payload.data,
      };
    }
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'TOGGLE_DARK_MODE':
      return { ...state, isDarkMode: !state.isDarkMode };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { id: uuidv4(), ...action.payload }] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    
    // Local optimistic updates
    case 'ADD_VENDOR':
      return { ...state, vendors: [...state.vendors, { ...action.payload, status: calculateStatus(action.payload.contractEnd), createdAt: new Date().toISOString() }] };
    case 'UPDATE_VENDOR':
      return { ...state, vendors: state.vendors.map(v => v.id === action.payload.id ? { ...v, ...action.payload, status: calculateStatus(action.payload.contractEnd), updatedAt: new Date().toISOString() } : v) };
    case 'DELETE_VENDOR':
      return { ...state, vendors: state.vendors.filter(v => v.id !== action.payload) };
    case 'DELETE_VENDORS':
      return { ...state, vendors: state.vendors.filter(v => !action.payload.includes(v.id)) };
      
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? { ...u, ...action.payload } : u) };
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };
      
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, { ...action.payload, createdAt: new Date().toISOString() }] };
    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'DELETE_PROJECTS':
      return { ...state, projects: state.projects.filter(p => !action.payload.includes(p.id)) };
      
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [{ id: uuidv4(), timestamp: new Date().toISOString(), readBy: [], ...action.payload }, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload.notificationId ? { ...n, readBy: [...new Set([...(n.readBy || []), action.payload.userId])] } : n) };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => n.targetRoles.includes(action.payload.role) ? { ...n, readBy: [...new Set([...(n.readBy || []), action.payload.userId])] } : n) };
      
    case 'IMPORT_EXCEL':
      return {
        ...state,
        vendors: [...state.vendors, ...action.payload.vendors],
        projects: [...state.projects, ...action.payload.projects],
      };
      
    case 'ADD_UPLOAD_HISTORY':
      return { ...state, uploadHistory: [{ id: action.payload.id, timestamp: new Date().toISOString(), ...action.payload }, ...state.uploadHistory] };
    case 'DELETE_UPLOAD_HISTORY':
      return { ...state, uploadHistory: state.uploadHistory.filter(h => h.id !== action.payload) };

    default:
      return state;
  }
};

export const ProcureProvider = ({ children }) => {
  const [state, dispatch] = useReducer(vendorReducer, initialState);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize data from Firestore Collections
  useEffect(() => {
    let unsubVendors, unsubProjects, unsubUsers, unsubNotifications, unsubHistory;
    
    try {
      unsubVendors = onSnapshot(collection(db, 'vendors'), (snapshot) => {
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'vendors', data: snapshot.docs.map(doc => doc.data()) } });
      });
      unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'projects', data: snapshot.docs.map(doc => doc.data()) } });
      });
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'users', data: snapshot.docs.map(doc => doc.data()) } });
      });
      unsubHistory = onSnapshot(collection(db, 'uploadHistory'), (snapshot) => {
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'uploadHistory', data: snapshot.docs.map(doc => doc.data()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)) } });
      });
      unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'notifications', data: snapshot.docs.map(doc => doc.data()) } });
        setIsInitializing(false);
      });
    } catch (e) {
      console.error("Firebase Sync Error", e);
      setIsInitializing(false);
    }

    return () => {
      if (unsubVendors) unsubVendors();
      if (unsubProjects) unsubProjects();
      if (unsubUsers) unsubUsers();
      if (unsubNotifications) unsubNotifications();
      if (unsubHistory) unsubHistory();
    };
  }, []);

  useEffect(() => {
    if (state.currentUser) {
      localStorage.setItem('procure360_current_user', JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem('procure360_current_user');
    }
  }, [state.currentUser]);

  useEffect(() => {
    localStorage.setItem('procure360_darkmode', state.isDarkMode);
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.isDarkMode]);

  // Firebase wrapper for dispatch
  const asyncDispatch = async (action) => {
    // Optimistically update UI
    dispatch(action);

    try {
      switch (action.type) {
        case 'ADD_VENDOR':
        case 'UPDATE_VENDOR':
          await setDoc(doc(db, 'vendors', action.payload.id), action.payload, { merge: true });
          break;
        case 'DELETE_VENDOR':
          await deleteDoc(doc(db, 'vendors', action.payload));
          break;
        case 'DELETE_VENDORS': {
          const batchV = writeBatch(db);
          action.payload.forEach(id => batchV.delete(doc(db, 'vendors', id)));
          await batchV.commit();
          break;
        }
        case 'ADD_PROJECT':
        case 'UPDATE_PROJECT':
          await setDoc(doc(db, 'projects', action.payload.id), action.payload, { merge: true });
          break;
        case 'DELETE_PROJECTS': {
          const batchP = writeBatch(db);
          action.payload.forEach(id => batchP.delete(doc(db, 'projects', id)));
          await batchP.commit();
          break;
        }
        case 'ADD_USER':
        case 'UPDATE_USER':
          await setDoc(doc(db, 'users', action.payload.id), action.payload, { merge: true });
          break;
        case 'DELETE_USER':
          await deleteDoc(doc(db, 'users', action.payload));
          break;
        case 'ADD_NOTIFICATION':
          await setDoc(doc(db, 'notifications', action.payload.id || uuidv4()), { ...action.payload, timestamp: new Date().toISOString() }, { merge: true });
          break;
        case 'MARK_NOTIFICATION_READ': {
          const notif = state.notifications.find(n => n.id === action.payload.notificationId);
          if (notif) {
            const newReadBy = [...new Set([...(notif.readBy || []), action.payload.userId])];
            await setDoc(doc(db, 'notifications', action.payload.notificationId), { readBy: newReadBy }, { merge: true });
          }
          break;
        }
        case 'MARK_ALL_NOTIFICATIONS_READ': {
          const batchN = writeBatch(db);
          state.notifications.forEach(n => {
            if (n.targetRoles.includes(action.payload.role)) {
              const newReadBy = [...new Set([...(n.readBy || []), action.payload.userId])];
              batchN.set(doc(db, 'notifications', n.id), { readBy: newReadBy }, { merge: true });
            }
          });
          await batchN.commit();
          break;
        }
        case 'IMPORT_EXCEL': {
          // Batch process max 500 operations per batch
          let batch = writeBatch(db);
          let count = 0;
          
          for (const v of action.payload.vendors) {
            batch.set(doc(db, 'vendors', v.id), v, { merge: true });
            count++;
            if (count === 490) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
          for (const p of action.payload.projects) {
            batch.set(doc(db, 'projects', p.id), p, { merge: true });
            count++;
            if (count === 490) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
          if (count > 0) {
            await batch.commit();
          }
          break;
        }
        case 'ADD_UPLOAD_HISTORY':
          await setDoc(doc(db, 'uploadHistory', action.payload.id), { ...action.payload, timestamp: new Date().toISOString() }, { merge: true });
          break;
        case 'DELETE_UPLOAD_HISTORY': {
          const historyRecord = state.uploadHistory.find(h => h.id === action.payload);
          if (historyRecord) {
            
            // Optimistic local deletion
            if (historyRecord.vendorIds?.length) dispatch({ type: 'DELETE_VENDORS', payload: historyRecord.vendorIds });
            if (historyRecord.projectIds?.length) dispatch({ type: 'DELETE_PROJECTS', payload: historyRecord.projectIds });

            let delBatch = writeBatch(db);
            let delCount = 0;
            
            const processBatch = async () => {
              if (delCount > 0) {
                await delBatch.commit();
                delBatch = writeBatch(db);
                delCount = 0;
              }
            };
            
            if (historyRecord.vendorIds) {
              for (const vId of historyRecord.vendorIds) {
                delBatch.delete(doc(db, 'vendors', vId));
                delCount++;
                if (delCount === 490) await processBatch();
              }
            }
            if (historyRecord.projectIds) {
              for (const pId of historyRecord.projectIds) {
                delBatch.delete(doc(db, 'projects', pId));
                delCount++;
                if (delCount === 490) await processBatch();
              }
            }
            delBatch.delete(doc(db, 'uploadHistory', action.payload));
            delCount++;
            await processBatch();
          }
          break;
        }
      }
    } catch (e) {
      console.error("Firebase Sync Error (asyncDispatch):", e);
    }
  };

  const showToast = (message, type = 'success') => {
    asyncDispatch({ type: 'ADD_TOAST', payload: { message, type } });
  };

  return (
    <ProcureContext.Provider value={{ state, dispatch: asyncDispatch, showToast }}>
      {children}
    </ProcureContext.Provider>
  );
};

export const useProcure = () => useContext(ProcureContext);
