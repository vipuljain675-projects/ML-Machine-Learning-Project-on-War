'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Shield, Lock, User, Globe, ChevronRight, X } from 'lucide-react';
import './login.css';

const FACTIONS = [
    { id: 'India', name: 'India', role: 'Prime Minister', color: '#f97316', flag: '🇮🇳', desc: 'Rising superpower with strategic depth in the IOR and Himalayan frontiers.' },
    { id: 'USA', name: 'United States', role: 'Commander in Chief', color: '#3b82f6', flag: '🇺🇸', desc: 'Global superpower with unmatched naval projection and stealth strike capabilities.' },
    { id: 'China', name: 'China', role: 'Chairman of the CMC', color: '#ef4444', flag: '🇨🇳', desc: 'Ascendant military power focused on A2/AD and regional hegemony.' },
    { id: 'Russia', name: 'Russia', role: 'President', color: '#8b5cf6', flag: '🇷🇺', desc: 'Nuclear superpower with vast strategic resources and asymmetric capabilities.' },
    { id: 'Pakistan', name: 'Pakistan', role: 'Chief of Army Staff', color: '#22c55e', flag: '🇵🇰', desc: 'Nuclear-armed state with strategic geographical positioning and tactical flexibility.' },
    { id: 'Israel', name: 'Israel', role: 'Prime Minister', color: '#0ea5e9', flag: '🇮🇱', desc: 'Technologically advanced military with elite intelligence and localized air supremacy.' },
];

export default function LoginModal() {
    const { setPlayerCountry, setPlayerName, setShowLoginModal } = useApp();
    const [idInput, setIdInput] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authProgress, setAuthProgress] = useState(0);

    const handleLogin = () => {
        if (!selectedCountry || !idInput.trim()) return;

        setIsAuthenticating(true);
        // Simulate authentication progress
        const interval = setInterval(() => {
            setAuthProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setPlayerCountry(selectedCountry);
                        setPlayerName(idInput.trim());
                        setShowLoginModal(false);
                    }, 500);
                    return 100;
                }
                return prev + 2;
            });
        }, 20);
    };

    return (
        <div className="nexus-overlay">
            {/* Background Layer: High Fidelity Void */}
            <div className="nexus-bg-glow" />

            <AnimatePresence mode="wait">
                {!isAuthenticating ? (
                    <motion.div
                        key="login-form"
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.05, y: -30 }}
                        className="nexus-card"
                    >
                        {/* Header Section */}
                        <div className="nexus-header">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div className="nexus-badge">
                                        <div className="nexus-badge-icon">
                                            <Shield size={18} />
                                        </div>
                                        <span className="nexus-badge-text">Secure Command Nexus</span>
                                    </div>
                                    <h1 className="nexus-title">Identity <span>Verification</span></h1>
                                </div>
                                <button
                                    onClick={() => setShowLoginModal(false)}
                                    className="nexus-close-btn"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="nexus-content">
                            {/* Left: ID Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                <section>
                                    <div className="nexus-section-label">
                                        <User size={14} style={{ opacity: 0.4 }} />
                                        <h3 className="nexus-section-label-text">Credential Entry</h3>
                                    </div>
                                    <div className="nexus-input-wrapper">
                                        <input
                                            type="text"
                                            value={idInput}
                                            onChange={(e) => setIdInput(e.target.value)}
                                            placeholder="Enter Operator ID / Name..."
                                            className="nexus-input"
                                        />
                                        <div className="nexus-input-tag">SECURE_INPUT</div>
                                    </div>
                                    <p style={{ marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.6', fontStyle: 'italic' }}>
                                        Digital signature required for authorizing tactical asset allocation and nuclear deterrence protocols.
                                    </p>
                                </section>

                                <section className="nexus-brief-box">
                                    <h3 className="nexus-brief-title">Security Brief</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                                            <span>1.</span> <span>End-to-end encrypted command link.</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                                            <span>2.</span> <span>Biometric identity validation pending.</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                                            <span>3.</span> <span>Real-time ML feedback active.</span>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Right: Country Selection */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div className="nexus-section-label">
                                    <Globe size={14} style={{ opacity: 0.4 }} />
                                    <h3 className="nexus-section-label-text">Select Sovereign Command</h3>
                                </div>
                                <div className="nexus-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', display: 'grid' }}>
                                    {FACTIONS.map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() => setSelectedCountry(f.id)}
                                            className={`nexus-country-btn ${selectedCountry === f.id ? 'active' : ''}`}
                                            style={selectedCountry === f.id ? { borderColor: f.color, backgroundColor: `${f.color}15` } : {}}
                                        >
                                            <div className="nexus-country-header">
                                                <span className="nexus-flag">{f.flag}</span>
                                                <div>
                                                    <h4 className="nexus-country-name" style={selectedCountry === f.id ? { color: 'white' } : {}}>{f.name}</h4>
                                                    <span className="nexus-country-role">{f.role}</span>
                                                </div>
                                            </div>
                                            <p className="nexus-country-desc">
                                                {f.desc}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer: Action */}
                        <div className="nexus-footer">
                            <div style={{ display: 'flex', gap: '24px', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                                <div style={{ display: 'flex', gap: '8px' }}><span>LATENCY:</span> <span style={{ color: 'rgba(255,255,255,0.4)' }}>12ms</span></div>
                                <div style={{ display: 'flex', gap: '8px' }}><span>NODE:</span> <span style={{ color: 'rgba(255,255,255,0.4)' }}>WARGAME_SECURE_PHOENIX</span></div>
                            </div>
                            <button
                                onClick={handleLogin}
                                disabled={!selectedCountry || !idInput.trim()}
                                className="nexus-btn-primary"
                                style={selectedCountry && idInput.trim() ? { opacity: 1 } : { opacity: 0.2 }}
                            >
                                Start Command Session
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
                        <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>Authenticating</h2>
                        <div className="nexus-status-text">ESTABLISHING ENCRYPTED LINK... {authProgress}%</div>

                        <div className="nexus-progress-bar">
                            <div className="nexus-progress-fill" style={{ width: `${authProgress}%` }} />
                        </div>

                        <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {authProgress > 20 && <div className="nexus-status-text" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>Verified Fingerprint Hash...</div>}
                            {authProgress > 50 && <div className="nexus-status-text" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>Accessing Global Fire Networks...</div>}
                            {authProgress > 80 && <div className="nexus-status-text" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 'bold' }}>Synchronizing Satellite Assets...</div>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
