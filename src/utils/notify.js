import { v4 as uuidv4 } from 'uuid';
import { safeFormatDate } from './constants';

// ─────────────────────────────────────────────
// ENTERPRISE AUDIO ENGINE (Web Audio API)
// Auto-unlocks on user gesture & plays crisp chime
// ─────────────────────────────────────────────
let globalAudioCtx = null;

// ─────────────────────────────────────────────
// SOUND THROTTLE: max 1 chime per 3 seconds
// Prevents audio spam when multiple notifications arrive together
// ─────────────────────────────────────────────
let _lastChimeTime = 0;
const CHIME_COOLDOWN_MS = 3000;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
};

// Global interaction unlocker (browser autoplay policy compliance)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

function playChime(ctx) {
  try {
    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: A5 (880.00 Hz) - delayed crisp high chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn("Chime synth error:", e);
  }
}

export const playNotificationSound = () => {
  try {
    // THROTTLE: skip sound if another chime played within the last 3 seconds
    const now = Date.now();
    if (now - _lastChimeTime < CHIME_COOLDOWN_MS) return;
    _lastChimeTime = now;

    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playChime(ctx)).catch(() => playChime(ctx));
    } else {
      playChime(ctx);
    }
  } catch (e) {
    console.warn("Audio playback error:", e);
  }
};

// ─────────────────────────────────────────────
// CORE: Send any notification to Firestore
// targetRoles: ['admin'] | ['admin','employee'] | ['admin','employee','viewer']
// ─────────────────────────────────────────────
export const sendNotification = (dispatch, {
  title,
  message,
  type = 'info',
  targetRoles = ['admin'],
  dedupeKey = null,   // if provided, prevents duplicate notifications with same key
  actorName = null,
  playSound = true,
}) => {
  // Dedupe: if same notification key already fired today, skip
  if (dedupeKey) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lsKey = `notif_${dedupeKey}_${today}`;
    if (localStorage.getItem(lsKey)) return;
    localStorage.setItem(lsKey, '1');
  }

  // Play standard notification audio sound locally
  if (playSound) {
    playNotificationSound();
  }

  dispatch({
    type: 'ADD_NOTIFICATION',
    payload: {
      id: uuidv4(),
      title,
      message: actorName ? `${message} — by ${actorName}` : message,
      type,
      targetRoles,
      readBy: [],
      timestamp: new Date().toISOString(),
    },
  });
};

// ─────────────────────────────────────────────
// 1. MAINTENANCE MODE TOGGLE NOTIFICATION
// ─────────────────────────────────────────────
export const notifyMaintenanceMode = (dispatch, { isModeOn, actorName }) => {
  sendNotification(dispatch, {
    title: isModeOn ? '🔒 Maintenance Mode ON' : '✅ Maintenance Mode OFF',
    message: isModeOn
      ? 'System maintenance was activated. Access for non-admin users is paused.'
      : 'System maintenance was deactivated. Full access restored for all users.',
    type: isModeOn ? 'warning' : 'success',
    targetRoles: ['admin'],
    actorName,
    playSound: true,
  });
};

