'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Globe, Crosshair, Zap, ChevronDown, ChevronUp, Play } from 'lucide-react';

// ── Year multiplier (matching WorldMap logic) ─────────────────
function getYearMultiplier(year: number): number {
    if (year >= 2027 && year <= 2030) return 1.0;
    if (year === 2026 || year === 2031) return 0.85;
    if (year === 2025 || year === 2032) return 0.7;
    if (year >= 2033) return 0.5 + (2040 - year) * 0.03;
    return 0.6;
}

function getRiskColor(prob: number): string {
    if (prob >= 60) return '#ef4444';
    if (prob >= 40) return '#f97316';
    if (prob >= 20) return '#eab308';
    return '#22c55e';
}

// ── 5 preset scenarios ────────────────────────────────────────
const PRESET_SCENARIOS = [
    {
        id: 'china_taiwan',
        title: 'China Invades Taiwan',
        desc: 'PLA amphibious assault during the 2027 readiness window. Model tracks 3-year buildup via LSTM.',
        year: 2027,
        risk: 'critical',
        a: 'China', b: 'Taiwan',
        actors: [{ name: 'China', role: 'attacker' }, { name: 'Taiwan', role: 'defender' }, { name: 'USA', role: 'ally' }],
    },
    {
        id: 'iran_israel',
        title: 'Iran-Israel Strike Exchange',
        desc: 'Direct military confrontation. Highest rivalry weight in model (-0.95).',
        year: 2025,
        risk: 'critical',
        a: 'Iran', b: 'Israel',
        actors: [{ name: 'Iran', role: 'attacker' }, { name: 'Israel', role: 'defender' }, { name: 'USA', role: 'ally' }],
    },
    {
        id: 'india_pakistan',
        title: 'India-Pakistan Kashmir War',
        desc: 'LoC escalation. Both nuclear states. Alliance cascade pulls in China.',
        year: 2026,
        risk: 'high',
        a: 'India', b: 'Pakistan',
        actors: [{ name: 'India', role: 'attacker' }, { name: 'Pakistan', role: 'defender' }, { name: 'China', role: 'ally' }],
    },
    {
        id: 'russia_nato',
        title: 'Russia-NATO Confrontation',
        desc: 'Direct confrontation triggers Article 5. GNN cascades across NATO graph.',
        year: 2028,
        risk: 'high',
        a: 'Russia', b: 'USA',
        actors: [{ name: 'Russia', role: 'attacker' }, { name: 'USA', role: 'defender' }, { name: 'UK', role: 'ally' }],
    },
    {
        id: 'china_india',
        title: 'China-India Border War',
        desc: 'LAC conflict. Pakistan opens second front (CPEC alliance weight: 0.85).',
        year: 2027,
        risk: 'medium',
        a: 'China', b: 'India',
        actors: [{ name: 'China', role: 'attacker' }, { name: 'India', role: 'defender' }, { name: 'Pakistan', role: 'ally' }],
    },
];

const ALL_COUNTRIES = [
    'USA', 'Russia', 'China', 'India', 'Iran', 'Israel',
    'UK', 'France', 'Pakistan', 'Saudi Arabia', 'Turkey',
    'Indonesia', 'Afghanistan', 'Taiwan',
];

// ── Helper: get prob from predictions dict ────────────────────
function getProb(predictions: Record<string, number>, a: string, b: string): number {
    return predictions[`${a}-${b}`] || predictions[`${b}-${a}`] || 0;
}

