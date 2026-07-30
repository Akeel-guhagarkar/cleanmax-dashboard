import React, { createContext, useReducer, useEffect, useContext, useState } from 'react';
import { SEED_VENDORS, SEED_USERS, SEED_PROJECTS, SEED_ARCHIVED_CONTRACTS, calculateStatus } from '../utils/seedData';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, deleteDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { normalizeRegion, formatDateToISO, parseFlexibleDate } from '../utils/constants';
import { notifyRenewal, notifyDeletion, notifyNewVendor, notifyNewProject, notifyNewUser, playNotificationSound } from '../utils/notify';

const ProcureContext = createContext();

const getInitialState = () => {
  const savedCurrentUser = sessionStorage.getItem('procure360_current_user');
  const savedDarkMode = localStorage.getItem('procure360_darkmode');

  let localVendors = null;
  let localProjects = null;
  let localUsers = null;
  let localDeleted = null;

  try {
    const version = localStorage.getItem('cleanmax_cache_v');
    if (version !== '20260730_v3') {
      localStorage.removeItem('cleanmax_deleted_records');
      localStorage.setItem('cleanmax_cache_v', '20260730_v3');
    } else {
      const dStr = localStorage.getItem('cleanmax_deleted_records');
      if (dStr) localDeleted = JSON.parse(dStr);
    }
    const vStr = localStorage.getItem('cleanmax_vendors');
    if (vStr) localVendors = JSON.parse(vStr);
    const pStr = localStorage.getItem('cleanmax_projects');
    if (pStr) localProjects = JSON.parse(pStr);
    const uStr = localStorage.getItem('cleanmax_users');
    if (uStr) localUsers = JSON.parse(uStr);
  } catch (e) {}

  return {
    vendors: (localVendors && localVendors.length > 0) ? localVendors : SEED_VENDORS,
    users: (localUsers && localUsers.length > 0) ? localUsers : SEED_USERS,
    projects: (localProjects && localProjects.length > 0) ? localProjects : SEED_PROJECTS,
    archivedContracts: SEED_ARCHIVED_CONTRACTS,
    currentUser: savedCurrentUser ? JSON.parse(savedCurrentUser) : null,
    isDarkMode: savedDarkMode === 'true',
    toasts: [],
    notifications: [],
    dismissedAlerts: [],
    uploadHistory: [],
    deletedRecords: localDeleted || [],
    isMaintenanceMode: localStorage.getItem('cleanmax_maintenance') === 'true',
  };
};

const initialState = getInitialState();

const normalizeVendorStr = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/pvt\.?\s*ltd\.?|private\s*limited|inc\.?|corp\.?|llp|gepl|solutions|energy/gi, '')
    .replace(/[^a-z0-9]/g, '');
};

export const getMatchingProjectsForVendors = (vendorsList, projectsList) => {
  if (!vendorsList || vendorsList.length === 0 || !projectsList || projectsList.length === 0) return [];
  
  const codes = new Set();
  const names = new Set();
  const normNames = new Set();
  const firstWords = new Set();

  vendorsList.forEach(v => {
    if (!v) return;
    if (v.vendorCode && String(v.vendorCode).trim() !== '—') {
      const c = String(v.vendorCode).trim().toLowerCase();
      codes.add(c);
      codes.add(String(v.vendorCode).trim());
    }
    if (v.vendorName) {
      const n = String(v.vendorName).trim().toLowerCase();
      names.add(n);
      const norm = normalizeVendorStr(v.vendorName);
      if (norm) normNames.add(norm);
      const words = n.split(/[\s\-.,]+/).filter(w => w.length > 3);
      if (words.length > 0) firstWords.add(words[0]);
    }
  });

  return projectsList.filter(p => {
    if (!p) return false;
    const pCode = p.vendorCode ? String(p.vendorCode).trim().toLowerCase() : '';
    if (pCode && pCode !== '—' && (codes.has(pCode) || codes.has(String(p.vendorCode).trim()))) return true;

    const pClient = p.client ? String(p.client).trim().toLowerCase() : '';
    if (pClient) {
      if (names.has(pClient)) return true;
      const pNorm = normalizeVendorStr(p.client);
      if (pNorm && normNames.has(pNorm)) return true;
      const pWords = pClient.split(/[\s\-.,]+/).filter(w => w.length > 3);
      if (pWords.length > 0 && firstWords.has(pWords[0])) return true;
    }
    return false;
  });
};

