'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import { useApp } from '../context/AppContext';
import L from 'leaflet';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const COUNTRY_COORDS: Record<string, [number, number]> = {
    'USA': [39.83, -98.58], 'Russia': [61.52, 105.32],
    'China': [35.86, 104.20], 'India': [20.59, 78.96],
    'Iran': [32.43, 53.69], 'Israel': [31.05, 34.85],
    'UK': [55.38, -3.44], 'France': [46.60, 1.89],
    'Pakistan': [30.38, 69.35], 'Saudi Arabia': [23.89, 45.08],
    'Turkey': [38.96, 35.24], 'Indonesia': [-0.79, 113.92],
    'Afghanistan': [33.94, 67.71], 'Taiwan': [23.70, 120.96],
};

// ============================================================
// SCENARIO MILITARY MOVEMENTS — realistic Pacific routing
// ============================================================
interface MilitaryMovement {
    positions: [number, number][]; // multi-point path (not just from→to)
    color: string;
    label: string;
    type: 'attack' | 'reinforce' | 'naval' | 'air' | 'missile' | 'blockade';
    thickness: number;
}

interface ConflictPoint {
    coords: [number, number];
    label: string;
    intensity: 'high' | 'medium' | 'low';
}

interface ScenarioOverlay {
    movements: MilitaryMovement[];
    conflictPoints: ConflictPoint[];
    focusCenter: [number, number];
    focusZoom: number;
}

// Year-dependent risk multiplier (model LSTM output shows higher risk 2027-2030)
function getYearMultiplier(year: number): number {
    if (year >= 2027 && year <= 2030) return 1.0;
    if (year === 2026 || year === 2031) return 0.85;
    if (year === 2025 || year === 2032) return 0.7;
    if (year >= 2033) return 0.5 + (2040 - year) * 0.03;
    return 0.6;
}

