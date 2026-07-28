import React, { createContext, useReducer, useEffect, useContext, useState } from 'react';
import { SEED_VENDORS, SEED_USERS, SEED_PROJECTS, SEED_ARCHIVED_CONTRACTS, calculateStatus } from '../utils/seedData';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, deleteDoc, writeBatch, collection } from 'firebase/firestore';
import { normalizeRegion } from '../utils/constants';
import { notifyRenewal, notifyDeletion, notifyNewVendor, notifyNewProject, notifyNewUser, playNotificationSound } from '../utils/notify';

const ProcureContext = createContext();

const getInitialState = () => {
  const savedCurrentUser = sessionStorage.getItem('procure360_current_user');
  const savedDarkMode = localStorage.getItem('procure360_darkmode');
  return {
    vendors: [],
    users: [],
    projects: [],
    archivedContracts: SEED_ARCHIVED_CONTRACTS,
    currentUser: savedCurrentUser ? JSON.parse(savedCurrentUser) : null,
    isDarkMode: savedDarkMode === 'true',
    toasts: [],
    notifications: [],
    dismissedAlerts: [],
    uploadHistory: [],
    deletedRecords: [],
    isMaintenanceMode: localStorage.getItem('cleanmax_maintenance') === 'true',
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
    case 'SET_MAINTENANCE_MODE':
      return { ...state, isMaintenanceMode: action.payload };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { id: uuidv4(), ...action.payload }] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    
    // Local optimistic updates
    case 'ADD_VENDOR':
      return { ...state, vendors: [...state.vendors, { ...action.payload, status: calculateStatus(action.payload.contractEnd), createdAt: new Date().toISOString() }] };
    case 'UPDATE_VENDOR': {
      const existingVendor = state.vendors.find(v => v.id === action.payload.id);
      // If user manually set a status in the edit form, honour it; else auto-calculate
      const dateStatus = calculateStatus(action.payload.contractEnd);
      const newStatus = action.payload.manualStatus && action.payload.manualStatus !== '' ? action.payload.manualStatus : dateStatus;
      let updatedArchived = state.archivedContracts || [];

      // Auto-archive trigger: previous status was Expired/Expiring Soon AND effective new status is Active
      if (existingVendor) {
        const prevStatus = String(existingVendor.status || '').toLowerCase();
        if ((prevStatus.includes('expir') || prevStatus.includes('expired')) && newStatus === 'Active') {
          const autoSnapshot = {
            id: `renew-${uuidv4()}`,
            vendorId: existingVendor.id,
            vendorCode: existingVendor.vendorCode,
            // Old vendor (before edit)
            vendorName: existingVendor.vendorName,
            oldVendorName: existingVendor.vendorName,
            // New vendor (after edit - may be changed)
            newVendorName: action.payload.vendorName !== existingVendor.vendorName ? action.payload.vendorName : null,
            plantName: existingVendor.plantName,
            region: existingVendor.region,
            state: existingVendor.state,
            city: existingVendor.city,
            oldPoNumber: existingVendor.poNumber,
            newPoNumber: action.payload.poNumber || existingVendor.poNumber,
            oldRate: Number(existingVendor.rate) || 0,
            newRate: Number(action.payload.rate) || Number(existingVendor.rate) || 0,
            oldContractStart: existingVendor.contractStart,
            oldContractEnd: existingVendor.contractEnd,
            newContractStart: action.payload.contractStart || existingVendor.contractStart,
            newContractEnd: action.payload.contractEnd || existingVendor.contractEnd,
            plantCapacity: existingVendor.plantCapacity,
            capacityUnit: existingVendor.capacityUnit,
            renewalStatus: 'Renewed',
            renewedAt: new Date().toISOString(),
            renewedBy: state.currentUser?.name || 'System User',
            renewedByRole: state.currentUser?.role || 'Admin',
          };
          updatedArchived = [autoSnapshot, ...updatedArchived];
          // Fire renewal notification (once, immediately after renewal detected)
          setTimeout(() => {
            notifyRenewal(action._dispatch || (() => {}), {
              vendorName: existingVendor.vendorName,
              plantName: existingVendor.plantName,
              newEndDate: action.payload.contractEnd || existingVendor.contractEnd,
              actorName: state.currentUser?.name || 'System',
            });
          }, 100);
        }
      }

      // Strip manualStatus from the saved record so it doesn't persist incorrectly
      const { manualStatus, ...payloadWithoutManualStatus } = action.payload;

      return {
        ...state,
        archivedContracts: updatedArchived,
        vendors: state.vendors.map(v => v.id === action.payload.id
          ? { ...v, ...payloadWithoutManualStatus, status: newStatus, updatedAt: new Date().toISOString() }
          : v)
      };
    }
    case 'ADD_ARCHIVED_CONTRACT':
      return { ...state, archivedContracts: [action.payload, ...(state.archivedContracts || [])] };
    case 'DELETE_VENDOR':
      return { ...state, vendors: state.vendors.filter(v => v.id !== action.payload) };
    case 'DELETE_VENDORS':
      return { ...state, vendors: state.vendors.filter(v => !action.payload.includes(v.id)) };

    case 'SOFT_DELETE_VENDOR': {
      const sv = state.vendors.find(v => v.id === action.payload);
      if (!sv) return state;
      const delRec = { ...sv, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'vendor', _recycleBinId: `del-${sv.id}` };
      return { ...state, vendors: state.vendors.filter(v => v.id !== action.payload), deletedRecords: [delRec, ...state.deletedRecords] };
    }

    case 'SOFT_DELETE_VENDORS': {
      const toDelete = state.vendors.filter(v => action.payload.includes(v.id));
      const newDeleted = toDelete.map(v => ({
        ...v,
        _deletedAt: new Date().toISOString(),
        _deletedBy: action.meta?.deletedBy || 'Admin',
        _deletedByRole: action.meta?.deletedByRole || 'admin',
        _recordType: 'vendor',
        _recycleBinId: `del-${v.id}`,
      }));
      return {
        ...state,
        vendors: state.vendors.filter(v => !action.payload.includes(v.id)),
        deletedRecords: [...newDeleted, ...state.deletedRecords],
      };
    }
    case 'SOFT_DELETE_PROJECTS': {
      const toDeleteP = state.projects.filter(p => action.payload.includes(p.id));
      const newDeletedP = toDeleteP.map(p => ({
        ...p,
        _deletedAt: new Date().toISOString(),
        _deletedBy: action.meta?.deletedBy || 'Admin',
        _deletedByRole: action.meta?.deletedByRole || 'admin',
        _recordType: 'project',
        _recycleBinId: `del-${p.id}`,
      }));
      return {
        ...state,
        projects: state.projects.filter(p => !action.payload.includes(p.id)),
        deletedRecords: [...newDeletedP, ...state.deletedRecords],
      };
    }
    case 'RESTORE_DELETED': {
      const record = state.deletedRecords.find(r => r._recycleBinId === action.payload);
      if (!record) return state;
      const { _deletedAt, _deletedBy, _deletedByRole, _recordType, _recycleBinId, ...cleanRecord } = record;
      const remaining = state.deletedRecords.filter(r => r._recycleBinId !== action.payload);
      if (_recordType === 'vendor') {
        return { ...state, vendors: [...state.vendors, cleanRecord], deletedRecords: remaining };
      } else if (_recordType === 'project') {
        return { ...state, projects: [...state.projects, cleanRecord], deletedRecords: remaining };
      } else if (_recordType === 'user') {
        return { ...state, users: [...state.users, cleanRecord], deletedRecords: remaining };
      } else if (_recordType === 'upload') {
        return { ...state, uploadHistory: [...(state.uploadHistory || []), cleanRecord], deletedRecords: remaining };
      }
      return { ...state, deletedRecords: remaining };
    }
    case 'PERMANENT_DELETE':
      return { ...state, deletedRecords: state.deletedRecords.filter(r => r._recycleBinId !== action.payload) };
    case 'CLEAR_RECYCLE_BIN':
      return { ...state, deletedRecords: [] };
      
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER': {
      const updatedUsers = state.users.map(u => u.id === action.payload.id ? { ...u, ...action.payload } : u);
      const isSelf = state.currentUser && state.currentUser.id === action.payload.id;
      const updatedCurrentUser = isSelf ? { ...state.currentUser, ...action.payload } : state.currentUser;
      if (isSelf) {
        sessionStorage.setItem('procure360_current_user', JSON.stringify(updatedCurrentUser));
      }
      return { 
        ...state, 
        users: updatedUsers,
        currentUser: updatedCurrentUser
      };
    }
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };

    case 'SOFT_DELETE_USER': {
      const su = state.users.find(u => u.id === action.payload);
      if (!su) return state;
      const delUser = { ...su, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'user', _recycleBinId: `del-${su.id}` };
      return { ...state, users: state.users.filter(u => u.id !== action.payload), deletedRecords: [delUser, ...state.deletedRecords] };
    }
      
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, { ...action.payload, createdAt: new Date().toISOString() }] };
    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'DELETE_PROJECTS':
      return { ...state, projects: state.projects.filter(p => !action.payload.includes(p.id)) };
      
    case 'ADD_NOTIFICATION': {
      const MAX_NOTIFICATIONS = 50;
      // Build updated list: prepend new, dedupe by id
      const dedupedList = [action.payload, ...state.notifications.filter(n => n.id !== action.payload.id)];
      // If over cap, trim oldest entries from the end (FIFO)
      const cappedList = dedupedList.length > MAX_NOTIFICATIONS
        ? dedupedList.slice(0, MAX_NOTIFICATIONS)
        : dedupedList;
      return { ...state, notifications: cappedList };
    }
    case 'MARK_NOTIFICATION_READ':
      return { 
        ...state, 
        notifications: state.notifications.map(n => 
          n.id === action.payload.notificationId 
            ? { ...n, readBy: [...new Set([...(n.readBy || []), action.payload.userId, action.payload.role].filter(Boolean))] } 
            : n
        ) 
      };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { 
        ...state, 
        notifications: state.notifications.map(n =>
          (!n.targetRoles || n.targetRoles.includes(action.payload.role)) 
            ? { ...n, readBy: [...new Set([...(n.readBy || []), action.payload.userId, action.payload.role].filter(Boolean))] } 
            : n
        ) 
      };
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload.notificationId)
      };
    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.targetRoles && !n.targetRoles.includes(action.payload.role))
      };
      
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

    case 'SOFT_DELETE_UPLOAD': {
      const sh = state.uploadHistory.find(h => h.id === action.payload);
      if (!sh) return state;
      const delUpload = { ...sh, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'upload', _recycleBinId: `del-${sh.id}` };
      return { ...state, uploadHistory: state.uploadHistory.filter(h => h.id !== action.payload), deletedRecords: [delUpload, ...state.deletedRecords] };
    }

    default:
      return state;
  }
};

