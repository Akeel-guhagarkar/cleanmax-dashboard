import React, { createContext, useReducer, useEffect, useContext } from 'react';
import { SEED_VENDORS, SEED_USERS, SEED_PROJECTS, calculateStatus } from '../utils/seedData';
import { v4 as uuidv4 } from 'uuid';

const ProcureContext = createContext();

const getInitialState = () => {
  const savedCurrentUser = localStorage.getItem('procure360_current_user');
  return {
    vendors: [],
    users: [],
    projects: [],
    currentUser: savedCurrentUser ? JSON.parse(savedCurrentUser) : null,
    lastSynced: null,
    isDarkMode: false,
    toasts: [],
  };
};

const initialState = getInitialState();

const vendorReducer = (state, action) => {
  switch (action.type) {
    case 'INIT_DATA':
      return {
        ...state,
        vendors: action.payload.vendors,
        users: action.payload.users,
        projects: action.payload.projects,
        currentUser: action.payload.currentUser,
        lastSynced: new Date().toISOString(),
      };
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
      };
    case 'UPDATE_USER': {
      const updatedUsers = state.users.map(u => u.id === action.payload.id ? { ...u, ...action.payload } : u);
      const isCurrentUser = state.currentUser?.id === action.payload.id;
      return {
        ...state,
        users: updatedUsers,
        currentUser: isCurrentUser ? { ...state.currentUser, ...action.payload } : state.currentUser,
      };
    }
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(u => u.id !== action.payload),
      };
    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [...state.projects, { ...action.payload, id: uuidv4(), createdAt: new Date().toISOString() }],
      };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p),
      };
    case 'DELETE_PROJECTS':
      return {
        ...state,
        projects: state.projects.filter(p => !action.payload.includes(p.id)),
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

  // Initialize data from localStorage or seed
  useEffect(() => {
    const savedData = localStorage.getItem('procure360_vendors_v2');
    const savedUsers = localStorage.getItem('procure360_users');
    const savedCurrentUser = localStorage.getItem('procure360_current_user');
    const savedDarkMode = localStorage.getItem('procure360_darkmode');

    let initialVendors = [];
    if (savedData) {
      initialVendors = JSON.parse(savedData);
      initialVendors = initialVendors.map(v => ({
        ...v,
        status: calculateStatus(v.contractEnd)
      }));
    } else {
      initialVendors = SEED_VENDORS;
    }

    let initialUsers = savedUsers ? JSON.parse(savedUsers) : SEED_USERS;
    
    // Ensure new seed users (like viewer) are added even if localStorage already has old users
    const existingEmails = new Set(initialUsers.map(u => u.email));
    SEED_USERS.forEach(seedUser => {
      if (!existingEmails.has(seedUser.email)) {
        initialUsers.push(seedUser);
      }
    });

    let initialCurrentUser = savedCurrentUser ? JSON.parse(savedCurrentUser) : null;
    let initialProjects = SEED_PROJECTS;

    const savedProjects = localStorage.getItem('procure360_projects');
    if (savedProjects) {
      initialProjects = JSON.parse(savedProjects);
    }

    dispatch({ type: 'INIT_DATA', payload: { vendors: initialVendors, users: initialUsers, projects: initialProjects, currentUser: initialCurrentUser } });

    if (savedDarkMode === 'true') {
      dispatch({ type: 'TOGGLE_DARK_MODE' });
    }
  }, []);

  // Persist data to localStorage on change
  useEffect(() => {
    if (state.vendors.length > 0) {
      localStorage.setItem('procure360_vendors_v2', JSON.stringify(state.vendors));
    }
  }, [state.vendors]);

  useEffect(() => {
    if (state.users.length > 0) {
      localStorage.setItem('procure360_users', JSON.stringify(state.users));
    }
  }, [state.users]);

  useEffect(() => {
    if (state.currentUser) {
      localStorage.setItem('procure360_current_user', JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem('procure360_current_user');
    }
  }, [state.currentUser]);

  useEffect(() => {
    if (state.projects && state.projects.length > 0) {
      localStorage.setItem('procure360_projects', JSON.stringify(state.projects));
    }
  }, [state.projects]);

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