const SCENARIO_OVERLAYS: Record<string, ScenarioOverlay> = {
    china_taiwan: {
        focusCenter: [26, 118],
        focusZoom: 5,
        movements: [
            // === PLA INVASION ===
            { positions: [[26.07, 119.3], [24.8, 120.5], [24.2, 121.0]], color: '#ef4444', label: 'PLA Amphibious Assault (Main)', type: 'attack', thickness: 5 },
            { positions: [[26.5, 119.5], [25.5, 121.2]], color: '#ef4444', label: 'PLA Northern Landing', type: 'attack', thickness: 4 },
            { positions: [[24.5, 118.1], [23.2, 120.2]], color: '#ef4444', label: 'PLA Southern Flank', type: 'attack', thickness: 4 },
            { positions: [[30.0, 122.1], [27.0, 123.0], [25.0, 122.5]], color: '#dc2626', label: 'East Sea Fleet Blockade', type: 'blockade', thickness: 3 },
            { positions: [[18.25, 109.5], [20.5, 115.0], [22.0, 119.0]], color: '#dc2626', label: 'South Sea Fleet', type: 'naval', thickness: 3 },
            { positions: [[34.26, 108.94], [28.0, 115.0], [23.7, 121.0]], color: '#ff6b6b', label: 'DF-15/DF-21 Ballistic Missiles', type: 'missile', thickness: 2 },
            // === US REINFORCEMENT (correct Pacific routing) ===
            { positions: [[35.28, 139.67], [30.0, 133.0], [26.0, 126.0]], color: '#3b82f6', label: 'US 7th Fleet — Carrier Strike Group 5', type: 'naval', thickness: 5 },
            { positions: [[13.58, 144.93], [18.0, 135.0], [23.0, 127.0]], color: '#60a5fa', label: 'B-2/B-52 Bombers from Guam', type: 'air', thickness: 3 },
            // === UK via Suez/Indian Ocean ===
            { positions: [[50.8, -1.1], [36.0, 15.0], [30.0, 32.5], [13.0, 43.0], [8.0, 75.0], [5.0, 100.0], [15.0, 115.0], [22.0, 125.0]], color: '#1d4ed8', label: 'HMS Queen Elizabeth CSG (via Suez)', type: 'naval', thickness: 2 },
            // === India Quad ===
            { positions: [[17.69, 83.22], [10.0, 92.0], [5.0, 100.0]], color: '#22c55e', label: 'Indian Navy — Malacca Strait Watch', type: 'naval', thickness: 2 },
        ],
        conflictPoints: [
            { coords: [24.2, 121.0], label: '⚔️ Beach Landing Alpha', intensity: 'high' },
            { coords: [25.5, 121.2], label: '⚔️ Beach Landing Bravo', intensity: 'high' },
            { coords: [23.2, 120.2], label: '⚔️ Tainan Assault', intensity: 'medium' },
            { coords: [25.0, 123.0], label: '💥 Naval Engagement Zone', intensity: 'high' },
            { coords: [26.0, 126.0], label: '🛡️ US Carrier Battle Group', intensity: 'medium' },
        ],
    },
    iran_israel: {
        focusCenter: [32, 44],
        focusZoom: 5,
        movements: [
            { positions: [[32.43, 53.69], [33.0, 46.0], [32.0, 38.0], [31.05, 34.85]], color: '#ef4444', label: 'Shahab-3 / Emad Ballistic Missiles', type: 'missile', thickness: 4 },
            { positions: [[33.3, 44.4], [32.5, 40.0], [31.5, 35.5]], color: '#ef4444', label: 'Iraq-based Proxy Strikes', type: 'attack', thickness: 3 },
            { positions: [[33.9, 35.5], [33.2, 35.3], [32.5, 35.0]], color: '#f97316', label: 'Hezbollah Rocket Barrage', type: 'missile', thickness: 3 },
            { positions: [[31.05, 34.85], [33.0, 42.0], [32.43, 53.69]], color: '#eab308', label: 'IAF F-35 Retaliatory Strike', type: 'air', thickness: 4 },
            { positions: [[31.05, 34.85], [32.5, 35.0], [33.5, 35.5]], color: '#eab308', label: 'IDF Ground Op — Lebanon', type: 'attack', thickness: 3 },
            { positions: [[26.23, 50.55], [28.0, 44.0], [30.0, 38.0]], color: '#3b82f6', label: 'US 5th Fleet — Persian Gulf', type: 'naval', thickness: 3 },
            { positions: [[49.44, 7.60], [42.0, 20.0], [37.0, 35.0]], color: '#60a5fa', label: 'USAF Tanker/AWACS from Ramstein', type: 'air', thickness: 2 },
            { positions: [[23.89, 45.08], [26.0, 47.0], [28.0, 49.0]], color: '#f59e0b', label: 'Saudi Patriot Air Defense Alert', type: 'air', thickness: 2 },
        ],
        conflictPoints: [
            { coords: [31.05, 34.85], label: '🛡️ Iron Dome Active', intensity: 'high' },
            { coords: [33.9, 35.5], label: '⚔️ Lebanon Front', intensity: 'high' },
            { coords: [32.43, 53.69], label: '🚀 Iran Launch Sites', intensity: 'medium' },
            { coords: [28.0, 44.0], label: '🚢 US 5th Fleet Patrol', intensity: 'medium' },
        ],
    },
    india_pakistan: {
        focusCenter: [31, 73],
        focusZoom: 5,
        movements: [
            { positions: [[32.7, 74.86], [33.2, 74.2], [33.8, 73.5]], color: '#22c55e', label: 'Indian Army — LoC Offensive', type: 'attack', thickness: 5 },
            { positions: [[26.9, 70.9], [27.2, 69.5], [27.5, 68.0]], color: '#22c55e', label: 'Rajasthan Desert Corps', type: 'attack', thickness: 3 },
            { positions: [[28.6, 77.2], [30.0, 74.0], [31.0, 71.5]], color: '#86efac', label: 'IAF Rafale/Su-30 Strikes', type: 'air', thickness: 3 },
            { positions: [[30.38, 69.35], [31.5, 71.5], [32.5, 73.0]], color: '#f97316', label: 'Pakistan Army Counter-Offensive', type: 'attack', thickness: 3 },
            { positions: [[35.86, 104.2], [35.5, 90.0], [34.5, 80.0], [34.16, 77.58]], color: '#ef4444', label: 'PLA — Aksai Chin 2nd Front', type: 'attack', thickness: 4 },
            { positions: [[17.69, 83.22], [15.0, 75.0], [12.0, 70.0]], color: '#3b82f6', label: 'Indian Navy — Arabian Sea Block', type: 'naval', thickness: 2 },
        ],
        conflictPoints: [
            { coords: [33.8, 73.5], label: '⚔️ Kashmir LoC', intensity: 'high' },
            { coords: [34.16, 77.58], label: '⚔️ Ladakh — PLA Front', intensity: 'high' },
            { coords: [27.5, 68.0], label: '⚔️ Sindh Desert Front', intensity: 'medium' },
        ],
    },
    russia_nato: {
        focusCenter: [55, 25],
        focusZoom: 4,
        movements: [
            { positions: [[54.71, 20.51], [54.3, 19.5], [54.0, 18.5]], color: '#ef4444', label: 'Kaliningrad — Suwalki Gap Offensive', type: 'attack', thickness: 5 },
            { positions: [[59.95, 30.32], [59.5, 27.0], [59.0, 24.5]], color: '#ef4444', label: 'Russia — Baltic Push', type: 'attack', thickness: 4 },
            { positions: [[69.07, 33.42], [70.0, 28.0], [70.5, 20.0]], color: '#dc2626', label: 'Northern Fleet — Arctic', type: 'naval', thickness: 3 },
            { positions: [[55.38, -3.44], [56.5, 2.0], [57.5, 8.0]], color: '#3b82f6', label: 'Royal Navy — North Sea Deploy', type: 'naval', thickness: 3 },
            { positions: [[49.44, 7.60], [51.0, 10.0], [52.5, 13.0]], color: '#60a5fa', label: 'USAF Ramstein — Forward Deploy', type: 'air', thickness: 3 },
            { positions: [[46.60, 1.89], [48.5, 6.0], [50.5, 10.0]], color: '#06b6d4', label: 'French Rafale Squadron', type: 'air', thickness: 2 },
            { positions: [[39.83, -98.58], [42.0, -60.0], [48.0, -20.0], [52.0, -5.0]], color: '#3b82f6', label: 'US Atlantic Reinforcement Convoy', type: 'naval', thickness: 4 },
        ],
        conflictPoints: [
            { coords: [54.0, 19.0], label: '⚔️ Suwalki Gap', intensity: 'high' },
            { coords: [59.0, 24.5], label: '⚔️ Baltic Front', intensity: 'high' },
            { coords: [70.5, 20.0], label: '⚔️ Arctic Theater', intensity: 'medium' },
        ],
    },
    china_india: {
        focusCenter: [30, 82],
        focusZoom: 5,
        movements: [
            { positions: [[35.86, 104.2], [35.0, 90.0], [34.5, 80.0], [34.16, 77.58]], color: '#ef4444', label: 'PLA Western Theater — LAC Push', type: 'attack', thickness: 5 },
            { positions: [[29.6, 91.1], [28.5, 89.5], [27.5, 88.3]], color: '#ef4444', label: 'PLA — Arunachal Pradesh Push', type: 'attack', thickness: 4 },
            { positions: [[30.38, 69.35], [31.5, 72.0], [32.7, 74.86]], color: '#f97316', label: 'Pakistan — LoC 2nd Front', type: 'attack', thickness: 4 },
            { positions: [[34.16, 77.58], [34.3, 78.0], [34.5, 78.5]], color: '#22c55e', label: 'Indian Northern Command Defense', type: 'attack', thickness: 4 },
            { positions: [[28.6, 77.2], [30.5, 78.5], [32.0, 79.5]], color: '#86efac', label: 'IAF Air Superiority Patrols', type: 'air', thickness: 3 },
            { positions: [[35.28, 139.67], [28.0, 125.0], [18.0, 105.0], [12.0, 90.0]], color: '#3b82f6', label: 'US 7th Fleet — Bay of Bengal', type: 'naval', thickness: 3 },
        ],
        conflictPoints: [
            { coords: [34.4, 78.0], label: '⚔️ Galwan Valley', intensity: 'high' },
            { coords: [27.5, 88.3], label: '⚔️ Arunachal Front', intensity: 'high' },
            { coords: [32.7, 74.86], label: '⚔️ Pakistan 2nd Front', intensity: 'high' },
        ],
    },
};

