'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Shield, Lock, User, Globe, ChevronRight, X, Eye, EyeOff } from 'lucide-react';
import { COUNTRY_PASSWORDS } from '../data/countryBases';
import './login.css';

const FACTIONS = [
    { id: 'India', name: 'India', role: 'Prime Minister', color: '#f97316', flag: '🇮🇳', desc: 'Rising superpower. 1.46M troops, BrahMos supersonic cruise, S-400 air shield, nuclear triad.' },
    { id: 'USA', name: 'United States', role: 'Commander in Chief', color: '#3b82f6', flag: '🇺🇸', desc: 'Global superpower. 11 carrier strike groups, F-22/B-2 stealth, Tomahawk reach.' },
    { id: 'China', name: 'China', role: 'Chairman of the CMC', color: '#ef4444', flag: '🇨🇳', desc: 'Ascendant power. J-20 stealth, DF-17 hypersonic, 3 carriers. A2/AD dominance.' },
    { id: 'Russia', name: 'Russia', role: 'President', color: '#8b5cf6', flag: '🇷🇺', desc: 'Nuclear superpower. Kinzhal hypersonic, Iskander M, Poseidon torpedo, Arctic fleet.' },
    { id: 'Pakistan', name: 'Pakistan', role: 'Chief of Army Staff', color: '#22c55e', flag: '🇵🇰', desc: 'Nuclear-armed. 170 warheads, J-10CE, lowest nuclear threshold in world.' },
    { id: 'Israel', name: 'Israel', role: 'Prime Minister', color: '#0ea5e9', flag: '🇮🇱', desc: 'Elite force. F-35I Adir, Arrow-3 defense, Mossad intel ops, undeclared nukes.' },
    { id: 'Iran', name: 'Iran', role: 'Supreme Leader', color: '#dc2626', flag: '🇮🇷', desc: 'Missile superpower. 3,000+ ballistic/cruise missiles, Shahed drone swarms, Hormuz leverage.' },
    { id: 'UK', name: 'United Kingdom', role: 'Prime Minister', color: '#6366f1', flag: '🇬🇧', desc: 'HMS Queen Elizabeth CSG, F-35B, Trident SSBN nuclear deterrent, GCHQ intel.' },
];

