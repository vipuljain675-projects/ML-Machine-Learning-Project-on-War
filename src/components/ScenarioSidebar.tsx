'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Globe, Crosshair, Zap, ChevronRight, Activity, Target, Plus, MapPin } from 'lucide-react';
import { COUNTRY_FIREPOWER } from '../data/countryFirepower';
import { COUNTRY_BASES } from '../data/countryBases';

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
        activeScenario, loadScenario,
        selectedYear, setSelectedYear, predictions, isLoading,
        playerCountry, setPlayerCountry, setShowLoginModal,
        setShowCommandDashboard, activeConflict, scenarioPhase,
        customBases, setCustomBases,
    } = useApp();

    const [newBaseForm, setNewBaseForm] = useState({
        name: '',
        lat: '28.02',
        lng: '73.05',
        type: 'air' as any,
        assetRows: [{ name: 'Rafale', qty: '20' }],
        men: '1000',
    });

    const yearMultiplier = getYearMultiplier(selectedYear);

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

    const handleAddSidebarBase = () => {
        if (!newBaseForm.name || !newBaseForm.lat || !newBaseForm.lng) {
            alert('Please fill in all base details.');
            return;
        }

        const latNum = parseFloat(newBaseForm.lat);
        const lngNum = parseFloat(newBaseForm.lng);

        if (isNaN(latNum) || isNaN(lngNum)) {
            alert('Coordinates must be valid numbers.');
            return;
        }

        const assetsArray = newBaseForm.assetRows
            .filter(r => r.name && r.qty)
            .map(r => `${r.name} (${r.qty})`);

        const totalJets = newBaseForm.assetRows.reduce((acc, r) => acc + (parseInt(r.qty) || 0), 0);

        const newBase = {
            id: `custom-sidebar-${Date.now()}`,
            name: newBaseForm.name,
            country: playerCountry || 'Unknown',
            shortName: newBaseForm.name.substring(0, 15),
            type: newBaseForm.type,
            coords: [latNum, lngNum] as [number, number],
            operatorFlag: playerCountry === 'India' ? '🇮🇳' : '🏳️',
            personnel: parseInt(newBaseForm.men) || 1000,
            assets: assetsArray,
            role: 'User deployed strategic asset',
            strength: {
                jets: totalJets,
                men: parseInt(newBaseForm.men) || 1000,
                tacticalBrillianceRating: 5,
                readinessPercent: 100,
                notes: 'Manual deployment with detailed assets'
            }
        };

        setCustomBases([...customBases, newBase]);
        setNewBaseForm({
            name: '',
            lat: '28.02',
            lng: '73.05',
            type: 'air',
            assetRows: [{ name: 'Rafale', qty: '20' }],
            men: '1000'
        });
        alert(`Strategic Asset "${newBase.name}" deployed with ${assetsArray.length} asset types.`);
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
                        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 10, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Active Command</span>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: '#e6edf3', letterSpacing: 0.5 }}>{playerCountry.toUpperCase()}</div>
                            {activeConflict && (
                                <div style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 6, fontSize: 10, color: '#ef4444', fontWeight: 700 }}>
                                    ⚔️ {activeConflict.attacker} vs {activeConflict.defender} — {activeConflict.year}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    onClick={() => setShowCommandDashboard(true)}
                                    style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: 'rgba(88,166,255,0.15)', border: '1px solid rgba(88,166,255,0.3)', color: '#58a6ff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                >
                                    <Shield size={11} /> Command Center
                                </button>
                                <button
                                    onClick={() => setPlayerCountry(null)}
                                    style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}
                                >
                                    Exit
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLoginModal(true)}
                            style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.15), rgba(188, 140, 255, 0.15))', border: '1px solid rgba(88, 166, 255, 0.3)', color: '#58a6ff', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                        >
                            <Shield size={14} />
                            Initialize Command
                        </button>
                    )}
                </div>
            </div>

            {/* ── CONDITIONAL CONTENT ── */}
            {playerCountry ? (
                // PLAYER DASHBOARD VIEW
                <div style={{ padding: '0 20px', flex: 1, overflowY: 'auto' }}>
                    <div className="section-title">
                        <Activity size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Strategic Assets Overview
                    </div>

                    {COUNTRY_FIREPOWER[playerCountry] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                            {/* Air Force Summary */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8 }}>Air Superiority</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 24, fontWeight: 900, color: '#58a6ff', fontFamily: 'JetBrains Mono, monospace' }}>{COUNTRY_FIREPOWER[playerCountry].airforce.combatAircraft.toLocaleString()}</span>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Combat Jets</span>
                                </div>
                            </div>

                            {/* Army Summary */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8 }}>Ground Forces</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 24, fontWeight: 900, color: '#f97316', fontFamily: 'JetBrains Mono, monospace' }}>{COUNTRY_FIREPOWER[playerCountry].army.tanks.toLocaleString()}</span>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Main Battle Tanks</span>
                                </div>
                            </div>

                            {/* Navy Summary */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8 }}>Naval Fleet</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 24, fontWeight: 900, color: '#39d2c0', fontFamily: 'JetBrains Mono, monospace' }}>{COUNTRY_FIREPOWER[playerCountry].navy.activePlatforms.toLocaleString()}</span>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Active Ships/Subs</span>
                                </div>
                            </div>

                            {/* Nuclear Summary */}
                            <div style={{ background: 'rgba(248,81,73,0.05)', border: '1px solid rgba(248,81,73,0.15)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#f85149', letterSpacing: 1, marginBottom: 8 }}>Strategic Deterrent</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 24, fontWeight: 900, color: '#f85149', fontFamily: 'JetBrains Mono, monospace' }}>{COUNTRY_FIREPOWER[playerCountry].nuclear.warheads.toLocaleString()}</span>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Warheads</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 24, padding: 16, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8 }}>
                                <h4 style={{ fontSize: 10, textTransform: 'uppercase', color: '#ef4444', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Plus size={12} /> Deploy New Asset
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <input
                                        type="text"
                                        placeholder="Base Name (e.g. Forward HQ)"
                                        value={newBaseForm.name}
                                        onChange={(e) => setNewBaseForm({ ...newBaseForm, name: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 10px', fontSize: 11, color: '#fff', width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="text"
                                            placeholder="Latitude (e.g. 28.6)"
                                            value={newBaseForm.lat}
                                            onChange={(e) => setNewBaseForm({ ...newBaseForm, lat: e.target.value })}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 10px', fontSize: 11, color: '#fff', flex: 1 }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Longitude (e.g. 77.2)"
                                            value={newBaseForm.lng}
                                            onChange={(e) => setNewBaseForm({ ...newBaseForm, lng: e.target.value })}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 10px', fontSize: 11, color: '#fff', flex: 1 }}
                                        />
                                    </div>
                                    <select
                                        value={newBaseForm.type}
                                        onChange={(e) => setNewBaseForm({ ...newBaseForm, type: e.target.value as any })}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 10px', fontSize: 11, color: '#fff', width: '100%', cursor: 'pointer' }}
                                    >
                                        <option value="air">Air Base</option>
                                        <option value="naval">Naval Base</option>
                                        <option value="army">Military / Army Base</option>
                                        <option value="missile">Missile Site</option>
                                    </select>

                                    {/* Asset Rows */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 2 }}>Base Assets (Fighters/Ships/etc)</div>
                                        {newBaseForm.assetRows.map((row, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: 4 }}>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Rafale"
                                                    value={row.name}
                                                    onChange={(e) => {
                                                        const newRows = [...newBaseForm.assetRows];
                                                        newRows[idx].name = e.target.value;
                                                        setNewBaseForm({ ...newBaseForm, assetRows: newRows });
                                                    }}
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '4px 8px', fontSize: 10, color: '#fff', flex: 2 }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={row.qty}
                                                    onChange={(e) => {
                                                        const newRows = [...newBaseForm.assetRows];
                                                        newRows[idx].qty = e.target.value;
                                                        setNewBaseForm({ ...newBaseForm, assetRows: newRows });
                                                    }}
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '4px 8px', fontSize: 10, color: '#fff', flex: 1 }}
                                                />
                                                {newBaseForm.assetRows.length > 1 && (
                                                    <button
                                                        onClick={() => {
                                                            const newRows = newBaseForm.assetRows.filter((_, i) => i !== idx);
                                                            setNewBaseForm({ ...newBaseForm, assetRows: newRows });
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 12 }}
                                                    >×</button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setNewBaseForm({ ...newBaseForm, assetRows: [...newBaseForm.assetRows, { name: '', qty: '' }] })}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 4, padding: '4px', fontSize: 9, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', textAlign: 'center' }}
                                        >
                                            + Add Asset Type
                                        </button>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase' }}>Total Personnel</div>
                                        <input
                                            type="number"
                                            placeholder="Men"
                                            value={newBaseForm.men}
                                            onChange={(e) => setNewBaseForm({ ...newBaseForm, men: e.target.value })}
                                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 10px', fontSize: 11, color: '#fff', width: '100%' }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddSidebarBase}
                                        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, transition: 'opacity 0.2s' }}
                                    >
                                        <MapPin size={12} /> Deploy Strategic Asset
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginTop: 24, padding: 16, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8 }}>
                                <h4 style={{ fontSize: 10, textTransform: 'uppercase', color: '#ef4444', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Target size={12} /> Tactical Guide
                                </h4>
                                <ul style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <li><strong>Above Form</strong>: Enter exact lat/lng to deploy command centers.</li>
                                    <li><strong>Right-click Map</strong> to establish new bases quickly.</li>
                                    <li><strong>Click</strong> your bases to initiate strikes.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // OBSERVER VIEW: SCENARIOS & ML CONFLICTS
                <>
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
                                                    loadScenario(`custom_${a}_${b}`, selectedYear);
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
                                            <div style={{ fontSize: 13, fontWeight: 800, color: color, width: 45, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                                                {adjustedProb}%
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
