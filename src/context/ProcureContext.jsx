import React, { createContext, useReducer, useEffect, useContext } from 'react';
import { SEED_VENDORS, SEED_USERS, SEED_PROJECTS, calculateStatus } from '../utils/seedData';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const ProcureContext = createContext();

const getInitialState = () => {
  const savedCurrentUser = localStorage.getItem('procure360_current_user');
  const savedDarkMode = localStorage.getItem('procure360_darkmode');
  return {
    vendors: [],
    users: [],
    projects: [],
    currentUser: savedCurrentUser ? JSON.parse(savedCurrentUser) : null,
    lastSynced: null,
    isDarkMode: savedDarkMode === 'true',
    toasts: [],
    notifications: [],
  };
};

const initialState = getInitialState();

const vendorReducer = (state, action) => {
  switch (action.type) {
    case 'SYNC_FROM_FIREBASE': {
      const newUsers = action.payload.users || [];
      const updatedCurrentUser = state.currentUser ? newUsers.find(u => u.email === state.currentUser.email) || state.currentUser : null;
      return {
        ...state,
        vendors: action.payload.vendors || [],
        users: newUsers,
        projects: action.payload.projects || [],
        notifications: action.payload.notifications || [],
        currentUser: updatedCurrentUser,
        // don't touch lastSynced to avoid infinite loops
      };
    }
    case 'LOGIN':
      return {
        ...state,
        currentUser: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        currentUser: null,
      };
    case 'ADD_USER':
      return {
        ...state,
        users: [...state.users, action.payload],
        lastSynced: new Date().toISOString(),
      };
    case 'UPDATE_USER': {
      const updatedUsers = state.users.map(u => u.id === action.payload.id ? { ...u, ...action.payload } : u);
      const isCurrentUser = state.currentUser?.id === action.payload.id;
      return {
        ...state,
        users: updatedUsers,
        currentUser: isCurrentUser ? { ...state.currentUser, ...action.payload } : state.currentUser,
        lastSynced: new Date().toISOString(),
      };
    }
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(u => u.id !== action.payload),
        lastSynced: new Date().toISOString(),
      };
    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [...state.projects, { ...action.payload, id: uuidv4(), createdAt: new Date().toISOString() }],
        lastSynced: new Date().toISOString(),
      };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p),
        lastSynced: new Date().toISOString(),
      };
    case 'DELETE_PROJECTS':
      return {
        ...state,
        projects: state.projects.filter(p => !action.payload.includes(p.id)),
        lastSynced: new Date().toISOString(),
      };
    case 'ADD_VENDOR':
      const newVendor = {
        ...action.payload,
        id: uuidv4(),
        status: calculateStatus(action.payload.contractEnd),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        vendors: [...state.vendors, newVendor],
        lastSynced: new Date().toISOString(),
      };
    case 'UPDATE_VENDOR':
      return {
        ...state,
        vendors: state.vendors.map(v => 
          v.id === action.payload.id 
            ? { ...v, ...action.payload, status: calculateStatus(action.payload.contractEnd), updatedAt: new Date().toISOString() } 
            : v
        ),
        lastSynced: new Date().toISOString(),
      };
    case 'DELETE_VENDOR':
      return {
        ...state,
        vendors: state.vendors.filter(v => v.id !== action.payload),
        lastSynced: new Date().toISOString(),
      };
    case 'DELETE_VENDORS':
      return {
        ...state,
        vendors: state.vendors.filter(v => !action.payload.includes(v.id)),
        lastSynced: new Date().toISOString(),
      };
    case 'TOGGLE_DARK_MODE':
      return {
        ...state,
        isDarkMode: !state.isDarkMode,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [{ id: uuidv4(), timestamp: new Date().toISOString(), readBy: [], ...action.payload }, ...state.notifications],
        lastSynced: new Date().toISOString(),
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload.notificationId 
            ? { ...n, readBy: [...new Set([...(n.readBy || []), action.payload.userId])] } 
            : n
        ),
        lastSynced: new Date().toISOString(),
      };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.targetRoles.includes(action.payload.role)
            ? { ...n, readBy: [...new Set([...(n.readBy || []), action.payload.userId])] }
            : n
        ),
        lastSynced: new Date().toISOString(),
      };
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, { id: uuidv4(), ...action.payload }],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.payload),
      };
    default:
      return state;
  }
};

export const ProcureProvider = ({ children }) => {
  const [state, dispatch] = useReducer(vendorReducer, initialState);

  // Initialize data from Firestore and listen to real-time changes
  useEffect(() => {
    const stateDocRef = doc(db, 'appData', 'globalState');
    
    const unsubscribe = onSnapshot(stateDocRef, (docSnap) => {
      if (docSnap.exists()) {
        // Only sync if the change came from the server (another device), 
        // to avoid local state being overwritten mid-update.
        if (!docSnap.metadata.hasPendingWrites) {
          dispatch({ type: 'SYNC_FROM_FIREBASE', payload: docSnap.data() });
        }
      } else {
        // First time initialization: upload seed data to Firestore
        const initialVendors = SEED_VENDORS.map(v => ({ ...v, status: calculateStatus(v.contractEnd) }));
        const initialNotifications = [
          { id: uuidv4(), type: 'warning', message: 'Vendor "SunPower Innovations" contract is expiring in 15 days.', targetRoles: ['admin', 'user'], timestamp: new Date(Date.now() - 3600000).toISOString(), readBy: [] },
          { id: uuidv4(), type: 'alert', message: 'New viewer role was successfully provisioned.', targetRoles: ['admin'], timestamp: new Date(Date.now() - 86400000).toISOString(), readBy: [] },
          { id: uuidv4(), type: 'success', message: 'Project "Desert Alpha" has successfully completed its planning phase.', targetRoles: ['admin', 'user', 'viewer'], timestamp: new Date(Date.now() - 172800000).toISOString(), readBy: [] },
        ];
        
        const initialData = {
          vendors: initialVendors,
          users: SEED_USERS,
          projects: SEED_PROJECTS,
          notifications: initialNotifications
        };
        
        setDoc(stateDocRef, initialData);
        dispatch({ type: 'SYNC_FROM_FIREBASE', payload: initialData });
      }
    });

    return () => unsubscribe();
  }, []);

  // Persist data back to Firestore whenever local state changes
  useEffect(() => {
    if (state.lastSynced) {
      const stateDocRef = doc(db, 'appData', 'globalState');
      setDoc(stateDocRef, {
        vendors: state.vendors,
        users: state.users,
        projects: state.projects,
        notifications: state.notifications
      }, { merge: true });
    }
  }, [state.lastSynced]);

  // Handle local UI settings (these don't sync across devices for the same user unless tied to user profile, so localStorage is fine for these)
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

  const showToast = (message, type = 'success') => {
    const toastPayload = { message, type };
    dispatch({ type: 'ADD_TOAST', payload: toastPayload });
  };

  return (
    <ProcureContext.Provider value={{ state, dispatch, showToast }}>
      {children}
    </ProcureContext.Provider>
  );
};

export const useProcure = () => useContext(ProcureContext);