export const ProcureProvider = ({ children }) => {
  const [state, dispatch] = useReducer(vendorReducer, initialState);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize data from Firestore Collections
  useEffect(() => {
    let unsubVendors, unsubProjects, unsubUsers, unsubNotifications, unsubDismissed, unsubHistory, unsubDeleted, unsubSettings;
    
    try {
      unsubVendors = onSnapshot(collection(db, 'vendors'), (snapshot) => {
        const vendors = snapshot.docs.map(doc => {
          const data = doc.data() || {};
          return {
            ...data,
            id: data.id || doc.id,
            vendorCode: data.vendorCode || `VND-${doc.id.substring(0, 6)}`,
            vendorName: data.vendorName || 'Unknown Vendor',
            plantName: data.plantName || 'Unknown Plant',
            plantCapacity: Number(data.plantCapacity) || 0,
            capacityUnit: data.capacityUnit || 'kWp',
            rate: Number(data.rate) || 0,
            region: normalizeRegion(data.region),
            status: calculateStatus(data.contractEnd)
          };
        });
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'vendors', data: vendors } });
      });
      unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
        const projects = snapshot.docs.map(doc => {
          const data = doc.data() || {};
          return {
            ...data,
            id: data.id || doc.id,
            projectCode: data.projectCode || `PRJ-${doc.id.substring(0, 6)}`,
            projectName: data.projectName || 'Unnamed Project',
            client: data.client || 'Unknown Client',
            capacity: Number(data.capacity) || 0,
            unit: data.unit || 'MWp',
            status: data.status || 'Planning'
          };
        });
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'projects', data: projects } });
      });
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const users = snapshot.docs.map(docSnap => {
          const data = docSnap.data() || {};
          const id = data.id || docSnap.id;
          const rawEmail = data.email || '';
          if (rawEmail.toLowerCase().endsWith('@cleanmax.energy')) {
            const newEmail = rawEmail.replace(/@cleanmax\.energy$/i, '@cleanmax.com');
            setDoc(doc(db, 'users', id), { email: newEmail }, { merge: true }).catch(() => {});
            return { ...data, id, email: newEmail };
          }
          return { ...data, id };
        });
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'users', data: users } });
        
        // Also keep currentUser session in sync if updated in Firestore
        const savedUser = sessionStorage.getItem('procure360_current_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          const freshUser = users.find(u => u.id === parsed.id);
          if (freshUser) {
            sessionStorage.setItem('procure360_current_user', JSON.stringify(freshUser));
            dispatch({ type: 'LOGIN', payload: freshUser });
          }
        }
      });
      unsubHistory = onSnapshot(collection(db, 'uploadHistory'), (snapshot) => {
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'uploadHistory', data: snapshot.docs.map(doc => doc.data()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)) } });
      });
      let isFirstNotifSync = true;
      unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        const notifs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        if (!isFirstNotifSync) {
          const addedChanges = snapshot.docChanges().filter(c => c.type === 'added');
          if (addedChanges.length > 0) {
            playNotificationSound();
          }
        }
        isFirstNotifSync = false;

        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'notifications', data: notifs } });
        setIsInitializing(false);
      });
      unsubDismissed = onSnapshot(collection(db, 'dismissedAlerts'), (snapshot) => {
        const keys = snapshot.docs.map(doc => doc.id);
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'dismissedAlerts', data: keys } });
      });
      unsubDeleted = onSnapshot(collection(db, 'deletedRecords'), (snapshot) => {
        const deleted = snapshot.docs
          .map(doc => ({ ...doc.data(), _recycleBinId: doc.id }))
          .sort((a, b) => new Date(b._deletedAt || 0) - new Date(a._deletedAt || 0));
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'deletedRecords', data: deleted } });
      });
      unsubSettings = onSnapshot(collection(db, 'systemSettings'), (snapshot) => {
        const configDoc = snapshot.docs.find(d => d.id === 'global_config');
        const isModeOn = configDoc 
          ? Boolean(configDoc.data()?.maintenanceMode) 
          : (localStorage.getItem('cleanmax_maintenance') === 'true');
        localStorage.setItem('cleanmax_maintenance', String(isModeOn));
        dispatch({ type: 'SET_MAINTENANCE_MODE', payload: isModeOn });
      }, (err) => {
        console.warn("systemSettings collection snapshot listener error:", err);
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
      if (unsubDismissed) unsubDismissed();
      if (unsubHistory) unsubHistory();
      if (unsubDeleted) unsubDeleted();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (state.currentUser) {
      sessionStorage.setItem('procure360_current_user', JSON.stringify(state.currentUser));
    } else {
      sessionStorage.removeItem('procure360_current_user');
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
        case 'SOFT_DELETE_VENDORS': {
          const batchSV = writeBatch(db);
          const recordsToSoftDelete = state.vendors.filter(v => action.payload.includes(v.id));
          recordsToSoftDelete.forEach(v => {
            const recycleBinId = `del-${v.id}`;
            batchSV.set(doc(db, 'deletedRecords', recycleBinId), { ...v, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'vendor', _recycleBinId: recycleBinId });
            batchSV.delete(doc(db, 'vendors', v.id));
          });
          await batchSV.commit();
          break;
        }
        case 'SOFT_DELETE_VENDOR': {
          const singleV = state.vendors.find(v => v.id === action.payload);
          if (singleV) {
            const recycleBinId = `del-${singleV.id}`;
            const batchSingle = writeBatch(db);
            batchSingle.set(doc(db, 'deletedRecords', recycleBinId), { ...singleV, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'vendor', _recycleBinId: recycleBinId });
            batchSingle.delete(doc(db, 'vendors', singleV.id));
            await batchSingle.commit();
          }
          break;
        }
        case 'SOFT_DELETE_PROJECTS': {
          const batchSP = writeBatch(db);
          const projectsToSoftDelete = state.projects.filter(p => action.payload.includes(p.id));
          projectsToSoftDelete.forEach(p => {
            const recycleBinId = `del-${p.id}`;
            batchSP.set(doc(db, 'deletedRecords', recycleBinId), {
              ...p,
              _deletedAt: new Date().toISOString(),
              _deletedBy: action.meta?.deletedBy || 'Admin',
              _deletedByRole: action.meta?.deletedByRole || 'admin',
              _recordType: 'project',
              _recycleBinId: recycleBinId,
            });
            batchSP.delete(doc(db, 'projects', p.id));
          });
          await batchSP.commit();
          break;
        }
        case 'RESTORE_DELETED': {
          const record = state.deletedRecords.find(r => r._recycleBinId === action.payload);
          if (record) {
            const { _deletedAt, _deletedBy, _deletedByRole, _recordType, _recycleBinId, ...cleanRecord } = record;
            let coll = 'vendors';
            if (_recordType === 'project') coll = 'projects';
            else if (_recordType === 'user') coll = 'users';
            else if (_recordType === 'upload') coll = 'uploadHistory';
            if (_recordType !== 'upload') {
              await setDoc(doc(db, coll, cleanRecord.id), cleanRecord, { merge: true });
            }
            await deleteDoc(doc(db, 'deletedRecords', action.payload));
          }
          break;
        }
        case 'PERMANENT_DELETE':
          await deleteDoc(doc(db, 'deletedRecords', action.payload));
          break;
        case 'CLEAR_RECYCLE_BIN': {
          const batchCR = writeBatch(db);
          state.deletedRecords.forEach(r => batchCR.delete(doc(db, 'deletedRecords', r._recycleBinId)));
          await batchCR.commit();
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
        case 'SOFT_DELETE_USER': {
          const suUser = state.users.find(u => u.id === action.payload);
          if (suUser) {
            const recycleBinId = `del-${suUser.id}`;
            const batchU = writeBatch(db);
            batchU.set(doc(db, 'deletedRecords', recycleBinId), { ...suUser, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'user', _recycleBinId: recycleBinId });
            batchU.delete(doc(db, 'users', suUser.id));
            await batchU.commit();
          }
          break;
        }
        case 'ADD_NOTIFICATION': {
          const notifId = action.payload.id || uuidv4();
          const notifData = {
            ...action.payload,
            id: notifId,
            timestamp: action.payload.timestamp || new Date().toISOString()
          };
          await setDoc(doc(db, 'notifications', notifId), notifData, { merge: true });
          break;
        }
        case 'MARK_NOTIFICATION_READ': {
          const notif = state.notifications.find(n => n.id === action.payload.notificationId);
          if (notif) {
            const newReadBy = [...new Set([...(notif.readBy || []), action.payload.userId, action.payload.role].filter(Boolean))];
            await setDoc(doc(db, 'notifications', action.payload.notificationId), { readBy: newReadBy }, { merge: true });
          }
          break;
        }
        case 'MARK_ALL_NOTIFICATIONS_READ': {
          const batchN = writeBatch(db);
          let countN = 0;
          state.notifications.forEach(n => {
            if (!n.targetRoles || n.targetRoles.includes(action.payload.role)) {
              const newReadBy = [...new Set([...(n.readBy || []), action.payload.userId, action.payload.role].filter(Boolean))];
              batchN.set(doc(db, 'notifications', n.id), { readBy: newReadBy }, { merge: true });
              countN++;
            }
          });
          if (countN > 0) {
            await batchN.commit();
          }
          break;
        }
        case 'DELETE_NOTIFICATION': {
          if (action.payload.notificationId) {
            const notif = state.notifications.find(n => n.id === action.payload.notificationId);
            if (notif && notif.dedupeKey) {
              await setDoc(doc(db, 'dismissedAlerts', notif.dedupeKey), { timestamp: new Date().toISOString() }, { merge: true });
            }
            await deleteDoc(doc(db, 'notifications', action.payload.notificationId));
          }
          break;
        }
        case 'CLEAR_ALL_NOTIFICATIONS': {
          const batchC = writeBatch(db);
          let countC = 0;
          state.notifications.forEach(n => {
            if (!n.targetRoles || n.targetRoles.includes(action.payload.role)) {
              if (n.dedupeKey) {
                batchC.set(doc(db, 'dismissedAlerts', n.dedupeKey), { timestamp: new Date().toISOString() }, { merge: true });
              }
              batchC.delete(doc(db, 'notifications', n.id));
              countC++;
            }
          });
          if (countC > 0) {
            await batchC.commit();
          }
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
