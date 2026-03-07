'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { COUNTRY_BASES } from '../data/countryBases';
import { GLOBAL_MILITARY_BASES } from '../data/militaryBases';



// ============================================================
// TYPES
// ============================================================

export interface Country {
    name: string;
    coords: [number, number];
    nuclear: boolean;
    bloc: 'western' | 'eastern' | 'non-aligned';
    risk_2025: number;
    features: Record<string, number[]>;
}

export interface AllianceEdge {
    source: string;
    target: string;
    weight: number;
    type: string;
    is_alliance: boolean;
}

export interface Scenario {
    id: string;
    title: string;
    description: string;
    year: number;
    primary: { country_a: string; country_b: string };
    conflict_probability: number;
}

export interface CascadeData {
    [country: string]: number;
}

export interface ScenarioResult {
    scenario: Scenario;
    cascade: CascadeData;
    countries: Record<string, {
        risk: number;
        cascade_risk: number;
        coords: [number, number];
        nuclear: boolean;
        bloc: string;
        features_at_year: Record<string, number>;
    }>;
    predictions: Record<string, number>;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface OpponentAction {
    id: string;
    timestamp: number;
    type: 'strike' | 'alliance' | 'nuclear' | 'diplomatic' | 'economic' | 'mobilize';
    country: string;
    message: string;
    targetBase?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export type ScenarioPhase = 'inactive' | 'setup' | 'active' | 'escalated' | 'nuclear' | 'ceasefire';

interface AppState {
    // Data from model
    countries: Country[];
    edges: AllianceEdge[];
    predictions: Record<string, number>;
    risks: Record<string, number[]>;
    years: number[];

    // UI state
    selectedYear: number;
    activeScenario: ScenarioResult | null;
    chatMessages: ChatMessage[];
    isLoading: boolean;
    isChatLoading: boolean;
    backendStatus: 'connecting' | 'connected' | 'error';

    // Actions
    setSelectedYear: (year: number) => void;
    loadScenario: (scenarioId: string, year?: number) => Promise<void>;
    runCustomScenario: (countryA: string, countryB: string, year: number) => Promise<void>;
    sendChatMessage: (message: string) => Promise<void>;
    setBackendStatus: (status: 'connecting' | 'connected' | 'error') => void;
    initializeData: () => Promise<void>;

    // Player State
    playerCountry: string | null;
    setPlayerCountry: (country: string | null) => void;
    campaignPlan: { activeBases: string[], target: [number, number] | null };
    setCampaignPlan: (plan: { activeBases: string[], target: [number, number] | null }) => void;
    customBases: any[];
    setCustomBases: (bases: any[]) => void;
    simulationResults: any | null;
    setSimulationResults: (results: any | null) => void;

    // Fog of War & Login
    intelRevealed: string[];
    setIntelRevealed: (countries: string[]) => void;
    playerName: string | null;
    setPlayerName: (name: string | null) => void;
    showLoginModal: boolean;
    setShowLoginModal: (show: boolean) => void;

    // === WARGAME CONFLICT STATE ===
    destroyedBases: string[];
    destroyBase: (baseId: string) => void;
    opponentActions: OpponentAction[];
    addOpponentAction: (action: OpponentAction) => void;
    clearOpponentActions: () => void;
    scenarioPhase: ScenarioPhase;
    setScenarioPhase: (phase: ScenarioPhase) => void;
    showCommandDashboard: boolean;
    setShowCommandDashboard: (show: boolean) => void;
    strikeOrigin: string | null;
    setStrikeOrigin: (id: string | null) => void;
    activeConflict: { attacker: string; defender: string; year: number; casusBelli: string } | null;
    setActiveConflict: (c: { attacker: string; defender: string; year: number; casusBelli: string } | null) => void;
    triggerOpponentTurn: (playerAction: string) => Promise<void>;
    nuclearAlertLevel: number;
    setNuclearAlertLevel: (level: number) => void;

    // Map Navigation
    mapCenter: [number, number];
    setMapCenter: (c: [number, number]) => void;
    mapZoom: number;
    setMapZoom: (z: number) => void;
}

const AppContext = createContext<AppState | null>(null);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const SCENARIO_MAP_DATA: Record<string, { center: [number, number]; zoom: number }> = {
    china_taiwan: { center: [24, 121], zoom: 6 },
    iran_israel: { center: [32, 44], zoom: 5 },
    india_pakistan: { center: [31, 73], zoom: 5 },
    russia_nato: { center: [55, 37], zoom: 4 },
    china_india: { center: [33, 80], zoom: 5 },
};

// ============================================================
// PROVIDER
// ============================================================

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [countries, setCountries] = useState<Country[]>([]);
    const [edges, setEdges] = useState<AllianceEdge[]>([]);
    const [predictions, setPredictions] = useState<Record<string, number>>({});
    const [risks, setRisks] = useState<Record<string, number[]>>({});
    const [years, setYears] = useState<number[]>([]);
    const [selectedYear, setSelectedYear] = useState(2027);
    const [activeScenario, setActiveScenario] = useState<ScenarioResult | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

    // Player State
    const [playerCountry, setPlayerCountry] = useState<string | null>(null);
    const [campaignPlan, setCampaignPlan] = useState<{ activeBases: string[], target: [number, number] | null }>({ activeBases: [], target: null });
    const [customBases, setCustomBases] = useState<any[]>([]);
    const [simulationResults, setSimulationResults] = useState<any | null>(null);
    const [intelRevealed, setIntelRevealed] = useState<string[]>([]);
    const [playerName, setPlayerName] = useState<string | null>(null);
    const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

    // Wargame conflict state
    const [destroyedBases, setDestroyedBases] = useState<string[]>([]);
    const [opponentActions, setOpponentActions] = useState<OpponentAction[]>([]);
    const [scenarioPhase, setScenarioPhase] = useState<ScenarioPhase>('inactive');
    const [showCommandDashboard, setShowCommandDashboard] = useState(false);
    const [strikeOrigin, setStrikeOrigin] = useState<string | null>(null);
    const [activeConflict, setActiveConflict] = useState<{ attacker: string; defender: string; year: number; casusBelli: string } | null>(null);
    const [nuclearAlertLevel, setNuclearAlertLevel] = useState(0);

    // Map Navigation State
    const [mapCenter, setMapCenter] = useState<[number, number]>([25, 60]);
    const [mapZoom, setMapZoom] = useState<number>(3);

    const destroyBase = useCallback((baseId: string) => {
        setDestroyedBases(prev => [...new Set([...prev, baseId])]);
    }, []);

    const addOpponentAction = useCallback((action: OpponentAction) => {
        setOpponentActions(prev => [action, ...prev].slice(0, 20));
    }, []);

    const clearOpponentActions = useCallback(() => setOpponentActions([]), []);

    const triggerOpponentTurn = useCallback(async (playerAction: string) => {
        if (!activeConflict) return;
        try {
            const res = await fetch('/api/opponent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerCountry,
                    opponentCountry: activeConflict.defender,
                    playerAction,
                    scenarioPhase,
                    year: activeConflict.year,
                    nuclearAlertLevel,
                    destroyedBases,
                })
            });
            const data = await res.json();
            if (data.actions && Array.isArray(data.actions)) {
                data.actions.forEach((a: OpponentAction) => addOpponentAction(a));
            }
            if (data.newNuclearLevel !== undefined) {
                setNuclearAlertLevel(l => Math.max(l, data.newNuclearLevel));
            }
            if (data.phase) setScenarioPhase(data.phase);
        } catch (e) {
            console.warn('Opponent AI error:', e);
        }
    }, [activeConflict, playerCountry, scenarioPhase, nuclearAlertLevel, destroyedBases, addOpponentAction]);

    const initializeData = useCallback(async () => {
        const to = (url: string) => {
            const c = new AbortController();
            setTimeout(() => c.abort(), 5000);
            return fetch(url, { signal: c.signal });
        };
        try {
            setBackendStatus('connecting');

            const [graphRes, predRes, riskRes] = await Promise.all([
                to(`${BACKEND_URL}/graph`),
                to(`${BACKEND_URL}/predictions`),
                to(`${BACKEND_URL}/risks`),
            ]);

            if (!graphRes.ok || !predRes.ok || !riskRes.ok) {
                throw new Error('Backend not responding');
            }

            const graphData = await graphRes.json();
            const predData = await predRes.json();
            const riskData = await riskRes.json();

            setCountries(graphData.countries);
            setEdges(graphData.edges);
            setPredictions(predData.predictions);
            setRisks(riskData.risks);
            setYears(riskData.years);
            setBackendStatus('connected');
        } catch (err) {
            console.warn('Backend not reachable:', (err as Error)?.message);
            setBackendStatus('error');
        }
    }, []);

    // Pre-defined scenario configs for client-side fallback
    const SCENARIO_CONFIGS: Record<string, { a: string; b: string; year: number; title: string; desc: string }> = {
        china_taiwan: { a: 'China', b: 'Taiwan', year: 2027, title: 'China Invades Taiwan', desc: 'PLA amphibious assault on Taiwan during the 2027 readiness window' },
        iran_israel: { a: 'Iran', b: 'Israel', year: 2025, title: 'Iran-Israel Direct Strike Exchange', desc: 'Full-scale military conflict between Iran and Israel' },
        india_pakistan: { a: 'India', b: 'Pakistan', year: 2026, title: 'India-Pakistan Kashmir Escalation', desc: 'LoC escalation spiraling into full conflict' },
        russia_nato: { a: 'Russia', b: 'USA', year: 2028, title: 'Russia-NATO Confrontation', desc: 'Direct military confrontation between Russia and NATO' },
        china_india: { a: 'China', b: 'India', year: 2027, title: 'China-India Border War', desc: 'LAC conflict escalating to full-scale war' },
    };

    // Alliance weights for client-side cascade
    const ALLIANCE_WEIGHTS: Record<string, Record<string, number>> = {
        'USA': { 'UK': 0.95, 'France': 0.85, 'Israel': 0.90, 'Taiwan': 0.80, 'Saudi Arabia': 0.60, 'India': 0.40, 'Indonesia': 0.35 },
        'UK': { 'USA': 0.95, 'France': 0.85, 'Israel': 0.70 },
        'France': { 'USA': 0.85, 'UK': 0.85, 'Israel': 0.50 },
        'China': { 'Russia': 0.70, 'Pakistan': 0.85, 'Iran': 0.55, 'Afghanistan': 0.30 },
        'Russia': { 'China': 0.70, 'Iran': 0.60 },
        'India': { 'USA': 0.40, 'Russia': 0.45 },
        'Israel': { 'USA': 0.90, 'UK': 0.70, 'France': 0.50 },
        'Pakistan': { 'China': 0.85, 'Saudi Arabia': 0.55, 'Turkey': 0.50 },
        'Saudi Arabia': { 'USA': 0.60, 'Pakistan': 0.55 },
        'Turkey': { 'Pakistan': 0.50 },
        'Iran': { 'China': 0.55, 'Russia': 0.60 },
        'Taiwan': { 'USA': 0.80 },
        'Indonesia': { 'USA': 0.35 },
        'Afghanistan': { 'China': 0.30 },
    };

    const computeCascadeLocally = (countryA: string, countryB: string, prob: number): CascadeData => {
        const affected: Record<string, number> = { [countryA]: prob, [countryB]: prob };
        for (let hop = 0; hop < 3; hop++) {
            const snapshot = { ...affected };
            for (const [country, risk] of Object.entries(snapshot)) {
                const neighbors = ALLIANCE_WEIGHTS[country] || {};
                for (const [neighbor, weight] of Object.entries(neighbors)) {
                    const cascadeProb = risk * weight * Math.pow(0.7, hop);
                    if (cascadeProb > (affected[neighbor] || 0)) {
                        affected[neighbor] = cascadeProb;
                    }
                }
            }
        }
        const result: CascadeData = {};
        for (const [k, v] of Object.entries(affected)) {
            result[k] = Math.round(v * 1000) / 10;
        }
        return result;
    };

    // ── Timeout-aware fetch: fails fast when backend is down ──────
    const fetchWithTimeout = (url: string, options: RequestInit, ms = 3000): Promise<Response> => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), ms);
        return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(id));
    };

    const loadScenario = useCallback(async (scenarioId: string, year?: number) => {
        setIsLoading(true);
        try {
            const res = await fetchWithTimeout(`${BACKEND_URL}/scenario`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario_id: scenarioId, year: year || selectedYear }),
            });
            if (!res.ok) throw new Error('Backend scenario endpoint failed');
            const data: ScenarioResult = await res.json();
            setActiveScenario(data);
            if (data.scenario.year) {
                setSelectedYear(data.scenario.year);
            }
            // Auto-navigate map
            const mapInfo = SCENARIO_MAP_DATA[scenarioId];
            if (mapInfo) {
                setMapCenter(mapInfo.center);
                setMapZoom(mapInfo.zoom);
            }
        } catch (err) {
            console.warn('Backend offline, using client-side fallback:', (err as Error)?.message);
            // CLIENT-SIDE FALLBACK — build scenario from already-loaded data
            const config = SCENARIO_CONFIGS[scenarioId] || SCENARIO_CONFIGS.china_taiwan;
            const prob = predictions[`${config.a}-${config.b}`] || predictions[`${config.b}-${config.a}`] || 35;
            const cascade = computeCascadeLocally(config.a, config.b, prob / 100);
            const fallback: ScenarioResult = {
                scenario: {
                    id: scenarioId,
                    title: config.title,
                    description: config.desc,
                    year: year || config.year,
                    primary: { country_a: config.a, country_b: config.b },
                    conflict_probability: prob,
                },
                cascade,
                countries: {},
                predictions,
            };
            setActiveScenario(fallback);
            setSelectedYear(year || config.year);

            // Auto-navigate map fallback
            const mapInfo = SCENARIO_MAP_DATA[scenarioId];
            if (mapInfo) {
                setMapCenter(mapInfo.center);
                setMapZoom(mapInfo.zoom);
            }
        }
        setIsLoading(false);
    }, [selectedYear, predictions, computeCascadeLocally, setMapCenter, setMapZoom]);

    const runCustomScenario = useCallback(async (countryA: string, countryB: string, year: number) => {
        setIsLoading(true);
        setSelectedYear(year);
        try {
            const res = await fetchWithTimeout(`${BACKEND_URL}/cascade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country_a: countryA, country_b: countryB }),
            });
            if (!res.ok) throw new Error('Cascade endpoint failed');
            const data = await res.json();
            const prob = predictions[`${countryA}-${countryB}`] || predictions[`${countryB}-${countryA}`] || data.initial_prob || 20;
            const fallback: ScenarioResult = {
                scenario: {
                    id: `custom_${countryA}_${countryB}`,
                    title: `${countryA} vs ${countryB}`,
                    description: `Custom scenario: ${countryA} in conflict with ${countryB} (${year})`,
                    year,
                    primary: { country_a: countryA, country_b: countryB },
                    conflict_probability: prob,
                },
                cascade: data.cascade || {},
                countries: {},
                predictions,
            };
            setActiveScenario(fallback);

            // Auto-navigate map for custom pairs
            setMapCenter([30, 60]);
            setMapZoom(4);
        } catch (e) {
            // backend offline — use local cascade
            console.warn('Custom scenario: backend offline, using local cascade:', (e as Error)?.message);
            const prob = predictions[`${countryA}-${countryB}`] || predictions[`${countryB}-${countryA}`] || 20;
            const cascade = computeCascadeLocally(countryA, countryB, prob / 100);
            setActiveScenario({
                scenario: {
                    id: `custom_${countryA}_${countryB}`,
                    title: `${countryA} vs ${countryB}`,
                    description: `Custom scenario: ${countryA} in conflict with ${countryB} (${year})`,
                    year,
                    primary: { country_a: countryA, country_b: countryB },
                    conflict_probability: prob,
                },
                cascade,
                countries: {},
                predictions,
            });

            // Auto-navigate map for custom pairs fallback
            setMapCenter([30, 60]);
            setMapZoom(4);
        }
        setIsLoading(false);
    }, [predictions, computeCascadeLocally, setMapCenter, setMapZoom]);

    const sendChatMessage = useCallback(async (message: string) => {
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: message,
            timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, userMsg]);
        setIsChatLoading(true);

        // ── MAP SYNC: detect scenario + year from the message ──────
        const lower = message.toLowerCase();

        // Extract year mention (2025-2040)
        const yearMatch = message.match(/\b(20[2-3]\d|2040)\b/);
        const mentionedYear = yearMatch ? parseInt(yearMatch[1]) : undefined;

        // Preset scenario keyword rules — ANY keyword group all-match → trigger
        const SCENARIO_RULES: Array<{ id: string; groups: string[][] }> = [
            { id: 'china_taiwan', groups: [['china', 'taiwan'], ['pla', 'taiwan'], ['taiwan strait'], ['taiwan', 'invasion'], ['invades taiwan']] },
            { id: 'iran_israel', groups: [['iran', 'israel'], ['tehran', 'israel'], ['iran vs israel'], ['iran attack israel']] },
            { id: 'india_pakistan', groups: [['india', 'pakistan'], ['kashmir'], ['loc escalat'], ['pakistan nuclear']] },
            { id: 'russia_nato', groups: [['russia', 'nato'], ['russia', 'europe'], ['russia', 'usa'], ['russia attack'], ['putin', 'nato']] },
            { id: 'china_india', groups: [['china', 'india'], ['galwan'], ['lac conflict'], ['china border india']] },
        ];

        let detectedScenarioId: string | null = null;
        for (const rule of SCENARIO_RULES) {
            for (const group of rule.groups) {
                if (group.every(kw => lower.includes(kw))) {
                    detectedScenarioId = rule.id;
                    break;
                }
            }
            if (detectedScenarioId) break;
        }

        // If no preset matched, try to detect any 2 countries being discussed
        const ALL_COUNTRIES = [
            'USA', 'Russia', 'China', 'India', 'Iran', 'Israel',
            'UK', 'France', 'Pakistan', 'Saudi Arabia', 'Turkey',
            'Indonesia', 'Afghanistan', 'Taiwan',
        ];
        let customA: string | null = null;
        let customB: string | null = null;
        if (!detectedScenarioId) {
            const found = ALL_COUNTRIES.filter(c => lower.includes(c.toLowerCase()));
            if (found.length >= 2) { customA = found[0]; customB = found[1]; }
        }

        // Fire map update IMMEDIATELY (parallel with Groq) — user sees map change as they wait for AI
        if (detectedScenarioId) {
            loadScenario(detectedScenarioId, mentionedYear);
        } else if (customA && customB) {
            runCustomScenario(customA, customB, mentionedYear ?? selectedYear);
        } else if (mentionedYear) {
            setSelectedYear(mentionedYear);
        }
        // ─────────────────────────────────────────────────────────────

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...chatMessages, userMsg].map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    scenario: activeScenario,
                    predictions,
                    risks,
                    year: selectedYear,
                    playerCountry,
                    campaignPlan,
                    destroyedBases,
                }),
            });

            if (!res.ok) throw new Error('Chat API error');

            const data = await res.json();
            let responseText = data.response;

            // INTEL REVEAL INTERCEPTOR
            const intelRegex = /\[REVEAL_INTEL:([^\]]+)\]/g;
            let match;
            const newReveals: string[] = [];
            while ((match = intelRegex.exec(responseText)) !== null) {
                newReveals.push(match[1].trim());
            }
            if (newReveals.length > 0) {
                setIntelRevealed(prev => {
                    const merged = [...new Set([...prev, ...newReveals])];
                    return merged;
                });
                // Remove the tag from the AI's actual text response so it looks clean to the user
                responseText = responseText.replace(/\[REVEAL_INTEL:[^\]]+\]/g, '').trim();
            }

            // TARGET COMMAND INTERCEPTOR
            const targetRegex = /\[SET_TARGET:([^\]]+)\]/g;
            let targetMatch;
            let newTargetBaseName: string | null = null;
            while ((targetMatch = targetRegex.exec(responseText)) !== null) {
                newTargetBaseName = targetMatch[1].trim();
            }
            if (newTargetBaseName) {
                responseText = responseText.replace(targetRegex, '').trim();
                const detailedBases = Object.values(COUNTRY_BASES).flat();
                const allGlobalBases = [...detailedBases, ...GLOBAL_MILITARY_BASES, ...customBases];
                const targetBase = allGlobalBases.find(b =>
                    b.name.toLowerCase().includes(newTargetBaseName!.toLowerCase()) ||
                    b.shortName.toLowerCase().includes(newTargetBaseName!.toLowerCase()) ||
                    newTargetBaseName!.toLowerCase().includes(b.shortName.toLowerCase())
                );


                if (targetBase) {
                    setCampaignPlan(prev => {
                        let newActiveBases = prev.activeBases;
                        // Auto-select a base only if none are selected, but don't force it if commander already has a plan
                        if (newActiveBases.length === 0 && playerCountry && COUNTRY_BASES[playerCountry]) {
                            const defaultBase = COUNTRY_BASES[playerCountry].find(b => b.type === 'air' || b.type === 'missile') || COUNTRY_BASES[playerCountry][0];
                            if (defaultBase) {
                                newActiveBases = [defaultBase.id];
                            }
                        }
                        return { ...prev, activeBases: newActiveBases, target: targetBase.coords as [number, number] };
                    });
                    responseText += `\n\n> **[STRATEGIC ADVISOR]** Target identified: **${targetBase.shortName}** (${targetBase.country}). 🎯 Coordinates locked. Ready for engagement configuration in the Strategic Command panel.`;
                    setMapCenter(targetBase.coords as [number, number]);
                    setMapZoom(6);
                }
            }

            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            console.warn('Chat error:', (err as Error)?.message);
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '⚠️ Error connecting to AI. Make sure your Groq API key is set in `.env.local` as `GROQ_API_KEY=your_key`.',
                timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, errorMsg]);
        }
        setIsChatLoading(false);
    }, [chatMessages, activeScenario, predictions, risks, selectedYear, loadScenario, runCustomScenario, campaignPlan, customBases, destroyedBases, playerCountry, setMapCenter, setMapZoom, setIntelRevealed, setChatMessages, setIsChatLoading, setCampaignPlan]);

    return (
        <AppContext.Provider value={{
            countries, edges, predictions, risks, years,
            selectedYear, activeScenario, chatMessages,
            isLoading, isChatLoading, backendStatus,
            setSelectedYear, loadScenario, runCustomScenario, sendChatMessage,
            setBackendStatus, initializeData,
            playerCountry, setPlayerCountry,
            campaignPlan, setCampaignPlan,
            customBases, setCustomBases,
            simulationResults, setSimulationResults,
            intelRevealed, setIntelRevealed,
            playerName, setPlayerName,
            showLoginModal, setShowLoginModal,
            // Wargame conflict state
            destroyedBases, destroyBase,
            opponentActions, addOpponentAction, clearOpponentActions,
            scenarioPhase, setScenarioPhase,
            showCommandDashboard, setShowCommandDashboard,
            strikeOrigin, setStrikeOrigin,
            activeConflict, setActiveConflict,
            triggerOpponentTurn,
            nuclearAlertLevel, setNuclearAlertLevel,
            mapCenter, setMapCenter,
            mapZoom, setMapZoom,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
