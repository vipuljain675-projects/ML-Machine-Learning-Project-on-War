'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, OpponentAction } from '../context/AppContext';
import { AlertTriangle, X, Zap, Shield, Radio } from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
};

const TYPE_ICONS: Record<string, string> = {
    strike: '💥',
    alliance: '🤝',
    nuclear: '☢️',
    diplomatic: '🔴',
    economic: '💱',
    mobilize: '⚔️',
};

function NotificationCard({ action, onDismiss }: { action: OpponentAction; onDismiss: () => void }) {
    const color = SEVERITY_COLORS[action.severity] || '#8b949e';
    useEffect(() => {
        const t = setTimeout(onDismiss, action.type === 'nuclear' ? 15000 : 8000);
        return () => clearTimeout(t);
    }, [action.type, onDismiss]);

    return (
        <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            style={{
                background: 'rgba(8, 11, 18, 0.97)',
                border: `1px solid ${color}50`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 10,
                padding: '12px 16px',
                boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${color}15`,
                display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: 340,
            }}
        >
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{TYPE_ICONS[action.type] || '⚠️'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color }}>
                        {action.type.toUpperCase()} — {action.country}
                    </span>
                    <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                        <X size={12} />
                    </button>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{action.message}</p>
                {action.targetBase && (
                    <div style={{ marginTop: 6, fontSize: 9, color: color, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                        TARGET: {action.targetBase}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function OpponentNotifications() {
    const { opponentActions, clearOpponentActions, nuclearAlertLevel, scenarioPhase, activeConflict } = useApp();
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const visible = opponentActions.filter(a => !dismissed.has(a.id)).slice(0, 4);

    const dismiss = (id: string) => setDismissed(prev => new Set([...prev, id]));

    return (
        <>
            {/* Nuclear Alert Banner */}
            <AnimatePresence>
                {nuclearAlertLevel >= 3 && (
                    <motion.div
                        initial={{ y: -80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -80, opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 5000,
                            background: nuclearAlertLevel >= 5 ? '#ef4444' : 'rgba(239,68,68,0.9)',
                            padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                            backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(239,68,68,0.5)',
                        }}
                    >
                        <span style={{ fontSize: 18 }}>☢️</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                            NUCLEAR ALERT — DEFCON {6 - nuclearAlertLevel} — {
                                nuclearAlertLevel >= 5 ? 'LAUNCH IMMINENT' :
                                    nuclearAlertLevel === 4 ? 'WEAPONS ARMED' :
                                        'FORCES ON ALERT'
                            }
                        </span>
                        <span style={{ fontSize: 18 }}>☢️</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scenario Phase Banner */}
            <AnimatePresence>
                {activeConflict && scenarioPhase !== 'inactive' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
                            zIndex: 4500, background: 'rgba(8,11,18,0.95)', backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '6px 16px',
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}
                    >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse 1s infinite' }} />
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#ef4444' }}>
                            ACTIVE CONFLICT — {activeConflict.attacker} ⚔️ {activeConflict.defender} — {activeConflict.year}
                        </span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{scenarioPhase}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Notifications */}
            <div style={{
                position: 'fixed', right: 16, top: 80, zIndex: 4000,
                display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'auto'
            }}>
                <AnimatePresence>
                    {visible.map(action => (
                        <NotificationCard
                            key={action.id}
                            action={action}
                            onDismiss={() => dismiss(action.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </>
    );
}
