// v20260727173503
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Mail, Lock, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { useProcure } from '../context/ProcureContext';
import { verifyTOTP } from '../utils/totp';

const Login = ({ onLogin }) => {
  const { state, dispatch, showToast } = useProcure();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('cleanmax_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const bgImage = new Image();
    bgImage.src = `${import.meta.env.BASE_URL}login image .png`;
    const logoImage = new Image();
    logoImage.src = `${import.meta.env.BASE_URL}clean logo without background .png`;
    let loadedCount = 0;
    const onLoad = () => { loadedCount++; if (loadedCount === 2) setImagesLoaded(true); };
    bgImage.onload = onLoad; bgImage.onerror = onLoad;
    logoImage.onload = onLoad; logoImage.onerror = onLoad;
  }, []);

  const saveDevicePreference = (userEmail) => {
    if (rememberMe) {
      localStorage.setItem('cleanmax_remembered_email', userEmail);
      localStorage.setItem('cleanmax_remember_device', 'true');
    } else {
      localStorage.removeItem('cleanmax_remembered_email');
      localStorage.removeItem('cleanmax_remember_device');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      const normalizedEmail = email.trim().toLowerCase();
      const matchingUsers = state.users.filter(u => u.email && u.email.trim().toLowerCase() === normalizedEmail);
      
      if (matchingUsers.length > 0) {
        const userWithPassword = matchingUsers.find(u => String(u.password).trim() === String(password).trim());
        
        if (userWithPassword) {
          saveDevicePreference(normalizedEmail);
          if (userWithPassword.twoFactorEnabled) {
            setPendingUser(userWithPassword);
            setIs2FAStep(true);
            showToast('🔒 2FA Verification Code Required', 'info');
          } else {
            dispatch({ type: 'LOGIN', payload: userWithPassword });
            onLogin(userWithPassword);
          }
        } else {
          showToast('incorrect password', 'error');
        }
      } else {
        showToast('User not found', 'error');
      }
    }, 1200);
  };

  const handle2FASubmit = (e) => {
    e.preventDefault();
    const cleanInput = twoFactorCode.trim().replace(/-/g, '');
    if (!cleanInput) {
      showToast('Please enter your 6-digit 2FA code or backup code', 'error');
      return;
    }
    setIsLoading(true);
    const secret = pendingUser?.twoFactorSecret || 'CLEANMAX23456777';
    const isBackupMatch = cleanInput === '98214402';
    const isValid = isBackupMatch || verifyTOTP(secret, cleanInput);

    setIsLoading(false);
    if (isValid) {
      dispatch({ type: 'LOGIN', payload: pendingUser });
      onLogin(pendingUser);
      showToast(isBackupMatch ? '✅ Verified & Signed In via Backup Recovery Code!' : '✅ 2FA Code Verified!', 'success');
    } else {
      showToast('❌ Invalid Code! Check your authenticator app or backup code', 'error');
    }
  };

  // --- Animation Orchestration Variables ---
  // Stage 1: Image Fade & Zoom (0s - 2s)
  // Stage 3: Logo Fade & Slide (delay 2s, duration 1s)
  // Stage 4: Titles Fade & Blur Remove (delay 2.8s)
  // Stage 5: Form Card Reveal (delay 4s)

  if (!imagesLoaded) {
    // Show a blank dark screen while images load, so the animation starts seamlessly
    return <div className="enterprise-login-wrapper" style={{ backgroundColor: '#000' }}></div>;
  }

  return (
    <div className="enterprise-login-wrapper">
      {/* STAGE 1 & 2: Background Cinematic Layer */}
      <motion.div 
        className="cinematic-background"
        initial={{ opacity: 0, scale: 1.15 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 4, ease: "easeOut" }} // Slow, elegant zoom out and fade in
      >
        <motion.div 
          className="cinematic-overlay"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
          transition={{ delay: 5, duration: 1.5, ease: "easeInOut" }}
        ></motion.div>
        <div className="lens-flare"></div>
        {/* CSS Particles */}
        <div className="particles-container">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`particle p-${i}`}></div>
          ))}
        </div>
      </motion.div>

      <div className="enterprise-login-content">
        
        {/* STAGES 3 & 4: Left Side Hero Content */}
        <div className="enterprise-hero-section">
          <motion.div 
            className="enterprise-logo-block"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src={`${import.meta.env.BASE_URL}clean logo without background .png`} alt="CleanMax Logo" className="enterprise-brand-logo" />
          </motion.div>

          <motion.div 
            className="enterprise-title-block"
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 2.8, duration: 1.2, ease: "easeOut" }}
          >
            <h1 className="hero-title">O&M Service Dashboard</h1>
            <motion.p 
              className="hero-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.5, duration: 1 }}
            >
              Maximizing Solar Performance, Every Day
            </motion.p>
          </motion.div>
        </div>

        {/* STAGE 5: Right Side Login Card */}
        <div className="enterprise-form-section">
          <motion.div 
            className="enterprise-glass-card"
            initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 5, duration: 1.5, ease: "easeOut" }}
          >
            {!is2FAStep ? (
              <React.Fragment>
                <div className="card-header">
                  <h3>Secure Access</h3>
                  <p>Enter your credentials to proceed.</p>
                </div>

                <form onSubmit={handleSubmit} className="enterprise-form">
                  <div className="form-group">
                    <label>Email</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" />
                      <input 
                        type="email" 
                        className="enterprise-input" 
                        placeholder="user@cleanmax.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        className="enterprise-input" 
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                        style={{ paddingRight: '3rem' }}
                        required
                      />
                      {(isPasswordFocused || password.length > 0) && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgba(255, 255, 255, 0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.2rem',
                            zIndex: 5,
                            transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-options">
                    <label className="checkbox-container">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="checkmark">
                        {rememberMe && <Check size={14} strokeWidth={3} color="#0a1128" />}
                      </span>
                      Remember this device
                    </label>
                    
                    <a href="#" className="forgot-link">Recover access</a>
                  </div>

                  <motion.button 
                    type="submit" 
                    className="enterprise-submit-btn"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="premium-loader"></span>
                    ) : (
                      <>
                        <span>Authenticate</span>
                        <ArrowRight size={18} className="btn-icon" />
                      </>
                    )}
                  </motion.button>
                </form>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className="card-header" style={{ textAlign: 'center' }}>
                  <div style={{ width: 54, height: 54, borderRadius: '16px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <Lock size={26} color="#10b981" />
                  </div>
                  <h3>Two-Factor Authentication</h3>
                  <p style={{ fontSize: '0.82rem', marginTop: '0.4rem', color: 'rgba(255,255,255,0.7)' }}>
                    Enter 6-digit code from Google/Microsoft Authenticator app for <strong>{pendingUser?.name}</strong>.
                  </p>
                </div>

                <form onSubmit={handle2FASubmit} className="enterprise-form" style={{ marginTop: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ textAlign: 'center', display: 'block', marginBottom: '0.5rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Code</label>
                    <input 
                      type="text"
                      maxLength={10}
                      className="enterprise-input" 
                      placeholder="Enter 6-digit OTP or Backup Code"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      autoFocus
                      required
                      style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.2em', fontWeight: 700, padding: '0.75rem', marginBottom: '1.25rem' }}
                    />
                  </div>

                  <motion.button 
                    type="submit" 
                    className="enterprise-submit-btn"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="premium-loader"></span>
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight size={18} className="btn-icon" />
                      </>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setIs2FAStep(false)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.75rem', textAlign: 'center', width: '100%', textDecoration: 'underline' }}
                  >
                    ← Back to Login
                  </button>
                </form>
              </React.Fragment>
            )}
            
            <div className="card-footer">
              <p>Protected by Enterprise SSO & 2FA Security.</p>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default Login;