const vendorReducer = (state, action) => {
  switch (action.type) {
    case 'SYNC_COLLECTION': {
      const { key, data } = action.payload;
      if (Array.isArray(data)) {
        try {
          if (key === 'vendors' && data.length > 0) localStorage.setItem('cleanmax_vendors', JSON.stringify(data));
          if (key === 'projects' && data.length > 0) localStorage.setItem('cleanmax_projects', JSON.stringify(data));
          if (key === 'users' && data.length > 0) localStorage.setItem('cleanmax_users', JSON.stringify(data));
          if (key === 'deletedRecords') localStorage.setItem('cleanmax_deleted_records', JSON.stringify(data));
        } catch (e) {}
      }

      if (Array.isArray(data) && data.length === 0 && state[key] && state[key].length > 0 && key !== 'deletedRecords') {
        return state;
      }
      return {
        ...state,
        [key]: data,
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
      
      const remainingVendors = state.vendors.filter(v => v.id !== action.payload);
      const cascadeProjects = getMatchingProjectsForVendors([sv], state.projects || []);

      const cascadeDeleted = cascadeProjects.map(p => ({
        ...p,
        _deletedAt: new Date().toISOString(),
        _deletedBy: action.meta?.deletedBy || 'Admin',
        _deletedByRole: action.meta?.deletedByRole || 'admin',
        _recordType: 'project',
        _recycleBinId: `del-${p.id}`,
      }));
      const cascadeIds = new Set(cascadeProjects.map(p => p.id));

      return {
        ...state,
        vendors: remainingVendors,
        projects: state.projects.filter(p => !cascadeIds.has(p.id)),
        deletedRecords: [delRec, ...cascadeDeleted, ...state.deletedRecords]
      };
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

      const remainingVendors = state.vendors.filter(v => !action.payload.includes(v.id));
      const cascadeProjects = getMatchingProjectsForVendors(toDelete, state.projects || []);

      const cascadeDeleted = cascadeProjects.map(p => ({
        ...p,
        _deletedAt: new Date().toISOString(),
        _deletedBy: action.meta?.deletedBy || 'Admin',
        _deletedByRole: action.meta?.deletedByRole || 'admin',
        _recordType: 'project',
        _recycleBinId: `del-${p.id}`,
      }));
      const cascadeIds = new Set(cascadeProjects.map(p => p.id));

      return {
        ...state,
        vendors: remainingVendors,
        projects: state.projects.filter(p => !cascadeIds.has(p.id)),
        deletedRecords: [...newDeleted, ...cascadeDeleted, ...state.deletedRecords],
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
    case 'RESTORE_DELETED_MANY': {
      const idsToRestore = new Set(action.payload || []);
      const recordsToRestore = state.deletedRecords.filter(r => idsToRestore.has(r._recycleBinId) || idsToRestore.has(r.id));
      const remainingDeleted = state.deletedRecords.filter(r => !idsToRestore.has(r._recycleBinId) && !idsToRestore.has(r.id));

      const restoredVendors = [];
      const restoredProjects = [];
      const restoredUsers = [];
      const restoredUploads = [];

      recordsToRestore.forEach(r => {
        const { _deletedAt, _deletedBy, _deletedByRole, _recordType, _recycleBinId, ...cleanRecord } = r;
        if (_recordType === 'vendor') restoredVendors.push(cleanRecord);
        else if (_recordType === 'project') restoredProjects.push(cleanRecord);
        else if (_recordType === 'user') restoredUsers.push(cleanRecord);
        else if (_recordType === 'upload') restoredUploads.push(cleanRecord);
      });

      return {
        ...state,
        vendors: [...state.vendors, ...restoredVendors],
        projects: [...state.projects, ...restoredProjects],
        users: [...state.users, ...restoredUsers],
        uploadHistory: [...(state.uploadHistory || []), ...restoredUploads],
        deletedRecords: remainingDeleted
      };
    }
    case 'PERMANENT_DELETE_MANY': {
      const idsToDelete = new Set(action.payload || []);
      const newDeleted = state.deletedRecords.filter(r => !idsToDelete.has(r._recycleBinId) && !idsToDelete.has(r.id));
      try { localStorage.setItem('cleanmax_deleted_records', JSON.stringify(newDeleted)); } catch (e) {}
      return {
        ...state,
        deletedRecords: newDeleted
      };
    }
    case 'PERMANENT_DELETE': {
      const newDeleted = state.deletedRecords.filter(r => r._recycleBinId !== action.payload && r.id !== action.payload);
      try { localStorage.setItem('cleanmax_deleted_records', JSON.stringify(newDeleted)); } catch (e) {}
      return { ...state, deletedRecords: newDeleted };
    }
    case 'CLEAR_RECYCLE_BIN':
      try { localStorage.setItem('cleanmax_deleted_records', JSON.stringify([])); } catch (e) {}
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
      
    case 'IMPORT_EXCEL': {
      const incomingVendors = action.payload.vendors || [];
      const incomingProjects = action.payload.projects || [];

      // 1. Merge vendors in-place by ID or Plant Name + Vendor Code (Never create duplicates)
      const vendorMap = new Map();
      state.vendors.forEach(v => {
        const key = v.id || `${(v.plantName || '').toLowerCase().trim()}::${(v.vendorCode || '').toLowerCase().trim()}`;
        vendorMap.set(key, v);
      });

      incomingVendors.forEach(v => {
        const key = v.id || `${(v.plantName || '').toLowerCase().trim()}::${(v.vendorCode || '').toLowerCase().trim()}`;
        const existing = vendorMap.get(key);
        vendorMap.set(key, existing ? { ...existing, ...v } : v);
      });

      // 2. Merge projects in-place by ID or Project Name + Client
      const projectMap = new Map();
      state.projects.forEach(p => {
        const key = p.id || `${(p.projectName || '').toLowerCase().trim()}::${(p.client || '').toLowerCase().trim()}`;
        projectMap.set(key, p);
      });

      incomingProjects.forEach(p => {
        const key = p.id || `${(p.projectName || '').toLowerCase().trim()}::${(p.client || '').toLowerCase().trim()}`;
        const existing = projectMap.get(key);
        projectMap.set(key, existing ? { ...existing, ...p } : p);
      });

      return {
        ...state,
        vendors: Array.from(vendorMap.values()),
        projects: Array.from(projectMap.values()),
      };
    }
      
    case 'ADD_UPLOAD_HISTORY':
      return { ...state, uploadHistory: [{ id: action.payload.id, timestamp: new Date().toISOString(), ...action.payload }, ...state.uploadHistory] };
    case 'DELETE_UPLOAD_HISTORY':
      return { ...state, uploadHistory: state.uploadHistory.filter(h => h.id !== action.payload) };

    case 'SOFT_DELETE_UPLOAD': {
      const sh = state.uploadHistory.find(h => h.id === action.payload);
      if (!sh) return state;

      const vendorIdsToDelete = new Set(sh.vendorIds || []);
      const projectIdsToDelete = new Set(sh.projectIds || []);

      // Fallback matching for legacy records without explicit vendorIds array
      if (vendorIdsToDelete.size === 0 && sh.recordsCount > 0) {
        state.vendors.forEach(v => {
          if (v.createdAt && Math.abs(new Date(v.createdAt) - new Date(sh.timestamp)) < 180000) {
            vendorIdsToDelete.add(v.id);
          }
        });
      }

      if (projectIdsToDelete.size === 0 && sh.recordsCount > 0) {
        state.projects.forEach(p => {
          if (p.completionDate && Math.abs(new Date(p.completionDate) - new Date(sh.timestamp)) < 180000) {
            projectIdsToDelete.add(p.id);
          }
        });
      }

      const deletedVendors = state.vendors
        .filter(v => vendorIdsToDelete.has(v.id))
        .map(v => ({ ...v, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'vendor', _recycleBinId: `del-v-${v.id}` }));

      const deletedProjects = state.projects
        .filter(p => projectIdsToDelete.has(p.id))
        .map(p => ({ ...p, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'project', _recycleBinId: `del-p-${p.id}` }));

      const delUpload = { ...sh, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'upload', _recycleBinId: `del-${sh.id}` };

      return {
        ...state,
        uploadHistory: state.uploadHistory.filter(h => h.id !== action.payload),
        vendors: state.vendors.filter(v => !vendorIdsToDelete.has(v.id)),
        projects: state.projects.filter(p => !projectIdsToDelete.has(p.id)),
        deletedRecords: [delUpload, ...deletedVendors, ...deletedProjects, ...state.deletedRecords]
      };
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
    let unsubVendors, unsubProjects, unsubUsers, unsubNotifications, unsubDismissed, unsubHistory, unsubDeleted, unsubSettings, unsubArchived;
    
    try {
      unsubVendors = onSnapshot(collection(db, 'vendors'), (snapshot) => {
        const uniqueVendorsMap = new Map();
        const duplicateIdsToDelete = [];

        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data() || {};
          let start = data.contractStart;
          let end = data.contractEnd;
          
          if (start && end && formatDateToISO(start) === formatDateToISO(end)) {
            const sDate = parseFlexibleDate(start);
            if (sDate) {
              const healDate = new Date(sDate);
              healDate.setUTCFullYear(healDate.getUTCFullYear() + 2);
              end = formatDateToISO(healDate);
            }
          }

          const vendorObj = {
            ...data,
            id: data.id || docSnap.id,
            vendorCode: data.vendorCode || `VND-${docSnap.id.substring(0, 6)}`,
            vendorName: data.vendorName || 'Unknown Vendor',
            plantName: data.plantName || 'Unknown Plant',
            plantCapacity: Number(data.plantCapacity) || 0,
            capacityUnit: data.capacityUnit || 'kWp',
            rate: Number(data.rate) || 0,
            contractStart: start,
            contractEnd: end,
            region: normalizeRegion(data.region, data.state, data.city),
            status: calculateStatus(end)
          };

          const pName = (vendorObj.plantName || '').toLowerCase().trim();
          const vCode = (vendorObj.vendorCode || '').toLowerCase().trim();
          const vName = (vendorObj.vendorName || '').toLowerCase().trim();
          
          const isGeneric = (str) => !str || str === 'tbd' || str === '—' || str === 'unknown plant' || str === 'unknown vendor' || str === 'none';

          let dedupKey = vendorObj.id;
          if (!isGeneric(pName) && !isGeneric(vCode)) {
            dedupKey = `${pName}::${vCode}`;
          } else if (!isGeneric(pName) && !isGeneric(vName)) {
            dedupKey = `${pName}::${vName}`;
          }

          if (uniqueVendorsMap.has(dedupKey)) {
            const existing = uniqueVendorsMap.get(dedupKey);
            const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const currTime = new Date(vendorObj.updatedAt || vendorObj.createdAt || 0).getTime();
            
            if (currTime > existingTime) {
              duplicateIdsToDelete.push(existing.id);
              uniqueVendorsMap.set(dedupKey, vendorObj);
            } else {
              duplicateIdsToDelete.push(vendorObj.id);
            }
          } else {
            uniqueVendorsMap.set(dedupKey, vendorObj);
          }
        });

        if (duplicateIdsToDelete.length > 0) {
          (async () => {
            try {
              let b = writeBatch(db);
              let count = 0;
              for (const dId of duplicateIdsToDelete) {
                b.delete(doc(db, 'vendors', dId));
                count++;
                if (count >= 450) {
                  await b.commit();
                  b = writeBatch(db);
                  count = 0;
                }
              }
              if (count > 0) await b.commit();
            } catch (e) {}
          })();
        }

        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'vendors', data: Array.from(uniqueVendorsMap.values()) } });
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
        const historyItems = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        })).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'uploadHistory', data: historyItems } });
      });
      let isFirstNotifSync = true;
      unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
        const notifs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        if (!isFirstNotifSync) {
          const addedChanges = snapshot.docChanges().filter(c => c.type === 'added');
          if (addedChanges.length > 0) {
            try {
              const saved = sessionStorage.getItem('procure360_current_user');
              const currentUser = saved ? JSON.parse(saved) : null;
              if (currentUser?.notificationPrefs?.pushNotifications === true) {
                playNotificationSound();
              }
            } catch (e) {}
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
      unsubArchived = onSnapshot(collection(db, 'archivedContracts'), (snapshot) => {
        const archived = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => new Date(b.renewedAt || b.timestamp || 0) - new Date(a.renewedAt || a.timestamp || 0));
        dispatch({ type: 'SYNC_COLLECTION', payload: { key: 'archivedContracts', data: archived.length > 0 ? archived : SEED_ARCHIVED_CONTRACTS } });
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
      if (unsubArchived) unsubArchived();
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

  // Parallel Firestore Batch Commit Engine for 2000+ Record Datasets
  const commitOpsInParallel = React.useCallback(async (ops) => {
    if (!ops || ops.length === 0) return;
    const BATCH_LIMIT = 450;
    const batches = [];
    let currentBatch = writeBatch(db);
    let count = 0;

    for (const op of ops) {
      if (op.type === 'set') {
        currentBatch.set(op.ref, op.data, op.options || { merge: true });
      } else if (op.type === 'delete') {
        currentBatch.delete(op.ref);
      }
      count++;
      if (count >= BATCH_LIMIT) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      batches.push(currentBatch);
    }

    if (batches.length > 0) {
      for (const b of batches) {
        try {
          await b.commit();
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          console.warn("Firestore batch commit notice:", err?.message || err);
        }
      }
    }
  }, []);

  // Firebase wrapper for dispatch
  const asyncDispatch = React.useCallback(async (action) => {
    // Optimistically update UI
    dispatch(action);

    try {
      switch (action.type) {
        case 'ADD_VENDOR':
          await setDoc(doc(db, 'vendors', action.payload.id), action.payload, { merge: true });
          break;
        case 'UPDATE_VENDOR': {
          const existingVendor = (state.vendors || []).find(v => v.id === action.payload.id);
          const dateStatus = calculateStatus(action.payload.contractEnd);
          const newStatus = action.payload.manualStatus && action.payload.manualStatus !== '' ? action.payload.manualStatus : dateStatus;

          if (existingVendor) {
            const prevStatus = String(existingVendor.status || '').toLowerCase();
            if ((prevStatus.includes('expir') || prevStatus.includes('expired')) && newStatus === 'Active') {
              const autoSnapshot = {
                id: `renew-${uuidv4()}`,
                vendorId: existingVendor.id,
                vendorCode: existingVendor.vendorCode,
                vendorName: existingVendor.vendorName,
                oldVendorName: existingVendor.vendorName,
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
              await setDoc(doc(db, 'archivedContracts', autoSnapshot.id), autoSnapshot, { merge: true });
            }
          }

          const { manualStatus, ...cleanPayload } = action.payload;
          await setDoc(doc(db, 'vendors', cleanPayload.id), { ...cleanPayload, status: newStatus, updatedAt: new Date().toISOString() }, { merge: true });
          break;
        }
        case 'ADD_ARCHIVED_CONTRACT':
          await setDoc(doc(db, 'archivedContracts', action.payload.id), action.payload, { merge: true });
          break;
        case 'DELETE_VENDOR':
          await deleteDoc(doc(db, 'vendors', action.payload));
          break;
        case 'DELETE_VENDORS': {
          const ops = action.payload.map(id => ({ type: 'delete', ref: doc(db, 'vendors', id) }));
          await commitOpsInParallel(ops);
          break;
        }
        case 'SOFT_DELETE_VENDORS': {
          const recordsToSoftDelete = state.vendors.filter(v => action.payload.includes(v.id));
          const cascadeProjects = getMatchingProjectsForVendors(recordsToSoftDelete, state.projects || []);

          const ops = [];
          recordsToSoftDelete.forEach(v => {
            const recycleBinId = `del-${v.id}`;
            ops.push({ type: 'set', ref: doc(db, 'deletedRecords', recycleBinId), data: { ...v, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'vendor', _recycleBinId: recycleBinId } });
            ops.push({ type: 'delete', ref: doc(db, 'vendors', v.id) });
          });

          cascadeProjects.forEach(p => {
            const recycleBinId = `del-${p.id}`;
            ops.push({ type: 'set', ref: doc(db, 'deletedRecords', recycleBinId), data: { ...p, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'project', _recycleBinId: recycleBinId } });
            ops.push({ type: 'delete', ref: doc(db, 'projects', p.id) });
          });

          await commitOpsInParallel(ops);
          break;
        }
        case 'SOFT_DELETE_VENDOR': {
          const singleV = state.vendors.find(v => v.id === action.payload);
          if (singleV) {
            const ops = [];
            const recycleBinId = `del-${singleV.id}`;
            ops.push({ type: 'set', ref: doc(db, 'deletedRecords', recycleBinId), data: { ...singleV, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'vendor', _recycleBinId: recycleBinId } });
            ops.push({ type: 'delete', ref: doc(db, 'vendors', singleV.id) });

            const cascadeProjects = getMatchingProjectsForVendors([singleV], state.projects || []);

            cascadeProjects.forEach(p => {
              const pRecycleBinId = `del-${p.id}`;
              ops.push({ type: 'set', ref: doc(db, 'deletedRecords', pRecycleBinId), data: { ...p, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'project', _recycleBinId: pRecycleBinId } });
              ops.push({ type: 'delete', ref: doc(db, 'projects', p.id) });
            });

            await commitOpsInParallel(ops);
          }
          break;
        }
        case 'SOFT_DELETE_PROJECTS': {
          const projectsToSoftDelete = state.projects.filter(p => action.payload.includes(p.id));
          const ops = [];
          projectsToSoftDelete.forEach(p => {
            const recycleBinId = `del-${p.id}`;
            ops.push({ type: 'set', ref: doc(db, 'deletedRecords', recycleBinId), data: {
              ...p,
              _deletedAt: new Date().toISOString(),
              _deletedBy: action.meta?.deletedBy || 'Admin',
              _deletedByRole: action.meta?.deletedByRole || 'admin',
              _recordType: 'project',
              _recycleBinId: recycleBinId,
            }});
            ops.push({ type: 'delete', ref: doc(db, 'projects', p.id) });
          });
          await commitOpsInParallel(ops);
          break;
        }
        case 'RESTORE_DELETED': {
          const targetId = action.payload;
          const record = (state.deletedRecords || []).find(r => r._recycleBinId === targetId || r.id === targetId);
          if (record) {
            const { _deletedAt, _deletedBy, _deletedByRole, _recordType, _recycleBinId, ...cleanRecord } = record;
            let coll = 'vendors';
            if (_recordType === 'project') coll = 'projects';
            else if (_recordType === 'user') coll = 'users';
            else if (_recordType === 'upload') coll = 'uploadHistory';
            if (_recordType !== 'upload') {
              await setDoc(doc(db, coll, cleanRecord.id), cleanRecord, { merge: true });
            }
            const ops = [
              { type: 'delete', ref: doc(db, 'deletedRecords', targetId) }
            ];
            if (record._recycleBinId && record._recycleBinId !== targetId) {
              ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', record._recycleBinId) });
            }
            await commitOpsInParallel(ops);
          }
          break;
        }
        case 'RESTORE_DELETED_MANY': {
          const ids = action.payload || [];
          const recordsToRestore = (state.deletedRecords || []).filter(r => ids.includes(r._recycleBinId) || ids.includes(r.id));
          const ops = [];

          recordsToRestore.forEach(r => {
            const rId = r._recycleBinId || r.id;
            const { _deletedAt, _deletedBy, _deletedByRole, _recordType, _recycleBinId, ...cleanRecord } = r;
            let coll = 'vendors';
            if (_recordType === 'project') coll = 'projects';
            else if (_recordType === 'user') coll = 'users';
            else if (_recordType === 'upload') coll = 'uploadHistory';

            if (_recordType !== 'upload') {
              ops.push({ type: 'set', ref: doc(db, coll, cleanRecord.id), data: cleanRecord });
            }
            ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', rId) });
            if (r.id && r.id !== rId) {
              ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', r.id) });
            }
          });

          await commitOpsInParallel(ops);
          break;
        }
        case 'PERMANENT_DELETE': {
          const targetId = action.payload;
          if (targetId) {
            const ops = [{ type: 'delete', ref: doc(db, 'deletedRecords', targetId) }];
            if (!targetId.startsWith('del-')) {
              ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', `del-${targetId}`) });
              ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', `del-v-${targetId}`) });
              ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', `del-p-${targetId}`) });
            }
            await commitOpsInParallel(ops);
          }
          break;
        }
        case 'PERMANENT_DELETE_MANY': {
          const ids = action.payload || [];
          const ops = [];
          ids.forEach(id => {
            ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', id) });
            if (!id.startsWith('del-')) {
              ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', `del-${id}`) });
              ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', `del-v-${id}`) });
              ops.push({ type: 'delete', ref: doc(db, 'deletedRecords', `del-p-${id}`) });
            }
          });
          await commitOpsInParallel(ops);
          break;
        }
        case 'CLEAR_RECYCLE_BIN': {
          try {
            const snap = await getDocs(collection(db, 'deletedRecords'));
            const ops = snap.docs.map(docSnap => ({ type: 'delete', ref: doc(db, 'deletedRecords', docSnap.id) }));
            await commitOpsInParallel(ops);
          } catch (e) {
            console.error("Error clearing recycle bin in Firestore:", e);
          }
          break;
        }
        case 'ADD_PROJECT':
        case 'UPDATE_PROJECT':
          await setDoc(doc(db, 'projects', action.payload.id), action.payload, { merge: true });
          break;
        case 'DELETE_PROJECTS': {
          const ops = action.payload.map(id => ({ type: 'delete', ref: doc(db, 'projects', id) }));
          await commitOpsInParallel(ops);
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
            const ops = [
              { type: 'set', ref: doc(db, 'deletedRecords', recycleBinId), data: { ...suUser, _deletedAt: new Date().toISOString(), _deletedBy: action.meta?.deletedBy || 'Admin', _deletedByRole: action.meta?.deletedByRole || 'admin', _recordType: 'user', _recycleBinId: recycleBinId } },
              { type: 'delete', ref: doc(db, 'users', suUser.id) }
            ];
            await commitOpsInParallel(ops);
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
          const ops = [];
          state.notifications.forEach(n => {
            if (!n.targetRoles || n.targetRoles.includes(action.payload.role)) {
              const newReadBy = [...new Set([...(n.readBy || []), action.payload.userId, action.payload.role].filter(Boolean))];
              ops.push({ type: 'set', ref: doc(db, 'notifications', n.id), data: { readBy: newReadBy } });
            }
          });
          await commitOpsInParallel(ops);
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
          const ops = [];
          state.notifications.forEach(n => {
            if (!n.targetRoles || n.targetRoles.includes(action.payload.role)) {
              if (n.dedupeKey) {
                ops.push({ type: 'set', ref: doc(db, 'dismissedAlerts', n.dedupeKey), data: { timestamp: new Date().toISOString() } });
              }
              ops.push({ type: 'delete', ref: doc(db, 'notifications', n.id) });
            }
          });
          await commitOpsInParallel(ops);
          break;
        }
        case 'IMPORT_EXCEL': {
          const ops = [];
          for (const v of action.payload.vendors) {
            ops.push({ type: 'set', ref: doc(db, 'vendors', v.id), data: v });
          }
          for (const p of action.payload.projects) {
            ops.push({ type: 'set', ref: doc(db, 'projects', p.id), data: p });
          }
          await commitOpsInParallel(ops);
          break;
        }
        case 'ADD_UPLOAD_HISTORY':
          await setDoc(doc(db, 'uploadHistory', action.payload.id), { ...action.payload, timestamp: new Date().toISOString() }, { merge: true });
          break;
        case 'DELETE_UPLOAD_HISTORY': {
          const historyRecord = state.uploadHistory.find(h => h.id === action.payload);
          if (historyRecord) {
            const ops = [];
            if (historyRecord.vendorIds) {
              for (const vId of historyRecord.vendorIds) {
                ops.push({ type: 'delete', ref: doc(db, 'vendors', vId) });
              }
            }
            if (historyRecord.projectIds) {
              for (const pId of historyRecord.projectIds) {
                ops.push({ type: 'delete', ref: doc(db, 'projects', pId) });
              }
            }
            ops.push({ type: 'delete', ref: doc(db, 'uploadHistory', action.payload) });
            await commitOpsInParallel(ops);
          }
          break;
        }
        case 'SOFT_DELETE_UPLOAD': {
          const historyId = action.payload;
          const historyRecord = (state.uploadHistory || []).find(h => h.id === historyId);
          if (historyRecord) {
            const vendorIds = Array.from(new Set(historyRecord.vendorIds || []));
            const projectIds = Array.from(new Set(historyRecord.projectIds || []));
            const deletedBy = action.meta?.deletedBy || state.currentUser?.name || 'Admin';
            const deletedByRole = action.meta?.deletedByRole || state.currentUser?.role || 'admin';
            const now = new Date().toISOString();

            const ops = [];

            const delUpload = { ...historyRecord, _deletedAt: now, _deletedBy: deletedBy, _deletedByRole: deletedByRole, _recordType: 'upload', _recycleBinId: `del-${historyId}` };
            ops.push({ type: 'set', ref: doc(db, 'deletedRecords', `del-${historyId}`), data: delUpload });
            ops.push({ type: 'delete', ref: doc(db, 'uploadHistory', historyId) });

            for (const vId of vendorIds) {
              const vObj = (state.vendors || []).find(v => v.id === vId);
              if (vObj) {
                ops.push({ type: 'set', ref: doc(db, 'deletedRecords', `del-v-${vId}`), data: { ...vObj, _deletedAt: now, _deletedBy: deletedBy, _deletedByRole: deletedByRole, _recordType: 'vendor', _recycleBinId: `del-v-${vId}` } });
              }
              ops.push({ type: 'delete', ref: doc(db, 'vendors', vId) });
            }

            for (const pId of projectIds) {
              const pObj = (state.projects || []).find(p => p.id === pId);
              if (pObj) {
                ops.push({ type: 'set', ref: doc(db, 'deletedRecords', `del-p-${pId}`), data: { ...pObj, _deletedAt: now, _deletedBy: deletedBy, _deletedByRole: deletedByRole, _recordType: 'project', _recycleBinId: `del-p-${pId}` } });
              }
              ops.push({ type: 'delete', ref: doc(db, 'projects', pId) });
            }

            await commitOpsInParallel(ops);
          }
          break;
        }
      }
    } catch (e) {
      console.error("Firebase Sync Error (asyncDispatch):", e);
    }
  }, [state.vendors, state.projects, state.users, state.notifications, state.deletedRecords, state.uploadHistory]);

  const showToast = React.useCallback((message, type = 'success') => {
    asyncDispatch({ type: 'ADD_TOAST', payload: { message, type } });
  }, [asyncDispatch]);

  const contextValue = React.useMemo(() => ({
    state,
    dispatch: asyncDispatch,
    showToast
  }), [state, asyncDispatch, showToast]);

  return (
    <ProcureContext.Provider value={contextValue}>
      {children}
    </ProcureContext.Provider>
  );
};

export const useProcure = () => useContext(ProcureContext);
