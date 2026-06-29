import React, { useEffect } from 'react';
import { useProcure } from '../context/ProcureContext';

export const ToastContainer = () => {
  const { state, dispatch } = useProcure();

  useEffect(() => {
    if (state.toasts.length > 0) {
      const timer = setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: state.toasts[0].id });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.toasts, dispatch]);

  if (state.toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {state.toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {toast.type === 'success' && <span style={{ color: '#22c55e' }}>✓</span>}
          {toast.type === 'error' && <span style={{ color: '#ef4444' }}>✕</span>}
          {toast.message}
        </div>
      ))}
    </div>
  );
};