// ─────────────────────────────────────────────
// 2. CONTRACT / PO EXPIRY ALERTS
// ─────────────────────────────────────────────
export const checkContractAlerts = (dispatch, vendors) => {
  const now = new Date();

  (vendors || []).forEach(v => {
    if (!v || !v.contractEnd || !v.id) return;

    const end = new Date(v.contractEnd);
    if (isNaN(end.getTime())) return;

    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    const label = v.vendorName
      ? `${v.vendorName}${v.plantName ? ' — ' + v.plantName : ''}`
      : (v.plantName || 'A vendor');

    const formattedDate = safeFormatDate(v.contractEnd, { day: 'numeric', month: 'short', year: 'numeric' });

    // ── Already Expired ──
    if (daysLeft < 0) {
      sendNotification(dispatch, {
        title: '❌ PO / Contract Expired',
        message: `${label} contract expired on ${formattedDate}. Immediate renewal required.`,
        type: 'error',
        targetRoles: ['admin', 'employee'],
        dedupeKey: `expired_${v.id}_${v.contractEnd}`,
      });
      return;
    }

    // ── 7 Days Critical Warning ──
    if (daysLeft <= 7) {
      sendNotification(dispatch, {
        title: '🚨 PO Expiring in 7 Days!',
        message: `${label} PO expires on ${formattedDate} — only ${daysLeft} day(s) left. Renew urgently!`,
        type: 'error',
        targetRoles: ['admin', 'employee'],
        dedupeKey: `expiry7_${v.id}_${v.contractEnd}`,
      });
      return;
    }

    // ── 30 Days Warning ──
    if (daysLeft <= 30) {
      sendNotification(dispatch, {
        title: '⚠️ PO Expiring in 30 Days',
        message: `${label} PO expires on ${formattedDate} (${daysLeft} days remaining). Please initiate renewal process.`,
        type: 'warning',
        targetRoles: ['admin', 'employee'],
        dedupeKey: `expiry30_${v.id}_${v.contractEnd}`,
      });
    }
  });
};

// ─────────────────────────────────────────────
// 3. RENEWAL NOTIFICATION
// ─────────────────────────────────────────────
export const notifyRenewal = (dispatch, { vendorName, plantName, newEndDate, actorName }) => {
  const label = vendorName
    ? `${vendorName}${plantName ? ' — ' + plantName : ''}`
    : 'A vendor';

  const formattedDate = newEndDate
    ? safeFormatDate(newEndDate, { day: 'numeric', month: 'short', year: 'numeric' })
    : 'a new date';

  sendNotification(dispatch, {
    title: '✅ PO / Contract Renewed',
    message: `${label} contract has been successfully renewed. New expiry: ${formattedDate}.`,
    type: 'success',
    targetRoles: ['admin', 'employee'],
    actorName,
  });
};

// ─────────────────────────────────────────────
// 4. DATA DELETED NOTIFICATION
// ─────────────────────────────────────────────
export const notifyDeletion = (dispatch, { itemType, itemName, actorName }) => {
  sendNotification(dispatch, {
    title: `🗑️ ${itemType} Deleted`,
    message: `"${itemName}" was deleted from the system`,
    type: 'warning',
    targetRoles: ['admin'],
    actorName,
  });
};

// ─────────────────────────────────────────────
// 5. NEW VENDOR ADDED
// ─────────────────────────────────────────────
export const notifyNewVendor = (dispatch, { vendorName, vendorCode, actorName }) => {
  sendNotification(dispatch, {
    title: '🏭 New Vendor Registered',
    message: `${vendorName} (Code: ${vendorCode || '—'}) has been added to the vendor registry`,
    type: 'info',
    targetRoles: ['admin'],
    actorName,
  });
};

// ─────────────────────────────────────────────
// 6. NEW PROJECT ADDED
// ─────────────────────────────────────────────
export const notifyNewProject = (dispatch, { projectName, projectCode, actorName }) => {
  sendNotification(dispatch, {
    title: '📁 New Project Created',
    message: `${projectName} (${projectCode || '—'}) has been added to the project pipeline`,
    type: 'info',
    targetRoles: ['admin', 'employee'],
    actorName,
  });
};

// ─────────────────────────────────────────────
// 7. NEW USER / EMPLOYEE ADDED
// ─────────────────────────────────────────────
export const notifyNewUser = (dispatch, { userName, userRole, actorName }) => {
  sendNotification(dispatch, {
    title: '👤 New User Added',
    message: `${userName} has been added as ${userRole}`,
    type: 'info',
    targetRoles: ['admin'],
    actorName,
  });
};

// ─────────────────────────────────────────────
// 8. DOCUMENT UPLOADED
// ─────────────────────────────────────────────
export const notifyDocumentUpload = (dispatch, { fileName, vendorName, actorName }) => {
  sendNotification(dispatch, {
    title: '📄 Document Uploaded',
    message: `New file "${fileName}" uploaded${vendorName ? ` for ${vendorName}` : ''}`,
    type: 'info',
    targetRoles: ['admin'],
    actorName,
  });
};