function getRiskColor(risk: number): string {
    if (risk >= 60) return '#ef4444';
    if (risk >= 40) return '#f97316';
    if (risk >= 20) return '#eab308';
    return '#22c55e';
}

function getMovementDash(type: string): string | undefined {
    switch (type) {
        case 'attack': return undefined;
        case 'missile': return '4 8';
        case 'air': return '8 6';
        case 'reinforce': return '12 6';
        case 'naval': return '10 5';
        case 'blockade': return '3 6 12 6';
        default: return undefined;
    }
}

function getTypeIcon(type: string): string {
    switch (type) {
        case 'missile': return '🚀';
        case 'naval': return '🚢';
        case 'air': return '✈️';
        case 'blockade': return '⛔';
        default: return '⚔️';
    }
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, { duration: 1.5 });
    }, [center, zoom, map]);
    return null;
}

// ============================================================
// MAIN WORLD MAP COMPONENT
// ============================================================
export default function WorldMap() {
    const { countries, edges, activeScenario, risks, selectedYear } = useApp();
    const [showAlliances, setShowAlliances] = useState(true);
    const [showFacts, setShowFacts] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(true);

    const yearIdx = Math.min(Math.max(selectedYear - 2025, 0), 15);
    const yearMultiplier = getYearMultiplier(selectedYear);

    const scenarioId = activeScenario?.scenario?.id || null;
    const overlay = scenarioId ? SCENARIO_OVERLAYS[scenarioId] : null;

    const mapCenter: [number, number] = useMemo(() => {
        if (overlay) return overlay.focusCenter;
        return [25, 60];
    }, [overlay]);
    const mapZoom = overlay ? overlay.focusZoom : 3;

    // Year-adjusted cascade data
    const adjustedCascade = useMemo(() => {
        if (!activeScenario?.cascade) return {};
        const result: Record<string, number> = {};
        for (const [country, risk] of Object.entries(activeScenario.cascade)) {
            result[country] = Math.round((risk as number) * yearMultiplier * 10) / 10;
        }
        return result;
    }, [activeScenario?.cascade, yearMultiplier]);

    const adjustedProb = activeScenario
        ? Math.round(activeScenario.scenario.conflict_probability * yearMultiplier * 10) / 10
        : 0;

    return (
        <div className="map-container">
            <MapContainer
                center={[25, 60]}
                zoom={3}
                style={{ width: '100%', height: '100vh' }}
                zoomControl={false}
                attributionControl={false}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                dragging={true}
                minZoom={2}
                maxZoom={12}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CARTO'
                />
                <ZoomControl position="bottomright" />
                <MapUpdater center={mapCenter} zoom={mapZoom} />

                {/* Alliance / Rivalry edges */}
                {showAlliances && edges.map((edge, i) => {
                    const from = COUNTRY_COORDS[edge.source];
                    const to = COUNTRY_COORDS[edge.target];
                    if (!from || !to) return null;
                    return (
                        <Polyline
                            key={`edge-${i}`}
                            positions={[from, to]}
                            pathOptions={{
                                color: edge.is_alliance ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.08)',
                                weight: Math.abs(edge.weight) * 1.5,
                                dashArray: edge.is_alliance ? undefined : '6 4',
                            }}
                        />
                    );
                })}

                {/* === SCENARIO: Military Movement Arrows === */}
                {overlay?.movements.map((mov, i) => {
                    const opacity = yearMultiplier;
                    return (
                        <React.Fragment key={`mov-${i}`}>
                            <Polyline
                                positions={mov.positions}
                                pathOptions={{
                                    color: mov.color,
                                    weight: mov.thickness * yearMultiplier,
                                    opacity: opacity * 0.85,
                                    dashArray: getMovementDash(mov.type),
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                }}
                            >
                                <Tooltip sticky>
                                    <span style={{ fontSize: 11, fontWeight: 600 }}>
                                        {getTypeIcon(mov.type)} {mov.label}
                                    </span>
                                </Tooltip>
                            </Polyline>
                            {/* Arrow endpoint */}
                            <CircleMarker
                                center={mov.positions[mov.positions.length - 1]}
                                radius={mov.type === 'attack' ? 5 : 4}
                                pathOptions={{ color: mov.color, fillColor: mov.color, fillOpacity: 0.85 * opacity, weight: 2 }}
                            />
                        </React.Fragment>
                    );
                })}

                {/* === SCENARIO: Conflict Points === */}
                {overlay?.conflictPoints.map((cp, i) => {
                    const cpColor = cp.intensity === 'high' ? '#ef4444' : cp.intensity === 'medium' ? '#f97316' : '#eab308';
                    const size = cp.intensity === 'high' ? 8 : 6;
                    return (
                        <React.Fragment key={`cp-${i}`}>
                            <CircleMarker center={cp.coords} radius={size + 5}
                                pathOptions={{ color: cpColor, fillColor: cpColor, fillOpacity: 0.12, weight: 1, opacity: 0.3 }}
                            />
                            <CircleMarker center={cp.coords} radius={size}
                                pathOptions={{ color: '#fff', fillColor: cpColor, fillOpacity: 0.9, weight: 2 }}
                            >
                                <Tooltip permanent direction="right" offset={[10, 0]}>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.75)', padding: '2px 5px', borderRadius: 3 }}>
                                        {cp.label}
                                    </span>
                                </Tooltip>
                            </CircleMarker>
                        </React.Fragment>
                    );
                })}

                {/* === COUNTRY MARKERS + HEATMAP RINGS === */}
                {countries.map((country) => {
                    const coords = COUNTRY_COORDS[country.name];
                    if (!coords) return null;

                    const countryRisks = risks[country.name];
                    const currentRisk = countryRisks ? countryRisks[yearIdx] : country.risk_2025;
                    const riskColor = getRiskColor(currentRisk);
                    const cascadeRisk = adjustedCascade[country.name];

                    // Heatmap ring: radius scales with risk (12–40px), opacity scales with risk
                    const ringRadius = 12 + (currentRisk / 100) * 28;
                    const ringOpacity = 0.08 + (currentRisk / 100) * 0.20;

                    let role: string | null = null;
                    if (activeScenario) {
                        const sc = activeScenario.scenario;
                        if (country.name === sc.primary.country_a) role = 'ATTACKER';
                        else if (country.name === sc.primary.country_b) role = 'DEFENDER';
                        else if (cascadeRisk && cascadeRisk > 25) role = 'INVOLVED';
                    }

                    let markerRadius = 7;
                    if (role === 'ATTACKER') markerRadius = 13;
                    else if (role === 'DEFENDER') markerRadius = 12;
                    else if (role === 'INVOLVED') markerRadius = 9;

                    const borderColor = role === 'ATTACKER' ? '#ef4444'
                        : role === 'DEFENDER' ? '#3b82f6'
                            : role === 'INVOLVED' ? '#f97316'
                                : riskColor;

                    return (
                        <React.Fragment key={country.name}>
                            {/* Heatmap pulsing ring */}
                            {showHeatmap && (
                                <CircleMarker
                                    center={coords}
                                    radius={ringRadius}
                                    pathOptions={{
                                        color: riskColor,
                                        fillColor: riskColor,
                                        fillOpacity: ringOpacity,
                                        weight: 1,
                                        opacity: ringOpacity * 0.6,
                                    }}
                                />
                            )}
                            {/* Country dot */}
                            <CircleMarker
                                center={coords}
                                radius={markerRadius}
                                pathOptions={{
                                    color: borderColor,
                                    fillColor: riskColor,
                                    fillOpacity: role ? 0.95 : 0.65,
                                    weight: role ? 3 : 1.5,
                                }}
                            >
                                <Tooltip permanent direction="bottom" offset={[0, 6]}>
                                    <div style={{
                                        background: '#0d1117', color: 'white', padding: '1px 5px',
                                        borderRadius: 3, fontSize: 9, fontWeight: 600, border: `1px solid ${borderColor}`,
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {country.name}
                                        {role && <span style={{ fontSize: 8, marginLeft: 3 }}>
                                            {role === 'ATTACKER' ? '⚔️' : role === 'DEFENDER' ? '🛡️' : '⚠️'}
                                        </span>}
                                    </div>
                                </Tooltip>
                                <Popup>
                                    <div style={{ background: '#0d1117', color: 'white', padding: 12, borderRadius: 8, minWidth: 200, fontFamily: 'Inter' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{country.name}</div>
                                        {role && <div style={{ fontSize: 10, fontWeight: 600, color: borderColor, padding: '2px 8px', background: `${borderColor}20`, borderRadius: 8, display: 'inline-block', marginBottom: 8 }}>{role}</div>}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                                            <div>
                                                <div style={{ color: '#8b949e', fontSize: 9 }}>RISK ({selectedYear})</div>
                                                <div style={{ fontWeight: 700, color: riskColor, fontFamily: 'JetBrains Mono' }}>{currentRisk?.toFixed(1)}%</div>
                                            </div>
                                            {cascadeRisk !== undefined && <div>
                                                <div style={{ color: '#8b949e', fontSize: 9 }}>CASCADE</div>
                                                <div style={{ fontWeight: 700, color: '#f97316', fontFamily: 'JetBrains Mono' }}>{cascadeRisk}%</div>
                                            </div>}
                                            <div>
                                                <div style={{ color: '#8b949e', fontSize: 9 }}>BLOC</div>
                                                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{country.bloc}</div>
                                            </div>
                                            <div>
                                                <div style={{ color: '#8b949e', fontSize: 9 }}>NUCLEAR</div>
                                                <div style={{ fontWeight: 600 }}>{country.nuclear ? '☢️ Yes' : 'No'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            {/* === SCENARIO BANNER === */}
            {activeScenario && (
                <div className="scenario-banner">
                    <h2>⚔️ {activeScenario.scenario.title} — {selectedYear}</h2>
                    <p>{activeScenario.scenario.description}</p>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: getRiskColor(adjustedProb), fontWeight: 700 }}>
                            P(Conflict): {adjustedProb}%
                            {yearMultiplier < 1 && <span style={{ color: '#8b949e', fontWeight: 400 }}> (year-adjusted)</span>}
                        </span>
                        <span style={{ fontSize: 11, color: '#f97316', fontWeight: 700 }}>
                            {Object.keys(adjustedCascade).length} nations in cascade
                        </span>
                        <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>
                            {overlay?.movements.length || 0} force movements
                        </span>
                    </div>
                </div>
            )}

            {/* === FACTS & FIGURES PANEL === */}
            {activeScenario && showFacts && (
                <div style={{
                    position: 'absolute', top: 90, left: 16, zIndex: 1000,
                    background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(48,54,61,0.6)', borderRadius: 12,
                    padding: 14, width: 220, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Facts & Figures
                        </span>
                        <button onClick={() => setShowFacts(false)} style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ background: '#161b22', borderRadius: 8, padding: 10, border: '1px solid #21262d' }}>
                            <div style={{ fontSize: 9, color: '#8b949e', textTransform: 'uppercase' }}>Conflict Prob ({selectedYear})</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: getRiskColor(adjustedProb), fontFamily: 'JetBrains Mono' }}>{adjustedProb}%</div>
                            {yearMultiplier < 1 && <div style={{ fontSize: 9, color: '#484f58' }}>Base: {activeScenario.scenario.conflict_probability}% × {(yearMultiplier * 100).toFixed(0)}% year factor</div>}
                        </div>
                        <div style={{ background: '#161b22', borderRadius: 8, padding: 10, border: '1px solid #21262d' }}>
                            <div style={{ fontSize: 9, color: '#8b949e', textTransform: 'uppercase' }}>Primary Actors</div>
                            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                                <span style={{ color: '#ef4444' }}>⚔️ {activeScenario.scenario.primary.country_a}</span>
                                <span style={{ color: '#484f58', margin: '0 6px' }}>vs</span>
                                <span style={{ color: '#3b82f6' }}>🛡️ {activeScenario.scenario.primary.country_b}</span>
                            </div>
                        </div>
                        <div style={{ background: '#161b22', borderRadius: 8, padding: 10, border: '1px solid #21262d' }}>
                            <div style={{ fontSize: 9, color: '#8b949e', textTransform: 'uppercase', marginBottom: 6 }}>Alliance Cascade</div>
                            {Object.entries(adjustedCascade)
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .slice(0, 8)
                                .map(([country, risk]) => (
                                    <div key={country} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, width: 75, color: '#e6edf3' }}>{country}</div>
                                        <div style={{ flex: 1, height: 4, background: '#21262d', borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${Math.min(risk as number, 100)}%`, height: '100%',
                                                background: getRiskColor(risk as number), borderRadius: 2,
                                            }} />
                                        </div>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: getRiskColor(risk as number), fontFamily: 'JetBrains Mono', width: 32, textAlign: 'right' }}>
                                            {(risk as number).toFixed(0)}%
                                        </div>
                                    </div>
                                ))}
                        </div>
                        <div style={{ background: '#161b22', borderRadius: 8, padding: 10, border: '1px solid #21262d' }}>
                            <div style={{ fontSize: 9, color: '#8b949e', textTransform: 'uppercase' }}>Nuclear States Involved</div>
                            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                                {Object.keys(adjustedCascade).filter(c => ['USA', 'Russia', 'China', 'India', 'Pakistan', 'Israel', 'UK', 'France'].includes(c)).map(c => (
                                    <span key={c} style={{ display: 'inline-block', fontSize: 9, background: '#21262d', padding: '1px 6px', borderRadius: 8, margin: '2px 2px', color: '#f97316' }}>
                                        ☢️ {c}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {activeScenario && !showFacts && (
                <button onClick={() => setShowFacts(true)} style={{
                    position: 'absolute', top: 90, left: 16, zIndex: 1000,
                    background: 'rgba(13,17,23,0.85)', border: '1px solid #30363d', borderRadius: 8,
                    color: '#8b949e', padding: '6px 12px', fontSize: 11, cursor: 'pointer',
                }}>📊 Show Facts</button>
            )}

            {/* Legend */}
            <div className="map-overlay-bottom">
                <div className="map-legend">
                    <div className="legend-item"><div className="legend-dot" style={{ background: '#ef4444' }} /><span>Attack</span></div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: '#3b82f6' }} /><span>Reinforce</span></div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: '#22c55e' }} /><span>Allied</span></div>
                    <div className="legend-item"><div className="legend-dot" style={{ background: '#f97316' }} /><span>Cascade</span></div>
                    <div className="legend-item" style={{ cursor: 'pointer' }} onClick={() => setShowAlliances(!showAlliances)}>
                        <div className="legend-line" style={{ background: showAlliances ? '#3fb950' : '#484f58', width: 20, height: 2 }} />
                        <span>{showAlliances ? 'Hide' : 'Show'} Alliances</span>
                    </div>
                    <div className="legend-item" style={{ cursor: 'pointer' }} onClick={() => setShowHeatmap(!showHeatmap)}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: showHeatmap ? 'rgba(239,68,68,0.4)' : '#484f58', border: `1px solid ${showHeatmap ? '#ef4444' : '#484f58'}` }} />
                        <span>🌡️ {showHeatmap ? 'Hide' : 'Show'} Heatmap</span>
                    </div>
                </div>
            </div>

            {/* Stats chips */}
            {activeScenario && (
                <div className="map-stats-bar">
                    <div className="stat-chip">
                        <div className="stat-chip-label">Conflict Prob</div>
                        <div className="stat-chip-value" style={{ color: getRiskColor(adjustedProb) }}>{adjustedProb}%</div>
                    </div>
                    <div className="stat-chip">
                        <div className="stat-chip-label">Cascade Nations</div>
                        <div className="stat-chip-value" style={{ color: '#f97316' }}>{Object.keys(adjustedCascade).length}</div>
                    </div>
                    <div className="stat-chip">
                        <div className="stat-chip-label">Sim Year</div>
                        <div className="stat-chip-value" style={{ color: selectedYear >= 2027 && selectedYear <= 2030 ? '#ef4444' : '#58a6ff' }}>{selectedYear}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
