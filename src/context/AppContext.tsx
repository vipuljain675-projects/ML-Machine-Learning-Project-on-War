'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

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
}

const AppContext = createContext<AppState | null>(null);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

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
        }
        setIsLoading(false);
    }, [selectedYear, predictions]);

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
        }
        setIsLoading(false);
    }, [predictions, computeCascadeLocally]);

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
    }, [chatMessages, activeScenario, predictions, risks, selectedYear, loadScenario, runCustomScenario]);

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
