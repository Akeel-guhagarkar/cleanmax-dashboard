import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Mail, Lock, ArrowRight, Check } from 'lucide-react';
import { useProcure } from '../context/ProcureContext';

const Login = ({ onLogin }) => {
  const { state, dispatch, showToast } = useProcure();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      const user = state.users.find(u => u.email === email && u.password === password);
      
      if (user) {
        dispatch({ type: 'LOGIN', payload: user });
        onLogin(user);
      } else {
        showToast('Invalid email or password', 'error');
      }
    }, 1500);
  };

  // --- Animation Orchestration Variables ---
  // Stage 1: Image Fade & Zoom (0s - 2s)
  // Stage 3: Logo Fade & Slide (delay 2s, duration 1s)
  // Stage 4: Titles Fade & Blur Remove (delay 2.8s)
  // Stage 5: Form Card Reveal (delay 4s)

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
            <img src="/clean logo without background .png" alt="CleanMax Logo" className="enterprise-brand-logo" style={{ maxWidth: '400px', height: 'auto', marginTop: '-120px', marginBottom: '40px' }} />
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
                    placeholder="user@cleanmax.energy"
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
                    type="password" 
                    className="enterprise-input" 
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
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
            
            <div className="card-footer">
              <p>Protected by Enterprise SSO Security.</p>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default Login;
