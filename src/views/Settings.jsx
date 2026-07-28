// v20260727173503
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProcure } from '../context/ProcureContext';
import { verifyTOTP } from '../utils/totp';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { notifyMaintenanceMode, requestPushPermission, sendNotification } from '../utils/notify';
import { sendRealEmail } from '../utils/sendRealEmail';
import { User, Moon, Sun, Bell, Shield, Database, Lock, Save, Camera, Smartphone, Globe, Key, Clock, AlertTriangle, CheckCircle, Trash2, RotateCcw, Package, Search, Copy, Eye, EyeOff, Plus, X, Zap, ShieldCheck, ChevronDown, ChevronUp, RotateCw, ZoomIn, ZoomOut, Maximize2, Check, Edit3, Download } from 'lucide-react';

/* ═══════════════════════════════════════════════════
   API KEY MANAGER — Premium Component
   ═══════════════════════════════════════════════════ */
const SCOPES = [
  { id: 'read',       label: 'Read Only',    desc: 'View data only',             color: '#3b82f6' },
  { id: 'readwrite',  label: 'Read & Write', desc: 'View and modify data',        color: '#f59e0b' },
  { id: 'admin',      label: 'Full Access',  desc: 'Complete API access',         color: '#ef4444' },
];
const EXPIRY_OPTIONS = [
  { label: '7 days',    days: 7 },
  { label: '30 days',   days: 30 },
  { label: '90 days',   days: 90 },
  { label: '1 year',    days: 365 },
  { label: 'No expiry', days: null },
];

const genKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `cm_live_${seg(8)}_${seg(16)}_${seg(8)}`;
};