export default function LoginModal() {
    const { setPlayerCountry, setPlayerName, setShowLoginModal, setShowCommandDashboard, sendChatMessage } = useApp();
    const [idInput, setIdInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authProgress, setAuthProgress] = useState(0);
    const [error, setError] = useState('');

    const handleLogin = () => {
        if (!selectedCountry || !idInput.trim()) {
            setError('Operator ID and country selection required.');
            return;
        }
        // Password check — use hardcoded password OR allow any non-empty password for demo
        const correctPassword = COUNTRY_PASSWORDS[selectedCountry];
        if (passwordInput !== correctPassword && passwordInput.length < 3) {
            setError(`Access denied. Password must be at least 3 characters. (Hint: ${correctPassword})`);
            return;
        }
        setError('');
        setIsAuthenticating(true);
        const interval = setInterval(() => {
            setAuthProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setPlayerCountry(selectedCountry);
                        setPlayerName(idInput.trim());
                        setShowLoginModal(false);
                        setShowCommandDashboard(true);
                        // Initial strategic briefing for the commander with intel reveal
                        sendChatMessage(`As the head of ${selectedCountry}, provide a concise strategic onboarding briefing:
- Immediate threats and priorities
- Key bases and force disposition
- Recommended first steps
[REVEAL_INTEL:${selectedCountry}]`);
                    }, 500);
                    return 100;
                }
                return prev + 2;
            });
        }, 20);
    };

    return (
        <div className="nexus-overlay">
            <div className="nexus-bg-glow" />
            <AnimatePresence mode="wait">
                {!isAuthenticating ? (
                    <motion.div
                        key="login-form"
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.05, y: -30 }}
                        className="nexus-card"
                        style={{ maxWidth: 820, width: '95vw' }}
                    >
                        {/* Header */}
                        <div className="nexus-header">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div className="nexus-badge">
                                        <div className="nexus-badge-icon"><Shield size={18} /></div>
                                        <span className="nexus-badge-text">Secure Command Nexus — EYES ONLY</span>
                                    </div>
                                    <h1 className="nexus-title">Identity <span>Verification</span></h1>
                                </div>
                                <button onClick={() => setShowLoginModal(false)} className="nexus-close-btn"><X size={18} /></button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="nexus-content" style={{ flexDirection: 'column', gap: 0 }}>
                            {/* Credentials Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
                                {/* Operator ID */}
                                <section>
                                    <div className="nexus-section-label">
                                        <User size={14} style={{ opacity: 0.4 }} />
                                        <h3 className="nexus-section-label-text">Operator ID</h3>
                                    </div>
                                    <div className="nexus-input-wrapper">
                                        <input
                                            type="text"
                                            value={idInput}
                                            onChange={e => { setIdInput(e.target.value); setError(''); }}
                                            placeholder="Enter Operator Name / ID..."
                                            className="nexus-input"
                                        />
                                        <div className="nexus-input-tag">OPERATOR_ID</div>
                                    </div>
                                </section>
                                {/* Password */}
                                <section>
                                    <div className="nexus-section-label">
                                        <Lock size={14} style={{ opacity: 0.4 }} />
                                        <h3 className="nexus-section-label-text">Command Password</h3>
                                    </div>
                                    <div className="nexus-input-wrapper" style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={passwordInput}
                                            onChange={e => { setPasswordInput(e.target.value); setError(''); }}
                                            placeholder="Enter command password..."
                                            className="nexus-input"
                                            style={{ paddingRight: 40 }}
                                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                        />
                                        <button
                                            onClick={() => setShowPassword(v => !v)}
                                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                        >
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </section>
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: '8px 14px', fontSize: 11, color: '#f85149', marginBottom: 20 }}>
                                    ⛔ {error}
                                </div>
                            )}

                            {/* Country Grid */}
                            <div>
                                <div className="nexus-section-label" style={{ marginBottom: 12 }}>
                                    <Globe size={14} style={{ opacity: 0.4 }} />
                                    <h3 className="nexus-section-label-text">Select Sovereign Command</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                                    {FACTIONS.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => { setSelectedCountry(f.id); setError(''); }}
                                            className={`nexus-country-btn ${selectedCountry === f.id ? 'active' : ''}`}
                                            style={selectedCountry === f.id ? { borderColor: f.color, backgroundColor: `${f.color}15` } : {}}
                                        >
                                            <div className="nexus-country-header">
                                                <span className="nexus-flag" style={{ fontSize: 22 }}>{f.flag}</span>
                                                <div>
                                                    <h4 className="nexus-country-name" style={selectedCountry === f.id ? { color: 'white' } : {}}>{f.name}</h4>
                                                    <span className="nexus-country-role">{f.role}</span>
                                                </div>
                                            </div>
                                            <p className="nexus-country-desc" style={{ fontSize: 9, marginTop: 6 }}>{f.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="nexus-footer">
                            <div style={{ display: 'flex', gap: 24, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                                <div style={{ display: 'flex', gap: 8 }}><span>LATENCY:</span> <span style={{ color: 'rgba(255,255,255,0.4)' }}>12ms</span></div>
                                <div style={{ display: 'flex', gap: 8 }}><span>NODE:</span> <span style={{ color: 'rgba(255,255,255,0.4)' }}>WARGAME_SECURE_PHOENIX</span></div>
                                <div style={{ display: 'flex', gap: 8 }}><span>ENCRYPTION:</span> <span style={{ color: '#22c55e' }}>AES-256 ACTIVE</span></div>
                            </div>
                            <button
                                onClick={handleLogin}
                                disabled={!selectedCountry || !idInput.trim()}
                                className="nexus-btn-primary"
                                style={selectedCountry && idInput.trim() ? { opacity: 1 } : { opacity: 0.2 }}
                            >
                                Authenticate & Enter Command
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="auth-screen"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="nexus-auth-screen"
                    >
                        <div className="nexus-spinner" />
                        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>Authenticating</h2>
                        <div className="nexus-status-text">ESTABLISHING ENCRYPTED LINK... {authProgress}%</div>
                        <div className="nexus-progress-bar">
                            <div className="nexus-progress-fill" style={{ width: `${authProgress}%` }} />
                        </div>
                        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {authProgress > 20 && <div className="nexus-status-text" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>✓ Operator credentials verified...</div>}
                            {authProgress > 45 && <div className="nexus-status-text" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>✓ Loading national military assets database...</div>}
                            {authProgress > 65 && <div className="nexus-status-text" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>✓ Initializing fog-of-war protocols...</div>}
                            {authProgress > 80 && <div className="nexus-status-text" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 'bold' }}>✓ Synchronizing satellite assets + base telemetry...</div>}
                            {authProgress > 93 && <div className="nexus-status-text" style={{ color: '#22c55e', fontSize: 9, fontWeight: 'bold' }}>✓ Command session active. Welcome, {idInput}.</div>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