export default function ScenarioSidebar() {
    const {
        activeScenario, loadScenario, runCustomScenario,
        selectedYear, setSelectedYear, predictions, isLoading,
        playerCountry, setPlayerCountry, setShowLoginModal
    } = useApp();

    const yearMultiplier = getYearMultiplier(selectedYear);

    // ── Custom scenario builder state ────────────────────────
    const [customOpen, setCustomOpen] = useState(false);
    const [customA, setCustomA] = useState('China');
    const [customB, setCustomB] = useState('USA');
    const [customYear, setCustomYear] = useState(2027);
    const [customLoading, setCustomLoading] = useState(false);

    const handleCustomRun = async () => {
        if (customA === customB || customLoading) return;
        setCustomLoading(true);
        await runCustomScenario(customA, customB, customYear);
        setCustomLoading(false);
    };

    // ── Dynamic emerging conflicts ───────────────────────────
    // Take all 91 model predictions, year-adjust, sort, surface top 10
    const emergingConflicts = useMemo(() => {
        if (!predictions || Object.keys(predictions).length === 0) return [];
        return Object.entries(predictions)
            .map(([pair, rawProb]) => {
                const [a, b] = pair.split('-');
                const adjustedProb = Math.round(rawProb * yearMultiplier * 10) / 10;
                return { pair, a, b, rawProb, adjustedProb };
            })
            .filter(({ adjustedProb }) => adjustedProb >= 8)   // only meaningful risks
            .sort((x, y) => y.adjustedProb - x.adjustedProb)
            .slice(0, 10);
    }, [predictions, yearMultiplier]);

    // check if a pair matches a preset
    const presetIds = new Set(PRESET_SCENARIOS.map(s => `${s.a}-${s.b}`));
    const getPresetId = (a: string, b: string) => {
        const s = PRESET_SCENARIOS.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a));
        return s?.id || null;
    };

    return (
        <div className="sidebar">
            {/* ── HEADER ── */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Globe size={22} />
                    <h1>WARGAME</h1>
                </div>
                <div className="sidebar-subtitle">Geopolitical Conflict Simulator</div>
                <div className="model-badge">
                    <span className="pulse" />
                    PyTorch GNN+LSTM v3 — Live
                </div>

                {/* Login / Identity Section */}
                <div style={{ marginTop: 16 }}>
                    {playerCountry ? (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: 10,
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Active Command</span>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: '#e6edf3', letterSpacing: 0.5 }}>{playerCountry.toUpperCase()}</div>
                            <button
                                onClick={() => setPlayerCountry(null)}
                                style={{
                                    marginTop: 4,
                                    width: '100%',
                                    padding: '6px 0',
                                    borderRadius: 6,
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    cursor: 'pointer'
                                }}
                            >
                                Terminate Session
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLoginModal(true)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.15), rgba(188, 140, 255, 0.15))',
                                border: '1px solid rgba(88, 166, 255, 0.3)',
                                color: '#58a6ff',
                                fontSize: 12,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(88, 166, 255, 0.25), rgba(188, 140, 255, 0.25))';
                                e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.5)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(88, 166, 255, 0.15), rgba(188, 140, 255, 0.15))';
                                e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.3)';
                            }}
                        >
                            <Shield size={14} />
                            Initialize Command
                        </button>
                    )}
                </div>
            </div>

            {/* ── PRESET SCENARIOS ── */}
            <div className="scenarios-section">
                <div className="section-title">
                    <Crosshair size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Preset Scenarios
                </div>

                {PRESET_SCENARIOS.map((s) => {
                    const rawProb = getProb(predictions, s.a, s.b);
                    const adjProb = rawProb > 0 ? Math.round(rawProb * yearMultiplier * 10) / 10 : 0;
                    const isActive = activeScenario?.scenario?.id === s.id;

                    return (
                        <div
                            key={s.id}
                            className={`scenario-card ${s.risk} ${isActive ? 'active' : ''}`}
                            onClick={() => !isLoading && loadScenario(s.id, s.year)}
                            style={{ opacity: isLoading ? 0.6 : 1 }}
                        >
                            <div className="scenario-card-header">
                                <h3>{s.title}</h3>
                                <span
                                    className={`scenario-prob`}
                                    style={{ color: adjProb > 0 ? getRiskColor(adjProb) : undefined }}
                                >
                                    {adjProb > 0 ? `${adjProb}%` : s.risk.toUpperCase()}
                                </span>
                            </div>
                            <p>{s.desc}</p>
                            <div className="scenario-actors">
                                {s.actors.map((a) => (
                                    <span key={a.name} className={`actor-tag ${a.role}`}>
                                        {a.role === 'attacker' ? '⚔️' : a.role === 'defender' ? '🛡️' : '🤝'} {a.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── EMERGING CONFLICTS (ML-driven, year-aware) ── */}
            <div className="scenarios-section" style={{ marginTop: 4 }}>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>
                        <Zap size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#f97316' }} />
                        ML Conflicts — {selectedYear}
                    </span>
                    <span style={{ fontSize: 9, color: '#484f58', fontWeight: 400 }}>
                        {emergingConflicts.length} active
                    </span>
                </div>

                {emergingConflicts.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#484f58', padding: '8px 0', textAlign: 'center' }}>
                        Waiting for model data...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {emergingConflicts.map(({ pair, a, b, adjustedProb }) => {
                            const presetId = getPresetId(a, b);
                            const isActive = activeScenario?.scenario?.id === presetId ||
                                activeScenario?.scenario?.id === `custom_${a}_${b}` ||
                                activeScenario?.scenario?.id === `custom_${b}_${a}`;
                            const color = getRiskColor(adjustedProb);

                            return (
                                <div
                                    key={pair}
                                    onClick={() => {
                                        if (isLoading) return;
                                        if (presetId) {
                                            loadScenario(presetId, selectedYear);
                                        } else {
                                            runCustomScenario(a, b, selectedYear);
                                        }
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                                        background: isActive ? `${color}14` : 'rgba(22,27,34,0.6)',
                                        border: `1px solid ${isActive ? color : 'rgba(48,54,61,0.5)'}`,
                                        transition: 'all 0.15s',
                                    }}
                                    title={`Click to simulate ${a} vs ${b}`}
                                >
                                    {/* Risk bar */}
                                    <div style={{ width: 3, height: 28, borderRadius: 2, background: color, flexShrink: 0 }} />
                                    {/* Label */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {a} vs {b}
                                        </div>
                                        {/* Progress bar */}
                                        <div style={{ marginTop: 3, height: 3, background: '#21262d', borderRadius: 2 }}>
                                            <div style={{ width: `${Math.min(adjustedProb, 100)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
                                        </div>
                                    </div>
                                    {/* Prob */}
                                    <div style={{ fontSize: 11, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                                        {adjustedProb}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── CUSTOM SCENARIO BUILDER ── */}
            <div className="scenarios-section" style={{ marginTop: 4 }}>
                <div
                    className="section-title"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => setCustomOpen(o => !o)}
                >
                    <span>
                        <Play size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#bc8cff' }} />
                        Custom Scenario Builder
                    </span>
                    {customOpen ? <ChevronUp size={13} style={{ color: '#8b949e' }} /> : <ChevronDown size={13} style={{ color: '#8b949e' }} />}
                </div>

                {customOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0 8px' }}>
                        {/* Country A & B */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            <div>
                                <div style={{ fontSize: 9, color: '#8b949e', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>⚔️ Attacker</div>
                                <select
                                    value={customA}
                                    onChange={e => setCustomA(e.target.value)}
                                    style={{
                                        width: '100%', background: '#161b22', color: '#e6edf3',
                                        border: '1px solid #30363d', borderRadius: 6, padding: '5px 8px',
                                        fontSize: 11, cursor: 'pointer', outline: 'none',
                                    }}
                                >
                                    {ALL_COUNTRIES.map(c => (
                                        <option key={c} value={c} disabled={c === customB}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div style={{ fontSize: 9, color: '#8b949e', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>🛡️ Defender</div>
                                <select
                                    value={customB}
                                    onChange={e => setCustomB(e.target.value)}
                                    style={{
                                        width: '100%', background: '#161b22', color: '#e6edf3',
                                        border: '1px solid #30363d', borderRadius: 6, padding: '5px 8px',
                                        fontSize: 11, cursor: 'pointer', outline: 'none',
                                    }}
                                >
                                    {ALL_COUNTRIES.map(c => (
                                        <option key={c} value={c} disabled={c === customA}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Year */}
                        <div>
                            <div style={{ fontSize: 9, color: '#8b949e', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>📅 Year</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="range" min={2025} max={2040} value={customYear}
                                    onChange={e => setCustomYear(Number(e.target.value))}
                                    className="year-slider"
                                    style={{ flex: 1, margin: 0 }}
                                />
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#58a6ff', fontFamily: "'JetBrains Mono', monospace", minWidth: 36 }}>
                                    {customYear}
                                </span>
                            </div>
                        </div>

                        {/* Live prediction preview */}
                        {customA !== customB && (
                            <div style={{
                                background: '#0d1117', borderRadius: 8, padding: '8px 12px',
                                border: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <span style={{ fontSize: 10, color: '#8b949e' }}>Model P(conflict)</span>
                                <span style={{
                                    fontSize: 14, fontWeight: 800,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: getRiskColor(Math.round(getProb(predictions, customA, customB) * getYearMultiplier(customYear) * 10) / 10),
                                }}>
                                    {Math.round(getProb(predictions, customA, customB) * getYearMultiplier(customYear) * 10) / 10 || '?'}%
                                </span>
                            </div>
                        )}

                        {/* Run button */}
                        <button
                            onClick={handleCustomRun}
                            disabled={customA === customB || customLoading || isLoading}
                            style={{
                                width: '100%', padding: '9px 0', borderRadius: 8, cursor: 'pointer',
                                border: '1px solid rgba(188,140,255,0.4)',
                                background: customLoading ? 'rgba(188,140,255,0.05)' : 'rgba(188,140,255,0.12)',
                                color: customA === customB ? '#484f58' : '#bc8cff',
                                fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                transition: 'all 0.2s',
                            }}
                        >
                            {customLoading ? (
                                <>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #bc8cff', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                                    Running Inference...
                                </>
                            ) : (
                                <>
                                    <Play size={13} />
                                    ▶ Run {customYear} Simulation
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* ── MODEL INFO ── */}
            <div className="scenarios-section" style={{ marginTop: 4 }}>
                <div className="section-title">
                    <Shield size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Model Info
                </div>
                <div className="scenario-card low" style={{ cursor: 'default' }}>
                    <h3 style={{ fontSize: 12 }}>Architecture</h3>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.8, marginTop: 6 }}>
                        Embedding: 14 countries → 16d<br />
                        LSTM: 27→64 hidden (×2 layers)<br />
                        Attention: 64→1 (timestep)<br />
                        GNN: 64→64→32 (2-hop)<br />
                        Predictor: 68→64→32→1
                    </p>
                </div>
            </div>

            {/* ── YEAR SLIDER ── */}
            <div className="year-control">
                <div className="year-display">
                    <span className="year-label">Simulation Year</span>
                    <span className="year-value">{selectedYear}</span>
                </div>
                <input
                    type="range"
                    className="year-slider"
                    min={2025}
                    max={2040}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                />
                <div className="year-range">
                    <span>2025</span>
                    <span style={{ color: selectedYear >= 2027 && selectedYear <= 2030 ? '#f85149' : undefined }}>
                        {selectedYear >= 2027 && selectedYear <= 2030 ? '⚠️ Peak Risk Window' : ''}
                    </span>
                    <span>2040</span>
                </div>
            </div>
        </div>
    );
}