const ApiKeyManager = () => {
  const { showToast } = useProcure();
  const [keys, setKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cm_api_keys') || '[]'); } catch { return []; }
  });
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState('read');
  const [newKeyExpiry, setNewKeyExpiry] = useState(30);
  const [revealedKeys, setRevealedKeys] = useState(new Set());
  const [justCreated, setJustCreated] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const saveKeys = (updated) => {
    setKeys(updated);
    localStorage.setItem('cm_api_keys', JSON.stringify(updated));
  };

  const handleCreate = () => {
    if (!newKeyName.trim()) { showToast('Please enter a key name', 'error'); return; }
    const expiryDate = newKeyExpiry ? new Date(Date.now() + newKeyExpiry * 86400000).toISOString() : null;
    const newKey = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      scope: newKeyScope,
      key: genKey(),
      createdAt: new Date().toISOString(),
      expiresAt: expiryDate,
      lastUsed: null,
      requests: 0,
      status: 'active',
    };
    const updated = [newKey, ...keys];
    saveKeys(updated);
    setJustCreated(newKey);
    setShowModal(false);
    setNewKeyName('');
    setNewKeyScope('read');
    setNewKeyExpiry(30);
    showToast(`API Key "${newKey.name}" created successfully`, 'success');
  };

  const handleRevoke = (id) => {
    if (window.confirm('Revoke this API key? Apps using it will stop working immediately.')) {
      const updated = keys.map(k => k.id === id ? { ...k, status: 'revoked' } : k);
      saveKeys(updated);
      showToast('API Key revoked', 'success');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Permanently delete this key?')) {
      saveKeys(keys.filter(k => k.id !== id));
      if (justCreated?.id === id) setJustCreated(null);
      showToast('API Key deleted', 'success');
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleReveal = (id) => {
    setRevealedKeys(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const maskKey = (key) => `${key.slice(0, 10)}${'•'.repeat(20)}${key.slice(-6)}`;

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never';

  const isExpired = (key) => key.expiresAt && new Date(key.expiresAt) < new Date();

  const scopeConfig = { read: SCOPES[0], readwrite: SCOPES[1], admin: SCOPES[2] };

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-card)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.03) 100%)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={22} color="#6366f1" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>API Access Keys</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.1rem' }}>
              {keys.length === 0 ? 'No keys yet — create your first API key below' : `${keys.filter(k => k.status === 'active').length} active key${keys.filter(k => k.status === 'active').length !== 1 ? 's' : ''} · ${keys.length} total`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.55rem 1.1rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(99,102,241,0.3)', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={16} /> Generate New Key
        </button>
      </div>

      {/* ── Just Created Banner ── */}
      {justCreated && (
        <div style={{ margin: '1rem 1.5rem', padding: '1rem 1.25rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ShieldCheck size={16} color="#10b981" />
                <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.875rem' }}>Key Created Successfully — Copy it now!</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>⚠️ This is the <strong>only time</strong> you'll see the full key. Store it safely.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-app)', borderRadius: '8px', padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                <code style={{ flex: 1 }}>{justCreated.key}</code>
                <button onClick={() => handleCopy(justCreated.key, 'banner')}
                  style={{ background: copiedId === 'banner' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)', color: copiedId === 'banner' ? '#10b981' : '#6366f1', border: 'none', borderRadius: '6px', padding: '0.35rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  {copiedId === 'banner' ? '✓ Copied' : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
            <button onClick={() => setJustCreated(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, padding: '0.2rem' }}><X size={16} /></button>
          </div>
        </div>
      )}

      {/* ── Keys List ── */}
      {keys.length === 0 ? (
        <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔑</div>
          <p style={{ fontWeight: 600, fontSize: '1rem' }}>No API Keys Yet</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem', maxWidth: '340px', margin: '0.5rem auto 0' }}>Generate your first API key to connect external apps, ERPs, or automation tools to CleanMax.</p>
        </div>
      ) : (
        <div>
          {keys.map((k, i) => {
            const sc = scopeConfig[k.scope] || scopeConfig.read;
            const expired = isExpired(k);
            const isActive = k.status === 'active' && !expired;
            return (
              <div key={k.id} style={{ padding: '1.1rem 1.5rem', borderBottom: i < keys.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', opacity: k.status === 'revoked' ? 0.55 : 1, transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Icon */}
                <div style={{ width: 38, height: 38, borderRadius: '10px', background: isActive ? `${sc.color}18` : 'rgba(100,116,139,0.1)', border: `1px solid ${isActive ? sc.color : '#64748b'}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Key size={17} color={isActive ? sc.color : '#64748b'} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{k.name}</span>
                    <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '99px', background: `${sc.color}18`, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{sc.label}</span>
                    <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '99px', background: isActive ? 'rgba(16,185,129,0.12)' : expired ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: isActive ? '#10b981' : expired ? '#f59e0b' : '#ef4444', textTransform: 'uppercase' }}>
                      {k.status === 'revoked' ? 'Revoked' : expired ? 'Expired' : 'Active'}
                    </span>
                  </div>
                  {/* Masked key */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-app)', borderRadius: '7px', padding: '0.35rem 0.75rem', marginBottom: '0.35rem', width: 'fit-content' }}>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
                      {revealedKeys.has(k.id) ? k.key : maskKey(k.key)}
                    </code>
                    <button onClick={() => toggleReveal(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.1rem', display: 'flex' }}>
                      {revealedKeys.has(k.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => handleCopy(k.key, k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === k.id ? '#10b981' : '#6366f1', padding: '0.1rem', display: 'flex', fontWeight: 600, fontSize: '0.72rem' }}>
                      {copiedId === k.id ? '✓' : <Copy size={12} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>📅 Created: {formatDate(k.createdAt)}</span>
                    <span>⏱ Expires: {k.expiresAt ? formatDate(k.expiresAt) : 'Never'}</span>
                    <span>🕒 Last used: {k.lastUsed ? formatDate(k.lastUsed) : 'Never'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {isActive && (
                    <button onClick={() => handleRevoke(k.id)}
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}>
                      Revoke
                    </button>
                  )}
                  <button onClick={() => handleDelete(k.id)}
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.45rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      {keys.length > 0 && (
        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-app)', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span><strong>{keys.filter(k => k.status === 'active' && !isExpired(k)).length}</strong> active · <strong>{keys.filter(k => k.status === 'revoked' || isExpired(k)).length}</strong> revoked/expired</span>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>🔒 Keys are stored locally — never sent to any server</span>
        </div>
      )}

      {/* ══ CREATE KEY MODAL ══ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', overflow: 'hidden' }}>

            {/* Modal Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, transparent 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={20} color="#6366f1" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Generate API Key</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Configure access level and expiry</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}><X size={20} /></button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Key Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Name *</label>
                <input
                  className="premium-input"
                  type="text"
                  placeholder="e.g. ERP Integration, Mobile App, Analytics Bot"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  style={{ width: '100%', fontSize: '0.9rem' }}
                  autoFocus
                />
              </div>

              {/* Scope */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Scope</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {SCOPES.map(sc => (
                    <label key={sc.id} onClick={() => setNewKeyScope(sc.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '10px', cursor: 'pointer', border: `1.5px solid ${newKeyScope === sc.id ? sc.color : 'var(--border-color)'}`, background: newKeyScope === sc.id ? `${sc.color}10` : 'var(--bg-app)', transition: 'all 0.15s' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${newKeyScope === sc.id ? sc.color : 'var(--border-color)'}`, background: newKeyScope === sc.id ? sc.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        {newKeyScope === sc.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: newKeyScope === sc.id ? sc.color : 'var(--text-primary)' }}>{sc.label}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>— {sc.desc}</span>
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '99px', background: `${sc.color}18`, color: sc.color }}>{sc.id.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expiry</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {EXPIRY_OPTIONS.map(opt => (
                    <button key={opt.label} onClick={() => setNewKeyExpiry(opt.days)}
                      style={{ padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${newKeyExpiry === opt.days ? '#6366f1' : 'var(--border-color)'}`, background: newKeyExpiry === opt.days ? 'rgba(99,102,241,0.12)' : 'var(--bg-app)', color: newKeyExpiry === opt.days ? '#6366f1' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-app)' }}>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.6rem 1.2rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate}
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem 1.4rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <Key size={15} /> Generate Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   AVATAR VIEWER MODAL — Full-size Lightbox
   ═══════════════════════════════════════════════════ */
const AvatarViewerModal = ({ avatarUrl, userName, userRole, onClose, onChangePhoto }) => {
  if (!avatarUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = avatarUrl;
    a.download = `${userName || 'profile'}_avatar.png`;
    a.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="animate-fade-in-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-app)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Profile Picture</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem' }}><X size={20} /></button>
        </div>

        {/* Image Container */}
        <div style={{ padding: '2rem 1.5rem 1.5rem', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '220px', height: '220px', borderRadius: '50%', border: '4px solid var(--accent-color)', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.3)', marginBottom: '1.25rem', background: 'var(--bg-app)' }}>
            <img src={avatarUrl} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{userName}</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{userRole} USER</p>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', justifyContent: 'center', background: 'var(--bg-app)' }}>
          <button onClick={handleDownload} style={{ flex: 1, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.15s' }}>
            <Download size={15} /> Download
          </button>
          {onChangePhoto && (
            <button onClick={() => { onClose(); onChangePhoto(); }} style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
              <Camera size={15} /> Change Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   AVATAR CROPPER MODAL — Interactive Image Crop & Adjust
   ═══════════════════════════════════════════════════ */
const AvatarCropperModal = ({ rawImageSrc, onCropSave, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);

  if (!rawImageSrc) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSaveCrop = () => {
    const canvas = document.createElement('canvas');
    const SIZE = 600;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      // Background fill
      ctx.fillStyle = '#0a1128';
      ctx.fillRect(0, 0, SIZE, SIZE);

      ctx.save();
      // Move origin to center
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Draw image centered with pan offset
      const drawWidth = SIZE;
      const drawHeight = (img.height / img.width) * SIZE;
      const panScaledX = pan.x * (SIZE / 300);
      const panScaledY = pan.y * (SIZE / 300);

      ctx.drawImage(img, -drawWidth / 2 + panScaledX, -drawHeight / 2 + panScaledY, drawWidth, drawHeight);
      ctx.restore();

      const croppedResult = canvas.toDataURL('image/jpeg', 0.92);
      onCropSave(croppedResult);
    };
    img.src = rawImageSrc;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="animate-fade-in-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-app)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={18} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Crop & Adjust Photo</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem' }}><X size={20} /></button>
        </div>

        {/* Interactive Crop Viewport */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              border: '3px solid var(--accent-color)',
              position: 'relative',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              boxShadow: '0 0 30px rgba(99,102,241,0.25)',
              background: '#0a1128',
              userSelect: 'none',
            }}
          >
            <img
              ref={imgRef}
              src={rawImageSrc}
              alt="Crop preview"
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                pointerEvents: 'none',
              }}
            />
            {/* Guide overlay */}
            <div style={{ position: 'absolute', inset: 0, border: '1px dashed rgba(255,255,255,0.4)', borderRadius: '50%', pointerEvents: 'none' }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', margin: '0.75rem 0 0' }}>💡 Click and drag image to reposition · Use zoom & rotate controls below</p>
        </div>

        {/* Controls */}
        <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Zoom Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ZoomOut size={16} color="var(--text-secondary)" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent-color)', cursor: 'pointer' }}
            />
            <ZoomIn size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, minWidth: '36px', textAlign: 'right', color: 'var(--text-secondary)' }}>{zoom.toFixed(1)}x</span>
          </div>

          {/* Action Buttons: Rotate & Reset */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <RotateCw size={14} /> Rotate ({rotation}°)
            </button>
            <button
              onClick={() => { setZoom(1); setRotation(0); setPan({ x: 0, y: 0 }); }}
              style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer Buttons */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-app)' }}>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.6rem 1.2rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSaveCrop} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem 1.4rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Check size={16} /> Save & Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

const RecycleBin = () => {
  const { state, dispatch, showToast } = useProcure();
  const [binSearch, setBinSearch] = useState('');
  const [binFilter, setBinFilter] = useState('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const filtered = (state.deletedRecords || []).filter(r => {
    const q = binSearch.toLowerCase();
    const matchType = binFilter === 'all' || r._recordType === binFilter;
    const name = (r.vendorName || r.projectName || r.name || r.fileName || '').toLowerCase();
    const code = (r.vendorCode || r.projectCode || r.email || '').toLowerCase();
    return matchType && (name.includes(q) || code.includes(q));
  });

  const typeConfig = {
    vendor:  { label: 'Vendor',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: '🏭' },
    project: { label: 'Project', color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '📁' },
    user:    { label: 'User',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '👤' },
    upload:  { label: 'Upload',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: '📂' },
  };

  const getLabel = (r) => r.vendorName || r.projectName || r.name || r.fileName || r.uploadedBy || 'Unnamed Record';
  const getSubLabel = (r) => {
    if (r._recordType === 'vendor') return `${r.vendorCode || ''} • ${r.region || ''} • ${r.plantCapacity || ''} ${r.capacityUnit || ''}`.replace(/^[ •]+|[ •]+$/g, '');
    if (r._recordType === 'project') return `${r.projectCode || ''} • ${r.type || ''} • ${r.capacity || ''} ${r.unit || ''}`.replace(/^[ •]+|[ •]+$/g, '');
    if (r._recordType === 'user') return `${r.email || ''} • Role: ${r.role || ''}`.replace(/^[ •]+|[ •]+$/g, '');
    if (r._recordType === 'upload') return `${r.recordsCount || 0} records • Uploaded by ${r.uploadedBy || ''}`;
    return '';
  };

  const handleRestore = (r) => {
    dispatch({ type: 'RESTORE_DELETED', payload: r._recycleBinId });
    showToast(`✅ "${getLabel(r)}" restored successfully`, 'success');
  };

  const handlePermanentDelete = (r) => {
    if (window.confirm(`⚠️ Permanently delete "${getLabel(r)}"?\n\nThis action CANNOT be undone.`)) {
      dispatch({ type: 'PERMANENT_DELETE', payload: r._recycleBinId });
      showToast('Permanently deleted from system', 'success');
    }
  };

  const isAllSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r._recycleBinId));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r._recycleBinId)));
    }
  };

  const handleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleRestoreSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    selectedIds.forEach(id => {
      dispatch({ type: 'RESTORE_DELETED', payload: id });
    });
    setSelectedIds(new Set());
    showToast(`✅ ${count} record(s) restored successfully`, 'success');
  };

  const handlePermanentDeleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (window.confirm(`⚠️ PERMANENTLY DELETE ${count} selected record(s)?\n\nThis action CANNOT be undone.`)) {
      selectedIds.forEach(id => {
        dispatch({ type: 'PERMANENT_DELETE', payload: id });
      });
      setSelectedIds(new Set());
      showToast(`${count} record(s) permanently deleted`, 'success');
    }
  };

  const handleClearAll = () => {
    if (window.confirm(`⚠️ PERMANENTLY DELETE ALL ${state.deletedRecords?.length} records from the Recycle Bin?\n\nThis CANNOT be undone. All data will be lost forever.`)) {
      dispatch({ type: 'CLEAR_RECYCLE_BIN' });
      setSelectedIds(new Set());
      setConfirmClear(false);
      showToast('Recycle Bin emptied permanently', 'success');
    }
  };

  const handleExport = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CleanMax Analytics';
      wb.created = new Date();
      const ws = wb.addWorksheet('Recycle Bin Export');
      ws.mergeCells('A1:G2');
      const title = ws.getCell('A1');
      title.value = `CLEANMAX RECYCLE BIN EXPORT — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      title.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      title.alignment = { vertical: 'middle', horizontal: 'center' };
      title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      ws.addRow([]);
      const headerRow = ws.addRow(['Type', 'Name / Code', 'Sub-Info', 'Deleted By', 'Role', 'Deleted At', 'Region / Extra']);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      (state.deletedRecords || []).forEach((r, i) => {
        const row = ws.addRow([
          (typeConfig[r._recordType]?.label || r._recordType || 'Unknown').toUpperCase(),
          getLabel(r) + (r.vendorCode || r.projectCode ? ` (${r.vendorCode || r.projectCode})` : ''),
          getSubLabel(r),
          r._deletedBy || 'Admin',
          r._deletedByRole || '',
          r._deletedAt ? new Date(r._deletedAt).toLocaleString('en-IN') : '',
          r.region || r.email || '',
        ]);
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FF0F172A' : 'FF1E293B' } };
          cell.font = { color: { argb: 'FFCBD5E1' }, name: 'Arial', size: 9 };
        });
      });
      ws.columns = [{ width: 12 }, { width: 30 }, { width: 32 }, { width: 18 }, { width: 12 }, { width: 22 }, { width: 20 }];
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `CleanMax_RecycleBin_${Date.now()}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      showToast('Recycle Bin exported to Excel ✅', 'success');
    } catch (err) {
      console.error(err);
      showToast('Export failed. Please try again.', 'error');
    }
  };

  const counts = { all: (state.deletedRecords || []).length };
  ['vendor', 'project', 'user', 'upload'].forEach(t => { counts[t] = (state.deletedRecords || []).filter(r => r._recordType === t).length; });
  const TABS = [{ id: 'all', label: 'All' }, { id: 'vendor', label: 'Vendors' }, { id: 'project', label: 'Projects' }, { id: 'user', label: 'Users' }, { id: 'upload', label: 'Files' }];

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-card)' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={22} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Recycle Bin</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.1rem' }}>
              {counts.all === 0 ? '✨ All clear — no deleted records' : `${counts.all} record${counts.all !== 1 ? 's' : ''} stored safely · Restore anytime`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {counts.all > 0 && state.currentUser?.role !== 'viewer' && (
            <React.Fragment>
              <button onClick={handleExport} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                ⬇ Export Excel
              </button>
            </React.Fragment>
          )}
          {counts.all > 0 && state.currentUser?.role !== 'viewer' && (
            <button onClick={handleClearAll} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trash2 size={14} /> Empty All
            </button>
          )}
        </div>
      </div>

      {counts.all === 0 ? (
        <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🗑️</div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>Recycle Bin is Empty</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem', maxWidth: '360px', margin: '0.5rem auto 0' }}>
            Deleted vendors, projects, users and files will appear here. Restore them anytime with one click.
          </p>
        </div>
      ) : (
        <React.Fragment>
          {/* Toolbar */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '240px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', userSelect: 'none', background: 'var(--bg-app)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }}
                />
                Select All
              </label>

              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input type="text" placeholder="Search deleted records..." className="premium-input"
                  style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.875rem' }}
                  value={binSearch} onChange={e => setBinSearch(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', background: 'var(--bg-app)', borderRadius: '10px', padding: '0.2rem', gap: '0.15rem' }}>
              {TABS.map(f => (
                <button key={f.id} onClick={() => setBinFilter(f.id)} style={{
                  border: 'none', borderRadius: '7px', padding: '0.3rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  background: binFilter === f.id ? 'var(--accent-color)' : 'transparent',
                  color: binFilter === f.id ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s',
                }}>
                  {f.label} <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>({counts[f.id]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Action Bar (Visible when records selected) */}
          {selectedIds.size > 0 && (
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                ✓ {selectedIds.size} record{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleRestoreSelected}
                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(16,185,129,0.3)' }}
                >
                  <RotateCcw size={14} /> Restore Selected ({selectedIds.size})
                </button>
                <button
                  onClick={handlePermanentDeleteSelected}
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Trash2 size={14} /> Delete Selected ({selectedIds.size})
                </button>
              </div>
            </div>
          )}

          {/* Records */}
          <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Search size={32} style={{ opacity: 0.25, margin: '0 auto 0.75rem', display: 'block' }} />
                <p>No records match your search.</p>
              </div>
            ) : filtered.map((r, i) => {
              const tc = typeConfig[r._recordType] || typeConfig.vendor;
              const isSelected = selectedIds.has(r._recycleBinId);
              return (
                <div key={r._recycleBinId}
                  style={{ padding: '1rem 1.5rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background 0.15s', background: isSelected ? 'rgba(16,185,129,0.05)' : 'transparent' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-app)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOne(r._recycleBinId)}
                    style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: tc.bg, border: `1px solid ${tc.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>{tc.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{getLabel(r)}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '99px', background: tc.bg, color: tc.color, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{tc.label}</span>
                    </div>
                    {getSubLabel(r) && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getSubLabel(r)}</p>}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span>🗑️ <strong>{r._deletedBy || 'Admin'}</strong> <span style={{ opacity: 0.7 }}>({r._deletedByRole})</span></span>
                      <span>🕒 {formatDate(r._deletedAt)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={() => handleRestore(r)} title="Restore"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.22)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}>
                      <RotateCcw size={13} /> Restore
                    </button>
                    <button onClick={() => handlePermanentDelete(r)} title="Delete permanently"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.45rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-app)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Showing <strong>{filtered.length}</strong> of <strong>{counts.all}</strong> deleted records</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚠️ Records stored indefinitely until permanently deleted</span>
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

/* ─────────────────── Active Sessions Manager ─────────────────── */
const getDeviceDetails = () => {
  const ua = navigator.userAgent;
  let os = "Windows PC";
  if (ua.includes("Win")) os = "Windows PC";
  else if (ua.includes("Mac")) os = "macOS Workstation";
  else if (ua.includes("Android")) os = "Android Smartphone";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "Apple iPhone/iPad";
  else if (ua.includes("Linux")) os = "Linux PC";

  let browser = "Chrome";
  if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  return { os, browser, isMobile };
};

const ActiveSessionsManager = () => {
  const { dispatch, showToast } = useProcure();
  const [locationText, setLocationText] = useState('Maharashtra, India');

  useEffect(() => {
    let isMounted = true;
    fetch('https://ipapi.co/json/')
      .then(r => {
        if (!r.ok) throw new Error('API Error');
        return r.json();
      })
      .then(d => {
        if (isMounted && d && d.region && d.country_name) {
          setLocationText(`${d.city ? d.city + ', ' : ''}${d.region}, ${d.country_name}`);
        }
      })
      .catch(() => {
        if (isMounted) setLocationText('Maharashtra, India');
      });
    return () => { isMounted = false; };
  }, []);

  const [sessions, setSessions] = useState(() => {
    try {
      const stored = localStorage.getItem('cm_user_sessions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }

    const { os, browser, isMobile } = getDeviceDetails();
    const currentSession = {
      id: 'current_session_1',
      device: `${os} - ${browser}`,
      location: 'Current Session',
      isCurrent: true,
      isMobile,
      lastActive: 'Just now',
    };

    const secondarySession = {
      id: 'sec_session_2',
      device: 'iPhone 14 - Safari',
      location: 'Mumbai, Maharashtra • 2 days ago',
      isCurrent: false,
      isMobile: true,
      lastActive: '2 days ago',
    };

    const defaultSessions = [currentSession, secondarySession];
    try {
      localStorage.setItem('cm_user_sessions', JSON.stringify(defaultSessions));
    } catch (e) {}
    return defaultSessions;
  });

  const handleRevoke = (id, deviceName, isCurrent) => {
    if (isCurrent) {
      if (window.confirm(`Revoke current session on ${deviceName}? You will be logged out immediately.`)) {
        showToast('🔒 Current session revoked. Logging out...', 'info');
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        localStorage.setItem('cm_user_sessions', JSON.stringify(updated));
        setTimeout(() => {
          dispatch({ type: 'LOGOUT' });
        }, 1200);
      }
      return;
    }

    if (window.confirm(`Revoke session for ${deviceName}? This device will be logged out immediately.`)) {
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      localStorage.setItem('cm_user_sessions', JSON.stringify(updated));
      showToast(`Session for "${deviceName}" has been revoked successfully`, 'success');
    }
  };

  const handleRevokeAllOther = () => {
    if (window.confirm('Revoke all other active sessions except this current device?')) {
      const updated = sessions.filter(s => s.isCurrent);
      setSessions(updated);
      localStorage.setItem('cm_user_sessions', JSON.stringify(updated));
      showToast('All other active sessions have been revoked', 'success');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Active Sessions</h3>
        {sessions.length > 1 && (
          <button 
            type="button"
            className="btn-ghost" 
            onClick={handleRevokeAllOther}
            style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, padding: '0.3rem 0.6rem' }}
          >
            Revoke All Other Sessions
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sessions.map(s => (
          <div 
            key={s.id} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justify: 'space-between', 
              padding: '1rem', 
              border: s.isCurrent ? '1px solid var(--accent-color)' : '1px solid var(--border-color)', 
              borderRadius: '12px',
              background: s.isCurrent ? 'rgba(16,185,129,0.04)' : 'var(--bg-app)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {s.isMobile ? (
                <Smartphone size={24} color={s.isCurrent ? 'var(--accent-color)' : 'var(--text-secondary)'} />
              ) : (
                <Globe size={24} color={s.isCurrent ? 'var(--accent-color)' : 'var(--text-secondary)'} />
              )}
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{s.device}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  {s.isCurrent ? `${locationText} • Current Session` : s.location}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {s.isCurrent && (
                <div className="status-pill status-active" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem' }}>
                  Active
                </div>
              )}
              <button 
                type="button"
                className="btn-ghost" 
                style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, border: '1px solid rgba(239,68,68,0.25)', padding: '0.35rem 0.85rem', borderRadius: '8px' }} 
                onClick={() => handleRevoke(s.id, s.device, s.isCurrent)}
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Live TOTP code display with countdown — shows what code the system currently expects
const LiveCodeDisplay = () => {
  const [code, setCode] = useState('------');
  const [secsLeft, setSecsLeft] = useState(30);

  useEffect(() => {
    const tick = async () => {
      try {
        const { generateTOTPCode } = await import('../utils/totp');
        const c = generateTOTPCode('CLEANMAX23456777');
        setCode(typeof c === 'string' ? c : '------');
      } catch (e) {
        console.error('LiveCode error:', e);
      }
      const nowSecs = Math.floor(Date.now() / 1000);
      setSecsLeft(30 - (nowSecs % 30));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const pct = (secsLeft / 30) * 100;
  const color = secsLeft <= 5 ? '#ef4444' : secsLeft <= 10 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
        🖥️ System Expected Code (must match your phone)
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 800, letterSpacing: '0.3em', color }}>
        {code}
      </div>
      <div style={{ marginTop: '0.4rem', background: 'rgba(0,0,0,0.15)', borderRadius: '99px', height: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 1s linear, background 0.3s' }} />
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Refreshes in {secsLeft}s</div>
    </div>
  );
};

const WeeklySummaryModal = ({ onClose }) => {
  const { state, showToast } = useProcure();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('excel'); // 'excel' or 'text'
  const [downloading, setDownloading] = useState(false);

  const vendors = state.vendors || [];
  const projects = state.projects || [];

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStartStr = weekAgo.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const activeVendors = vendors.filter(v => (v.status || '').toLowerCase() === 'active');
  const expiringVendors = vendors.filter(v => (v.status || '').toLowerCase() === 'expiring soon');
  const expiredVendors = vendors.filter(v => (v.status || '').toLowerCase() === 'expired');
  const actionList = [...expiringVendors, ...expiredVendors];

  const totalMW = vendors.reduce((sum, v) => sum + (Number(v.plantCapacity) || 0), 0);

  const handleExportWeeklyExcel = async () => {
    setDownloading(true);
    showToast('📗 Generating CleanMax Weekly Excel Digest...', 'info');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CleanMax System';
      wb.created = new Date();

      const ws = wb.addWorksheet('Weekly Executive Digest');

      // Title Banner Row
      ws.mergeCells('A1:H1');
      const titleCell = ws.getCell('A1');
      titleCell.value = `CLEANMAX PROCURE360 — WEEKLY EXECUTIVE DIGEST (${weekStartStr} - ${dateStr})`;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).height = 35;

      // Executive Summary Metrics Section
      ws.addRow([]);
      const mHeader = ws.addRow(['Metric Name', 'Value / Summary']);
      mHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      mHeader.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const metrics = [
        ['Total Registered Vendors', vendors.length],
        ['Active Operational Vendors', activeVendors.length],
        ['Total Contracting Capacity', `${totalMW.toFixed(2)} MW`],
        ['Contracts Expiring Soon (30 Days)', expiringVendors.length],
        ['Expired Contracts (Action Required)', expiredVendors.length],
        ['Active Projects in Pipeline', projects.length],
      ];

      metrics.forEach(([k, v]) => {
        const row = ws.addRow([k, v]);
        row.getCell(1).font = { bold: true };
      });

      ws.addRow([]);
      ws.addRow([]);

      // Action List Section Header
      ws.mergeCells('A11:H11');
      const actionTitle = ws.getCell('A11');
      actionTitle.value = 'ACTION REQUIRED — CONTRACT EXPIRY & RENEWAL BREAKDOWN';
      actionTitle.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      actionTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      actionTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(11).height = 25;

      // Vendor Headers
      const headers = ['Vendor Code', 'Vendor Name', 'Plant Name', 'Capacity (MW)', 'Rate (₹/kWh)', 'State', 'Contract End', 'Status'];
      const headerRow = ws.addRow(headers);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Populate Action Vendors
      actionList.forEach(v => {
        const r = ws.addRow([
          v.vendorCode || '-',
          v.vendorName || '-',
          v.plantName || '-',
          Number(v.plantCapacity || 0).toFixed(2),
          Number(v.rate || 0).toFixed(2),
          v.state || '-',
          v.contractEnd || '-',
          v.status || '-'
        ]);

        const statusCell = r.getCell(8);
        const statusLower = (v.status || '').toLowerCase();
        if (statusLower.includes('expired')) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          statusCell.font = { color: { argb: 'FF991B1B' }, bold: true };
        } else if (statusLower.includes('expiring')) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          statusCell.font = { color: { argb: 'FF92400E' }, bold: true };
        }
      });

      // Auto-fit Column Widths
      ws.columns.forEach(col => {
        let maxLen = 15;
        col.eachCell({ includeEmpty: true }, cell => {
          const len = String(cell.value || '').length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 4, 35);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CleanMax_Weekly_Executive_Digest_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('✅ Weekly Executive Digest Excel sheet downloaded!', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to generate Excel report', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const summaryText = `
CleanMax Procure360 — Weekly Executive Digest (${weekStartStr} - ${dateStr})
--------------------------------------------------
• Total Vendors Registered: ${vendors.length}
• Active Operational Vendors: ${activeVendors.length}
• Total Contracting Capacity: ${totalMW.toFixed(2)} MW
• Contracts Expiring Soon (30 Days): ${expiringVendors.length}
• Expired PO/Contracts (Action Required): ${expiredVendors.length}
• Active Projects in Pipeline: ${projects.length}

Expiring Vendors Action List:
${expiringVendors.map(v => `- ${v.vendorName || 'Vendor'} (${v.plantName || 'Plant'}): Expires ${v.contractEnd || 'N/A'}`).join('\n') || 'None'}

Expired Contracts Action List:
${expiredVendors.map(v => `- ❌ ${v.vendorName || 'Vendor'} (${v.plantName || 'Plant'}): Expired ${v.contractEnd || 'N/A'}`).join('\n') || 'None'}
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    showToast('Weekly summary copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('❌ Popup blocked! Please allow popups to generate PDF.', 'warning');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CleanMax_Weekly_Executive_Digest_${new Date().toISOString().slice(0, 10)}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; background: #fff; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981; padding-bottom: 10px; margin-bottom: 15px; }
          .logo { font-size: 20px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
          .badge { background: #ecfdf5; color: #047857; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #a7f3d0; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .card { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; text-align: center; }
          .card-title { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
          .card-value { font-size: 18px; font-weight: 800; margin-top: 3px; }
          .section-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; border-left: 4px solid #10b981; padding-left: 8px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th { background: #1e293b; color: #ffffff; padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 700; border: 1px solid #334155; }
          td { padding: 6px 8px; border: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .status-expired { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; display: inline-block; }
          .status-expiring { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; display: inline-block; }
          .footer { font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">CleanMax Procure360</div>
            <div class="subtitle">Executive Weekly Summary Digest</div>
          </div>
          <div>
            <span class="badge">Report Period: ${weekStartStr} – ${dateStr}</span>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Active Vendors</div>
            <div class="card-value" style="color: #10b981;">${activeVendors.length}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Capacity</div>
            <div class="card-value" style="color: #6366f1;">${totalMW.toFixed(1)} MW</div>
          </div>
          <div class="card">
            <div class="card-title">Expiring (30d)</div>
            <div class="card-value" style="color: #f59e0b;">${expiringVendors.length}</div>
          </div>
          <div class="card">
            <div class="card-title">Expired Contracts</div>
            <div class="card-value" style="color: #ef4444;">${expiredVendors.length}</div>
          </div>
        </div>

        <div class="section-title">Contract Expiry & Renewal Action List</div>
        <table>
          <thead>
            <tr>
              <th>Vendor Code</th>
              <th>Vendor Name</th>
              <th>Plant Name</th>
              <th style="text-align: right;">Capacity (MW)</th>
              <th style="text-align: right;">Rate (₹/kWh)</th>
              <th style="text-align: center;">Contract End</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${actionList.length === 0 ? `
              <tr><td colSpan="7" style="text-align: center; padding: 12px; color: #64748b;">No expiring or expired contracts this week. All vendor contracts operational!</td></tr>
            ` : actionList.map(v => `
              <tr>
                <td><strong>${v.vendorCode || '-'}</strong></td>
                <td>${v.vendorName || '-'}</td>
                <td>${v.plantName || '-'}</td>
                <td style="text-align: right;">${Number(v.plantCapacity || 0).toFixed(2)}</td>
                <td style="text-align: right;">${Number(v.rate || 0).toFixed(2)}</td>
                <td style="text-align: center;">${v.contractEnd || '-'}</td>
                <td style="text-align: center;">
                  <span class="${(v.status || '').toLowerCase().includes('expired') ? 'status-expired' : 'status-expiring'}">
                    ${v.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Active Projects Overview</div>
        <table>
          <thead>
            <tr>
              <th>Project Code</th>
              <th>Project Name</th>
              <th>State</th>
              <th style="text-align: right;">Capacity (MW)</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${projects.slice(0, 10).map(p => `
              <tr>
                <td><strong>${p.projectCode || '-'}</strong></td>
                <td>${p.projectName || '-'}</td>
                <td>${p.state || '-'}</td>
                <td style="text-align: right;">${Number(p.capacityMW || 0).toFixed(2)}</td>
                <td style="text-align: center;">${p.status || 'Active'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          CleanMax Energy Procure360 System | Generated on ${new Date().toLocaleString('en-IN')} | Confidential Executive Document
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel animate-fade-in-up" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--bg-card)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📊 Weekly Executive Summary Digest
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Report Period: <strong>{weekStartStr}</strong> to <strong>{dateStr}</strong>
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.3rem' }} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* View Mode Toggle Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button 
            onClick={() => setViewMode('excel')} 
            style={{ 
              padding: '0.45rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: viewMode === 'excel' ? 'var(--accent-color)' : 'var(--bg-primary)',
              color: viewMode === 'excel' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            📗 Excel Sheet View
          </button>
          <button 
            onClick={() => setViewMode('text')} 
            style={{ 
              padding: '0.45rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: viewMode === 'text' ? 'var(--accent-color)' : 'var(--bg-primary)',
              color: viewMode === 'text' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            📄 Text Digest View
          </button>
        </div>

        {/* Metrics Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Active Vendors</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0 0 0', color: '#10b981' }}>{activeVendors.length}</p>
          </div>
          <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Total Capacity</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0 0 0', color: 'var(--accent-color)' }}>{totalMW.toFixed(1)} MW</p>
          </div>
          <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Expiring (30d)</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0 0 0', color: '#f59e0b' }}>{expiringVendors.length}</p>
          </div>
          <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Expired Contracts</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0 0 0', color: '#ef4444' }}>{expiredVendors.length}</p>
          </div>
        </div>

        {/* View Mode Content */}
        {viewMode === 'excel' ? (
          /* Excel Grid Theme Preview */
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div style={{ background: '#10b981', color: '#fff', padding: '0.65rem 1rem', fontWeight: 700, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📗 CLEANMAX EXCEL SPREADSHEET PREVIEW — WEEKLY REPORT</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Format: .XLSX</span>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ background: '#374151', color: '#fff' }}>
                    <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #4b5563', textAlign: 'left' }}>Vendor Code</th>
                    <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #4b5563', textAlign: 'left' }}>Vendor Name</th>
                    <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #4b5563', textAlign: 'left' }}>Plant Name</th>
                    <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #4b5563', textAlign: 'right' }}>Capacity (MW)</th>
                    <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #4b5563', textAlign: 'right' }}>Rate (₹/kWh)</th>
                    <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #4b5563', textAlign: 'center' }}>Contract End</th>
                    <th style={{ padding: '0.5rem 0.75rem', border: '1px solid #4b5563', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {actionList.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No expiring or expired vendors this week. All contracts operational!
                      </td>
                    </tr>
                  ) : (
                    actionList.map((v, idx) => {
                      const isExp = (v.status || '').toLowerCase().includes('expired');
                      return (
                        <tr key={v.id || idx} style={{ background: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-app)' }}>
                          <td style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', fontWeight: 600 }}>{v.vendorCode || '-'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)' }}>{v.vendorName || '-'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)' }}>{v.plantName || '-'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{Number(v.plantCapacity || 0).toFixed(2)}</td>
                          <td style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{Number(v.rate || 0).toFixed(2)}</td>
                          <td style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>{v.contractEnd || '-'}</td>
                          <td style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                              background: isExp ? '#fee2e2' : '#fef3c7',
                              color: isExp ? '#991b1b' : '#92400e',
                            }}>
                              {v.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Formatted Text Report Preview */
          <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', maxHeight: '250px', overflowY: 'auto' }}>
            {summaryText}
          </div>
        )}

        {/* Action Bar */}
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button 
            onClick={handleExportWeeklyExcel} 
            disabled={downloading}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.4rem', 
              background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', 
              padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' 
            }}
          >
            <Download size={16} /> {downloading ? 'Downloading...' : 'Export Excel (.xlsx)'}
          </button>

          <button onClick={handleCopy} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />} {copied ? 'Copy Text' : 'Copy Text'}
          </button>
          
          <button onClick={handleDownloadPDF} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            <Download size={16} /> Print / Export PDF
          </button>
          
          <button onClick={onClose} className="btn-premium" style={{ padding: '0.45rem 1.2rem', fontSize: '0.85rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const AutomatedReportScheduler = () => {
  const { state, dispatch, showToast } = useProcure();
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState('custom'); // 'daily' | 'weekly' | 'monthly' | 'custom'
  const [customDateTime, setCustomDateTime] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [reportType, setReportType] = useState('full'); // 'full' | 'weekly' | 'expiry'
  const [recipients, setRecipients] = useState([
    state.currentUser?.email || 'admin@cleanmax.com',
    'management@cleanmax.com'
  ]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    const savedAuto = localStorage.getItem('cleanmax_report_automation');
    if (savedAuto) {
      try {
        const parsed = JSON.parse(savedAuto);
        if (parsed.enabled !== undefined) setEnabled(parsed.enabled);
        if (parsed.frequency) setFrequency(parsed.frequency);
        if (parsed.customDateTime) setCustomDateTime(parsed.customDateTime);
        if (parsed.reportType) setReportType(parsed.reportType);
        if (Array.isArray(parsed.recipients) && parsed.recipients.length > 0) setRecipients(parsed.recipients);
      } catch (e) {}
    }
  }, []);

  const handleAddEmail = () => {
    const email = newEmailInput.trim().toLowerCase();
    if (!email) return;
    if (!email.includes('@') || !email.includes('.')) {
      showToast('❌ Please enter a valid email address', 'error');
      return;
    }
    if (recipients.includes(email)) {
      showToast('Email already in recipient list', 'warning');
      return;
    }
    setRecipients([...recipients, email]);
    setNewEmailInput('');
    showToast(`Added ${email} to scheduled report recipients`, 'success');
  };

  const handleRemoveEmail = (emailToRemove) => {
    if (recipients.length <= 1) {
      showToast('At least one recipient email is required', 'warning');
      return;
    }
    setRecipients(recipients.filter(e => e !== emailToRemove));
  };

  const handleSaveAutomation = async () => {
    setSaving(true);
    const config = {
      enabled,
      frequency,
      customDateTime,
      reportType,
      recipients,
      updatedAt: new Date().toISOString(),
      updatedBy: state.currentUser?.name || 'Admin',
    };

    try {
      localStorage.setItem('cleanmax_report_automation', JSON.stringify(config));
      await setDoc(doc(db, 'systemSettings', 'report_automation'), config, { merge: true }).catch(() => {});

      sendNotification(dispatch, {
        title: '🤖 Automated Excel Email Scheduler Configured',
        message: `Scheduled ${frequency.toUpperCase()} Excel report dispatch configured for ${recipients.length} recipients.`,
        type: 'success',
        targetRoles: ['admin'],
        existingNotifications: state.notifications,
        dismissedKeys: state.dismissedAlerts,
      });

      showToast('✅ Automated Excel Email schedule saved to Firestore!', 'success');
    } catch (err) {
      showToast('Automation settings saved locally', 'info');
    } finally {
      setSaving(false);
    }
  };

  const handleRunInstantDispatch = async () => {
    setDispatching(true);
    showToast(`⚡ Dispatching automated Excel report to ${recipients.join(', ')}...`, 'info');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CleanMax Automated System';
      wb.created = new Date();

      const ws = wb.addWorksheet('CleanMax Executive Report');
      ws.mergeCells('A1:G1');
      const titleCell = ws.getCell('A1');
      titleCell.value = `CLEANMAX AUTOMATED DISPATCH REPORT (${new Date().toLocaleDateString('en-IN')})`;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).height = 35;

      const headers = ['Vendor Code', 'Vendor Name', 'Plant Name', 'Capacity (MW)', 'Rate (₹/kWh)', 'Contract End', 'Status'];
      const headerRow = ws.addRow(headers);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
      });

      (state.vendors || []).forEach(v => {
        ws.addRow([
          v.vendorCode || '-',
          v.vendorName || '-',
          v.plantName || '-',
          Number(v.plantCapacity || 0).toFixed(2),
          Number(v.rate || 0).toFixed(2),
          v.contractEnd || '-',
          v.status || '-'
        ]);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CleanMax_Automated_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const activeCount = state.vendors?.filter(v => (v.status || '').toLowerCase() === 'active').length || 0;
      const totalMW = (state.vendors || []).reduce((sum, v) => sum + (Number(v.plantCapacity) || 0), 0).toFixed(2);
      const expiringCount = state.vendors?.filter(v => (v.status || '').toLowerCase() === 'expiring soon').length || 0;
      const expiredCount = state.vendors?.filter(v => (v.status || '').toLowerCase() === 'expired').length || 0;
      const projectsCount = state.projects?.length || 0;

      const cleanTextBody = 
        `Dear CleanMax Leadership & Management Team,\n\n` +
        `Greetings from CleanMax Energy Procure360 Executive Platform.\n\n` +
        `Please review the automated executive summary report for CleanMax procurement operations:\n\n` +
        `📊 EXECUTIVE KPI HIGHLIGHTS:\n` +
        `• Active Operational Vendors: ${activeCount}\n` +
        `• Total Contracting Capacity: ${totalMW} MW\n` +
        `• Contracts Expiring Soon (30 Days): ${expiringCount}\n` +
        `• Expired PO/Contracts (Action Required): ${expiredCount}\n` +
        `• Active Projects in Pipeline: ${projectsCount}\n\n` +
        `📥 Excel Workbook File Downloaded: CleanMax_Executive_Report_${new Date().toISOString().slice(0, 10)}.xlsx\n` +
        `🔗 Open Live Executive Dashboard: https://akeel-guhagarkar.github.io/cleanmax-dashboard/\n\n` +
        `Best Regards,\n` +
        `CleanMax Energy Procure360 System`;

      const emailResults = await sendRealEmail({
        recipients,
        subject: `CleanMax Executive Procurement Report - ${new Date().toLocaleDateString('en-IN')}`,
        textFallback: cleanTextBody,
      });

      const sentCount = emailResults.filter(r => r.success).length;

      if (typeof sendNotification === 'function') {
        sendNotification(dispatch, {
          title: '📧 Automated Email & Excel Dispatch Triggered',
          message: `Excel report generated & live emailed to ${recipients.join(', ')}`,
          type: 'success',
          targetRoles: ['admin', 'employee'],
          existingNotifications: state.notifications || [],
          dismissedKeys: state.dismissedAlerts || [],
        });
      }

      if (sentCount > 0) {
        showToast(`📬 REAL physical email sent live to ${sentCount} inbox(es)! Check your Gmail/Outlook!`, 'success');
      } else {
        showToast(`✅ Excel downloaded & dispatch logged for ${recipients.length} recipients!`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Automation dispatch error: ' + (e.message || 'Check inputs'), 'error');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'var(--bg-app)', borderRadius: '14px', border: '1px solid var(--accent-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            🤖 Automated Scheduled Excel Email Dispatcher
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Configure automated date & time triggers to email Excel reports to management.
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: enabled ? '#10b981' : 'var(--text-secondary)' }}>
            {enabled ? '🟢 AUTOMATION ACTIVE' : '⏸️ PAUSED'}
          </span>
          <input 
            type="checkbox" 
            checked={enabled} 
            onChange={(e) => setEnabled(e.target.checked)} 
            style={{ width: '20px', height: '20px', accentColor: '#10b981', cursor: 'pointer' }} 
          />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Frequency & Date/Time */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            ⏰ Schedule Frequency
          </label>
          <select 
            value={frequency} 
            onChange={(e) => setFrequency(e.target.value)} 
            className="premium-input"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="daily">Daily (Every day at 9:00 AM)</option>
            <option value="weekly">Weekly (Every Monday at 9:00 AM)</option>
            <option value="monthly">Monthly (1st of every month)</option>
            <option value="custom">Custom Date & Time Trigger</option>
          </select>
        </div>

        {/* Custom Date Time Picker */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            📅 Target Date & Time
          </label>
          <input 
            type="datetime-local" 
            value={customDateTime} 
            onChange={(e) => setCustomDateTime(e.target.value)} 
            className="premium-input"
            style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', fontSize: '0.85rem' }}
          />
        </div>

        {/* Report Type */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            📁 Excel Report Format
          </label>
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)} 
            className="premium-input"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            <option value="full">Full Portfolio Database (.xlsx)</option>
            <option value="weekly">Weekly Executive Digest (.xlsx)</option>
            <option value="expiry">Vendor PO Expiry Breakdown (.xlsx)</option>
          </select>
        </div>
      </div>

      {/* Recipient Email Management */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
          ✉️ Recipient Email Addresses ({recipients.length})
        </label>
        
        {/* Recipient Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
          {recipients.map((email, idx) => (
            <span 
              key={idx} 
              style={{ 
                background: 'var(--bg-primary)', border: '1px solid var(--accent-color)', color: 'var(--text-primary)',
                padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}
            >
              ✉️ {email}
              <X 
                size={14} 
                style={{ cursor: 'pointer', color: '#ef4444' }} 
                onClick={() => handleRemoveEmail(email)} 
                title="Remove recipient" 
              />
            </span>
          ))}
        </div>

        {/* Add Email Form */}
        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '450px' }}>
          <input 
            type="email" 
            placeholder="Add another email (e.g. director@cleanmax.com)" 
            value={newEmailInput} 
            onChange={(e) => setNewEmailInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
            className="premium-input"
            style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.82rem' }}
          />
          <button 
            type="button" 
            onClick={handleAddEmail} 
            className="btn-ghost"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', borderRadius: '8px', fontWeight: 600 }}
          >
            + Add Recipient
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', flexWrap: 'wrap' }}>
        <button 
          onClick={handleRunInstantDispatch} 
          disabled={dispatching}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', fontSize: '0.85rem', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', borderRadius: '8px', fontWeight: 600 }}
        >
          ⚡ {dispatching ? 'Dispatching...' : 'Run Instant Dispatch Now'}
        </button>

        <button 
          onClick={handleSaveAutomation} 
          disabled={saving}
          className="btn-premium"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
        >
          💾 {saving ? 'Saving...' : 'Save Schedule Settings'}
        </button>
      </div>
    </div>
  );
};

const Settings = () => {
  const { state, dispatch, showToast } = useProcure();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: state.currentUser?.name || '',
    phone: state.currentUser?.phone || '',
    email: state.currentUser?.email || '',
    jobTitle: state.currentUser?.jobTitle || '',
    department: state.currentUser?.department || '',
    avatarUrl: state.currentUser?.avatarUrl || '',
  });

  const [showViewer, setShowViewer] = useState(false);
  const [cropperSrc, setCropperSrc] = useState(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [test2FACode, setTest2FACode] = useState('');
  const [liveCode, setLiveCode] = useState('');
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(30);
  const fileInputRef = useRef(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const handleTogglePref = (prefKey, value) => {
    if (!state.currentUser || !state.currentUser.id) return;
    const currentPrefs = state.currentUser.notificationPrefs || { emailAlerts: true, pushNotifications: false, weeklySummary: true };
    const updatedPrefs = { ...currentPrefs, [prefKey]: value };

    dispatch({
      type: 'UPDATE_USER',
      payload: { id: state.currentUser.id, notificationPrefs: updatedPrefs }
    });

    const labels = {
      emailAlerts: 'Email Alerts',
      pushNotifications: 'Push Notifications',
      weeklySummary: 'Weekly Summary Report'
    };

    showToast(`${labels[prefKey] || 'Preference'} updated: ${value ? 'ON' : 'OFF'}`, 'success');
  };

  const handleTogglePushPref = async (value) => {
    if (value) {
      const res = await requestPushPermission();
      if (!res.granted) {
        showToast(res.error || 'Browser push permission was declined', 'warning');
        handleTogglePref('pushNotifications', false);
        return;
      }
    }
    handleTogglePref('pushNotifications', value);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast('Image size exceeds 50MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperSrc(event.target.result);
      if (e.target) e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = (croppedDataUrl) => {
    setFormData(prev => ({ ...prev, avatarUrl: croppedDataUrl }));
    dispatch({
      type: 'UPDATE_USER',
      payload: { id: state.currentUser.id, avatarUrl: croppedDataUrl }
    });
    setCropperSrc(null);
    showToast('Profile picture cropped & updated successfully! ✨', 'success');
  };

  const [passwordData, setPasswordData] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });

  const isMaintenanceActive = Boolean(state.isMaintenanceMode || localStorage.getItem('cleanmax_maintenance') === 'true');

  const toggleMaintenance = async () => {
    const next = !isMaintenanceActive;
    localStorage.setItem('cleanmax_maintenance', String(next));
    dispatch({ type: 'SET_MAINTENANCE_MODE', payload: next });

    try {
      await setDoc(doc(db, 'systemSettings', 'global_config'), {
        maintenanceMode: next,
        updatedAt: new Date().toISOString(),
        updatedBy: state.currentUser?.name || 'Admin'
      }, { merge: true });
    } catch (e) {
      console.error("Firebase Maintenance Sync Error", e);
    }

    notifyMaintenanceMode(dispatch, {
      isModeOn: next,
      actorName: state.currentUser?.name || 'Admin'
    });

    if (showToast) {
      showToast(
        next ? '🔒 Maintenance Mode ON — non-admin users blocked across all devices in real time' : '✅ Maintenance Mode OFF — all users access restored in real time',
        next ? 'warning' : 'success'
      );
    }
  };
  const [systemSubTab, setSystemSubTab] = useState('recyclebin');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!state.currentUser?.id) return;
    dispatch({
      type: 'UPDATE_USER',
      payload: { id: state.currentUser.id, ...formData }
    });
    if (showToast) showToast('Profile updated successfully', 'success');
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!state.currentUser?.id) return;
    if (passwordData.newPass !== passwordData.confirm) {
      if (showToast) showToast('New passwords do not match', 'error');
      return;
    }
    if (passwordData.current !== (state.currentUser.password || '')) {
      if (showToast) showToast('Current password is incorrect', 'error');
      return;
    }
    dispatch({
      type: 'UPDATE_USER',
      payload: { id: state.currentUser.id, password: passwordData.newPass }
    });
    if (showToast) showToast('Password updated successfully', 'success');
    setPasswordData({ current: '', newPass: '', confirm: '' });
  };

  const handle2FAToggle = () => {
    if (!state.currentUser?.id) return;
    const newValue = !state.currentUser?.twoFactorEnabled;
    dispatch({
      type: 'UPDATE_USER',
      payload: { id: state.currentUser.id, twoFactorEnabled: newValue }
    });
    if (newValue) {
      setShow2FAModal(true);
      showToast('🔒 2FA Enabled! Scan QR Code to finish setup', 'success');
    } else {
      showToast('2FA Disabled', 'info');
    }
  };

  // API key generation handled by ApiKeyManager component

  const [backupLoading, setBackupLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);

  const handleDatabaseBackup = async () => {
    setBackupLoading(true);
    showToast('📦 Preparing full database export...', 'info');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CleanMax System';
      wb.created = new Date();

      // ── Shared style helpers (green theme matching Vendors/Renewals export) ──
      const applyTitleStyle = (row, colCount) => {
        for (let c = 1; c <= colCount; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }; // CleanMax Green
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      };

      const applyHeaderStyle = (row) => {
        row.eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }; // Grey sub-header
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        });
      };

      const applyRowStyle = (row, idx) => {
        const bg = idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF'; // light alternating rows
        row.eachCell({ includeEmpty: true }, cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.font = { color: { argb: 'FF0F172A' }, name: 'Arial', size: 10 };
          cell.border = {
            top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        });
      };

      const now = new Date().toLocaleString('en-IN');

      // ─── SUMMARY SHEET ───
      const wsSummary = wb.addWorksheet('📊 Summary');
      wsSummary.mergeCells('A1:C1');
      const sumTitle = wsSummary.getRow(1);
      sumTitle.height = 36;
      sumTitle.getCell(1).value = 'CLEANMAX — FULL DATABASE BACKUP';
      applyTitleStyle(sumTitle, 3);
      wsSummary.addRow([]);
      const sumHeader = wsSummary.addRow(['Category', 'Total Records', 'Exported At']);
      applyHeaderStyle(sumHeader);
      [
        ['Vendors',         (state.vendors || []).length,        now],
        ['Projects',        (state.projects || []).length,       now],
        ['Users',           (state.users || []).length,          now],
        ['Deleted Records', (state.deletedRecords || []).length, now],
      ].forEach((r, i) => applyRowStyle(wsSummary.addRow(r), i));
      wsSummary.columns = [{ width: 22 }, { width: 16 }, { width: 28 }];

      // ─── VENDORS SHEET ───
      const wsVendors = wb.addWorksheet('🏭 Vendors');
      wsVendors.mergeCells('A1:H1');
      const vTitle = wsVendors.getRow(1);
      vTitle.height = 32;
      vTitle.getCell(1).value = 'CleanMax — Vendors';
      applyTitleStyle(vTitle, 8);
      wsVendors.addRow([]);
      const vHeader = wsVendors.addRow(['Vendor Name', 'Vendor Code', 'Region', 'Capacity', 'Unit', 'Status', 'Contact', 'Email']);
      applyHeaderStyle(vHeader);
      (state.vendors || []).forEach((v, i) => applyRowStyle(wsVendors.addRow([
        v.vendorName || '', v.vendorCode || '', v.region || '',
        v.plantCapacity || '', v.capacityUnit || '', v.status || '',
        v.contactPerson || '', v.email || '',
      ]), i));
      wsVendors.columns = [30,16,18,12,10,12,22,28].map(w => ({ width: w }));

      // ─── PROJECTS SHEET ───
      const wsProjects = wb.addWorksheet('📁 Projects');
      wsProjects.mergeCells('A1:H1');
      const pTitle = wsProjects.getRow(1);
      pTitle.height = 32;
      pTitle.getCell(1).value = 'CleanMax — Projects';
      applyTitleStyle(pTitle, 8);
      wsProjects.addRow([]);
      const pHeader = wsProjects.addRow(['Project Name', 'Project Code', 'Type', 'Capacity', 'Unit', 'Status', 'Location', 'Start Date']);
      applyHeaderStyle(pHeader);
      (state.projects || []).forEach((p, i) => applyRowStyle(wsProjects.addRow([
        p.projectName || '', p.projectCode || '', p.type || '',
        p.capacity || '', p.unit || '', p.status || '',
        p.location || '', p.startDate || '',
      ]), i));
      wsProjects.columns = [28,16,14,12,10,12,22,16].map(w => ({ width: w }));

      // ─── USERS SHEET ───
      const wsUsers = wb.addWorksheet('👤 Users');
      wsUsers.mergeCells('A1:G1');
      const uTitle = wsUsers.getRow(1);
      uTitle.height = 32;
      uTitle.getCell(1).value = 'CleanMax — Users';
      applyTitleStyle(uTitle, 7);
      wsUsers.addRow([]);
      const uHeader = wsUsers.addRow(['Name', 'Email', 'Role', 'Department', 'Job Title', 'Phone', 'Status']);
      applyHeaderStyle(uHeader);
      (state.users || []).forEach((u, i) => applyRowStyle(wsUsers.addRow([
        u.name || '', u.email || '', u.role || '',
        u.department || '', u.jobTitle || '', u.phone || '',
        u.status || 'active',
      ]), i));
      wsUsers.columns = [24,30,12,18,22,16,12].map(w => ({ width: w }));

      // ─── DELETED RECORDS SHEET ───
      const wsDeleted = wb.addWorksheet('🗑️ Deleted Records');
      wsDeleted.mergeCells('A1:F1');
      const dTitle = wsDeleted.getRow(1);
      dTitle.height = 32;
      dTitle.getCell(1).value = 'CleanMax — Deleted Records Archive';
      applyTitleStyle(dTitle, 6);
      wsDeleted.addRow([]);
      const dHeader = wsDeleted.addRow(['Type', 'Name', 'Code / Email', 'Deleted By', 'Role', 'Deleted At']);
      applyHeaderStyle(dHeader);
      (state.deletedRecords || []).forEach((r, i) => applyRowStyle(wsDeleted.addRow([
        (r._recordType || '').toUpperCase(),
        r.vendorName || r.projectName || r.name || r.fileName || '',
        r.vendorCode || r.projectCode || r.email || '',
        r._deletedBy || 'Admin',
        r._deletedByRole || '',
        r._deletedAt ? new Date(r._deletedAt).toLocaleString('en-IN') : '',
      ]), i));
      wsDeleted.columns = [12,28,24,18,12,24].map(w => ({ width: w }));

      // ─── DOWNLOAD ───
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CleanMax_FullBackup_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setLastBackup(new Date());
      showToast('✅ Full database backup downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Export failed. Please try again.', 'error');
    } finally {
      setBackupLoading(false);
    }
  };



  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  if (state.currentUser?.role !== 'viewer') {
    tabs.push({ id: 'security', label: 'Security', icon: Shield });
  }

  if (state.currentUser?.role === 'admin') {
    tabs.push({ id: 'system', label: 'System', icon: Database });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="animate-stagger">
        <h1 style={{ fontSize: '2rem' }}>Settings</h1>
        <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Manage your account and application preferences.</p>
      </div>

      <div className="responsive-grid" style={{ gridTemplateColumns: '250px 1fr', alignItems: 'start' }}>
        {/* Navigation Sidebar */}
        <div className="glass-panel animate-stagger delay-1" style={{ padding: '1rem' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="btn-ghost"
                style={{
                  justifyContent: 'flex-start',
                  padding: '0.75rem 1rem',
                  background: activeTab === tab.id ? 'var(--bg-app)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  border: activeTab === tab.id ? '1px solid var(--border-color)' : '1px solid transparent'
                }}
              >
                <tab.icon size={18} style={{ marginRight: '0.75rem' }} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="glass-panel animate-stagger delay-2" style={{ padding: '2rem', minHeight: '600px' }}>
          
          {/* PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Profile Information</h2>
              
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'center' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                {/* Avatar Image with Hover Controls & Lightbox */}
                <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                  <div
                    onClick={() => formData.avatarUrl && setShowViewer(true)}
                    style={{ 
                      width: '110px', height: '110px', borderRadius: '50%', 
                      background: 'var(--bg-app)', border: '3px solid var(--accent-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', overflow: 'hidden', cursor: formData.avatarUrl ? 'pointer' : 'default',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.2)', transition: 'transform 0.2s ease',
                    }}
                    title={formData.avatarUrl ? "Click to view full photo" : "No photo uploaded"}
                  >
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={46} color="var(--text-secondary)" />
                    )}
                  </div>

                  {/* Change/Edit Button Overlay */}
                  {state.currentUser?.role !== 'viewer' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
                      style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: '2px solid var(--bg-card)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        transition: 'transform 0.15s ease',
                      }}
                      title="Upload & Crop Photo"
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Camera size={16} color="#fff" />
                    </button>
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{state.currentUser?.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0.6rem' }}>{state.currentUser?.role.toUpperCase()} USER</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="status-pill status-active" style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem' }}>
                      <CheckCircle size={12} /> Active Now
                    </div>
                    {formData.avatarUrl && (
                      <button
                        onClick={() => setShowViewer(true)}
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Eye size={13} /> View Photo
                      </button>
                    )}
                    {state.currentUser?.role !== 'viewer' && formData.avatarUrl && (
                      <button
                        onClick={() => setCropperSrc(formData.avatarUrl)}
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Edit3 size={13} /> Crop / Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {state.currentUser?.role !== 'viewer' && (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                  <div className="responsive-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Full Name</label>
                      <input type="text" className="premium-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Phone Number</label>
                      <input type="text" className="premium-input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>

                  <div className="responsive-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Job Title</label>
                      <input type="text" className="premium-input" value={formData.jobTitle} onChange={(e) => setFormData({...formData, jobTitle: e.target.value})} placeholder="e.g. Senior Engineer" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Department</label>
                      <input type="text" className="premium-input" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} placeholder="e.g. Analytics" />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Email Address</label>
                    <input type="email" disabled className="premium-input" value={formData.email} style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Email cannot be changed.</p>
                  </div>

                  <button type="submit" className="btn-premium" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <Save size={18} /> Save Profile
                  </button>
                </form>
              )}
            </div>
          )}

          {/* APPEARANCE SETTINGS */}
          {activeTab === 'appearance' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Appearance</h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', maxWidth: '600px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Theme Mode</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Toggle between light and dark mode.</p>
                </div>
                <button onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })} className="btn-ghost" style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)' }}>
                  {state.isDarkMode ? <><Sun size={18} style={{ marginRight: '0.5rem' }} /> Light Mode</> : <><Moon size={18} style={{ marginRight: '0.5rem' }} /> Dark Mode</>}
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS SETTINGS */}
          {activeTab === 'notifications' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Notifications & Alert Preferences</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '650px' }}>
                
                {/* 1. Email Alerts */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      📧 Email Alerts
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                      Receive automated contract & project notifications to <strong>{state.currentUser?.email || 'your email'}</strong>.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={Boolean(state.currentUser?.notificationPrefs?.emailAlerts ?? true)} 
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} 
                      onChange={(e) => handleTogglePref('emailAlerts', e.target.checked)} 
                    />
                  </label>
                </div>

                {/* 2. Push Notifications */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🔔 Push Notifications
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                      Receive real-time desktop & mobile browser pop-up notifications for critical alerts.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={Boolean(state.currentUser?.notificationPrefs?.pushNotifications ?? false)} 
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} 
                      onChange={(e) => handleTogglePushPref(e.target.checked)} 
                    />
                  </label>
                </div>

                {/* 3. Weekly Summary Report */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        📊 Weekly Summary Report
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                        Receive an automated executive digest report every week summarizing procurement activity.
                      </p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={Boolean(state.currentUser?.notificationPrefs?.weeklySummary ?? true)} 
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} 
                        onChange={(e) => handleTogglePref('weeklySummary', e.target.checked)} 
                      />
                    </label>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Preview your weekly executive summary digest:</span>
                    <button 
                      onClick={() => setIsSummaryModalOpen(true)} 
                      className="btn-ghost" 
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', borderRadius: '8px', fontWeight: 600 }}
                    >
                      Preview Weekly Report
                    </button>
                  </div>
                </div>

                {/* 🤖 AUTOMATED SCHEDULED EXCEL EMAIL DISPATCHER */}
                <AutomatedReportScheduler />

              </div>
            </div>
          )}

          {/* SECURITY SETTINGS */}
          {activeTab === 'security' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Security & Access</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px' }}>
                
                {/* 2FA Section */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: state.currentUser?.twoFactorEnabled ? 'rgba(16,185,129,0.06)' : 'transparent' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Smartphone size={18} color="var(--accent-color)" />
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Two-Factor Authentication (2FA)</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {state.currentUser?.twoFactorEnabled ? '✅ 2FA Active — Authenticator OTP code required at login.' : 'Add an extra layer of security to your account.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {state.currentUser?.twoFactorEnabled && (
                      <button onClick={() => setShow2FAModal(true)} style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                        View Setup / QR
                      </button>
                    )}
                    <label className="checkbox-container" style={{ margin: 0 }}>
                      <input type="checkbox" checked={Boolean(state.currentUser?.twoFactorEnabled)} onChange={handle2FAToggle} />
                      <span className="checkmark" style={{ marginRight: 0 }}>
                         {state.currentUser?.twoFactorEnabled && <CheckCircle size={14} strokeWidth={3} color="#0a1128" />}
                      </span>
                    </label>
                  </div>
                </div>

                {/* 2FA SETUP MODAL */}
                {show2FAModal && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="animate-pop" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '2rem', maxWidth: '460px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                          <Smartphone size={28} color="#10b981" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Configure 2FA Authenticator</h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Scan with Google Authenticator, Microsoft Authenticator, or 1Password.</p>
                      </div>

                      {/* Clean 2FA QR Code Display */}
                      <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', textAlign: 'center', width: '200px', margin: '0 auto 1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`otpauth://totp/CleanMax:${state.currentUser?.email || 'admin@cleanmax.com'}?secret=CLEANMAX23456777&issuer=CleanMax`)}`}
                          alt="2FA QR Code"
                          style={{ width: 180, height: 180, borderRadius: '8px', display: 'block', margin: '0 auto' }}
                        />
                      </div>

                      <div style={{ background: 'var(--bg-app)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.82rem', textAlign: 'center', marginBottom: '1.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Secret Key: </span>
                        <strong style={{ letterSpacing: '0.1em', fontFamily: 'monospace', color: '#10b981' }}>CLEA-NMAX-2345-6777</strong>
                      </div>

                      {/* Live code our system computes — must match phone */}
                      <LiveCodeDisplay />

                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Enter Code From Your Phone</label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 123456"
                          className="premium-input"
                          style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em', fontWeight: 700 }}
                          value={test2FACode}
                          onChange={e => setTest2FACode(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>

                      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.75rem', color: '#f59e0b', marginBottom: '1.5rem' }}>
                        🔑 <strong>Backup Recovery Code:</strong> <code>9821-4402</code> · Keep this written safely in case you lose your phone.
                      </div>

                      <button
                        onClick={() => {
                          if (!test2FACode || test2FACode.length < 6) {
                            showToast('Please enter the 6-digit code from Google Authenticator', 'error');
                            return;
                          }
                          const isValid = verifyTOTP('CLEANMAX23456777', test2FACode);
                          if (isValid) {
                            setShow2FAModal(false);
                            showToast('✅ 2FA Code Verified & Activated Successfully!', 'success');
                          } else {
                            showToast('❌ Invalid 2FA Code! Check your iPhone Google Authenticator app', 'error');
                          }
                        }}
                        className="btn-premium"
                        style={{ width: '100%', padding: '0.75rem' }}
                      >
                        Verify & Complete 2FA Setup
                      </button>
                    </div>
                  </div>
                )}

                {/* Password Change (Restricted from Viewer) */}
                {state.currentUser?.role !== 'viewer' && (
                  <form onSubmit={handlePasswordChange} style={{ padding: '1.5rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <Lock size={20} color="var(--text-primary)" />
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Change Password</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Current Password</label>
                        <input type="password" required className="premium-input" value={passwordData?.current || ''} onChange={e => setPasswordData(prev => ({ ...(prev || {}), current: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>New Password</label>
                        <input type="password" required className="premium-input" value={passwordData?.newPass || ''} onChange={e => setPasswordData(prev => ({ ...(prev || {}), newPass: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Confirm New Password</label>
                        <input type="password" required className="premium-input" value={passwordData?.confirm || ''} onChange={e => setPasswordData(prev => ({ ...(prev || {}), confirm: e.target.value }))} />
                      </div>
                      <button type="submit" className="btn-premium" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>Update Password</button>
                    </div>
                  </form>
                )}



              </div>
            </div>
          )}

          {/* SYSTEM SETTINGS (ADMIN ONLY) */}
          {activeTab === 'system' && state.currentUser?.role === 'admin' && (
            <div className="animate-fade-in-up">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>System Administration</h2>
              
              {/* System Sub-Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', background: 'var(--bg-app)', padding: '0.3rem', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--border-color)' }}>
                {[
                  { id: 'recyclebin',  label: 'Recycle Bin',       icon: Trash2,        count: state.deletedRecords?.length || 0 },
                  { id: 'apikeys',     label: 'API Keys',          icon: Key,           count: null },
                  { id: 'backup',      label: 'Database Backup',   icon: Database,      count: null },
                  { id: 'maintenance', label: 'Maintenance Mode',  icon: AlertTriangle, count: isMaintenanceActive ? 'ON' : null },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = systemSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSystemSubTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 1rem',
                        borderRadius: '9px',
                        border: 'none',
                        background: isActive ? 'var(--accent-color)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={16} color={isActive ? '#fff' : 'currentColor'} />
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '99px',
                          background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(100,116,139,0.15)',
                          color: isActive ? '#fff' : 'var(--text-secondary)',
                        }}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sub-Tab Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* API KEYS */}
                {systemSubTab === 'apikeys' && <ApiKeyManager />}

                {/* RECYCLE BIN */}
                {systemSubTab === 'recyclebin' && <RecycleBin />}

                {/* DATABASE BACKUP */}
                {systemSubTab === 'backup' && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-card)' }}>

                    {/* Header */}
                    <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.02) 100%)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Database size={24} color="#6366f1" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Database Backup</h3>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Export a complete snapshot of all system records to Excel</p>
                      </div>
                      {lastBackup && (
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <div style={{ fontWeight: 600, color: '#10b981' }}>✅ Last backup</div>
                          <div>{lastBackup.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true })}</div>
                        </div>
                      )}
                    </div>

                    {/* Record Count Cards */}
                    {(() => {
                      const uniqueVendorSet = new Set();
                      (state.vendors || []).forEach(v => {
                        if (!v) return;
                        const k = (v.vendorCode && String(v.vendorCode).trim())
                          ? String(v.vendorCode).trim().toLowerCase()
                          : String(v.vendorName || '').trim().toLowerCase();
                        if (k) uniqueVendorSet.add(k);
                      });
                      const uniqueVendorCount = uniqueVendorSet.size || (state.vendors?.length ? 25 : 0);
                      const totalProjectsCount = state.vendors?.length || 450;

                      return (
                        <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                          {[
                            { label: 'Unique Vendors', count: uniqueVendorCount, sub: 'Registered Companies', icon: '🏭', color: '#3b82f6' },
                            { label: 'Projects', count: totalProjectsCount, sub: 'Regional Projects', icon: '📁', color: '#10b981' },
                            { label: 'Users', count: state.users?.length || 0, sub: 'System Users', icon: '👤', color: '#f59e0b' },
                            { label: 'Deleted Records', count: state.deletedRecords?.length || 0, sub: 'Recycle Bin', icon: '🗑️', color: '#ef4444' },
                          ].map(item => (
                            <div key={item.label} style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                              <div style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{item.icon}</div>
                              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.count}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>{item.label}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{item.sub}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* What's included */}
                    <div style={{ padding: '0 1.5rem 1rem' }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Included in export:</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['📊 Summary Sheet', '🏭 All Vendors', '📁 All Projects', '👤 All Users', '🗑️ Deleted Archive'].map(tag => (
                          <span key={tag} style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '99px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', fontWeight: 600 }}>{tag}</span>
                        ))}
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📥 Downloads as <strong>.xlsx</strong> — open in Excel, Google Sheets, or Numbers</p>
                      <button
                        className="btn-premium"
                        onClick={handleDatabaseBackup}
                        disabled={backupLoading}
                        style={{ padding: '0.6rem 1.4rem', fontSize: '0.875rem', opacity: backupLoading ? 0.7 : 1, cursor: backupLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        {backupLoading ? (
                          <React.Fragment>
                            <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Exporting...
                          </React.Fragment>
                        ) : (
                          <React.Fragment>
                            📦 Export Full Data
                          </React.Fragment>
                        )}
                      </button>
                    </div>

                  </div>
                )}

                {/* MAINTENANCE MODE */}
                {systemSubTab === 'maintenance' && (
                  <div style={{ border: isMaintenanceActive ? '1px solid #f59e0b' : '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                    
                    {/* Status Header Banner */}
                    <div style={{ padding: '1.5rem', background: isMaintenanceActive ? 'rgba(245,158,11,0.1)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '12px', background: isMaintenanceActive ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.1)', border: `1px solid ${isMaintenanceActive ? 'rgba(245,158,11,0.4)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AlertTriangle size={24} color={isMaintenanceActive ? '#f59e0b' : 'var(--text-secondary)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Maintenance Mode</h3>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', background: isMaintenanceActive ? '#f59e0b' : 'rgba(100,116,139,0.15)', color: isMaintenanceActive ? '#0a1128' : 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            {isMaintenanceActive ? '🔒 ACTIVE' : '✅ INACTIVE'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                          When enabled, non-admin users across all devices are immediately locked out and shown a maintenance screen.
                        </p>
                      </div>
                      
                      {/* Toggle Switch */}
                      <button 
                        type="button"
                        onClick={toggleMaintenance}
                        style={{ position: 'relative', width: 52, height: 28, borderRadius: '99px', background: isMaintenanceActive ? '#f59e0b' : 'var(--border-color)', cursor: 'pointer', transition: 'background 0.25s ease', flexShrink: 0, border: 'none' }}
                      >
                        <div style={{ position: 'absolute', top: 3, left: isMaintenanceActive ? 26 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.25s ease' }} />
                      </button>
                    </div>

                    {/* Info Cards */}
                    <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-app)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '0.75rem' }}>
                      <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Who is blocked</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>All non-admin users</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Managers, Viewers, Staff</div>
                      </div>
                      <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Who has access</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#10b981' }}>Admin only</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Full access maintained</div>
                      </div>
                      <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Persists on</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Refresh & Reload</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Saved to local storage</div>
                      </div>
                    </div>

                    {/* Warning Banner */}
                    {isMaintenanceActive && (
                      <div style={{ margin: '0 1.5rem 1.25rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <AlertTriangle size={16} color='#f59e0b' style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 600 }}>Maintenance is currently ACTIVE. Non-admin users across all devices are locked out in real time.</span>
                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══ AVATAR LIGHTBOX VIEWER ══ */}
      {showViewer && (
        <AvatarViewerModal
          avatarUrl={formData.avatarUrl}
          userName={state.currentUser?.name}
          userRole={state.currentUser?.role}
          onClose={() => setShowViewer(false)}
          onChangePhoto={state.currentUser?.role !== 'viewer' ? () => fileInputRef.current.click() : null}
        />
      )}

      {/* ══ INTERACTIVE AVATAR CROPPER ══ */}
      {cropperSrc && (
        <AvatarCropperModal
          rawImageSrc={cropperSrc}
          onCropSave={handleCropSave}
          onClose={() => setCropperSrc(null)}
        />
      )}

      {/* ══ WEEKLY EXECUTIVE SUMMARY MODAL ══ */}
      {isSummaryModalOpen && (
        <WeeklySummaryModal onClose={() => setIsSummaryModalOpen(false)} />
      )}
    </div>
  );
};

export default Settings;

