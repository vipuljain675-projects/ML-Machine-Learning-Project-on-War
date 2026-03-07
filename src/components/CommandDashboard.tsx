'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { COUNTRY_BASES } from '../data/countryBases';
import { X, ChevronDown, ChevronUp, Zap, Shield, Anchor, Crosshair, DollarSign, Radiation, Plus, Edit3, Trash2, Check } from 'lucide-react';

type Tab = 'airforce' | 'army' | 'navy' | 'missiles' | 'economy' | 'nuclear';

const COUNTRY_FIREPOWER: Record<string, Record<Tab, any>> = {
    India: {
        airforce: { combatAircraft: 600, rafale: 36, su30mki: 272, tejas: 83, mig29: 66, helicopters: 550, drones: 186, awacs: 3, tankers: 6 },
        army: { activeTroops: 1460000, reserveTroops: 1155000, tanks: 3740, artillery: 4060, rocketSystems: 180, apcs: 4000 },
        navy: { activePlatforms: 132, carriers: 2, destroyers: 10, frigates: 15, submarines: 16, patrolBoats: 42, coastGuard: 156 },
        missiles: [
            { name: 'BrahMos Cruise', range: '400km', speed: 'Mach 2.8', warhead: '300kg', deployments: 'Land/Ship/Air/Sub', nuclear: false },
            { name: 'S-400 Triumf SAM', range: '400km', speed: 'Mach 14', warhead: 'Fragmentation', deployments: '5 regiments (40N6)', nuclear: false },
            { name: 'Agni-V ICBM', range: '5500km', speed: 'Mach 24', warhead: '1500kg (MIRV capable)', deployments: '3 batteries', nuclear: true },
            { name: 'Agni-III IRBM', range: '3000km', speed: 'Mach 12', warhead: '1500kg', deployments: 'Road mobile', nuclear: true },
            { name: 'Prithvi-II SRBM', range: '350km', speed: 'Mach 5', warhead: '500-1000kg', deployments: '40+ launchers', nuclear: false },
            { name: 'Pinaka MLRS', range: '90km', speed: 'Mach 3', warhead: '250kg', deployments: '60+ batteries', nuclear: false },
        ],
        economy: { gdp: 3.7, gdpGrowth: 8.2, defenceBudget: 75, defencePct: 2.1, tradeExports: 776, tradeImports: 898, keyPartners: ['USA', 'UAE', 'China', 'Russia'], sanctionExposure: 'Low' },
        nuclear: { warheads: 170, deployed: 80, doctrine: 'No First Use (ambiguous)', triads: ['Land (Agni-V)', 'Air (Rafale/Mirage)', 'Sea (INS Arihant K-4)'], alertLevel: 'Low' }
    },
    USA: {
        airforce: { combatAircraft: 2000, f35: 890, f22: 186, f15ex: 220, f16: 812, b2spirit: 20, b52h: 76, b21raider: 8, drones: 800, tankers: 650 },
        army: { activeTroops: 485000, marines: 180000, reserveTroops: 450000, tanks: 2600, artillery: 1800, rocketSystems: 300, apcs: 9500 },
        navy: { activePlatforms: 480, carriers: 11, destroyers: 69, submarines: 53, ssbn: 14, patrolBoats: 26, amphibiousShips: 34 },
        missiles: [
            { name: 'Tomahawk Block V', range: '1600km', speed: 'Mach 0.7', warhead: '450kg', deployments: '4,000+ in inventory', nuclear: false },
            { name: 'AGM-158B JASSM-ER', range: '980km', speed: 'Mach 0.9 stealth', warhead: '450kg', deployments: 'B-52/F-35/F-16', nuclear: false },
            { name: 'SM-3 Block IIA', range: '1000km', speed: 'Mach 15', warhead: 'Kinetic', deployments: 'Aegis ships/THAAD', nuclear: false },
            { name: 'Minuteman-III ICBM', range: '13000km', speed: 'Mach 23', warhead: '335kt W87', deployments: '400 silos (Malmstrom/Minot/Warren)', nuclear: true },
            { name: 'Trident-II D5 SLBM', range: '11000km', speed: 'Mach 24', warhead: '8 MIRV 475kt W88', deployments: '14 Ohio-class SSBNs', nuclear: true },
        ],
        economy: { gdp: 27.4, gdpGrowth: 2.5, defenceBudget: 886, defencePct: 3.4, tradeExports: 3000, tradeImports: 3400, keyPartners: ['Canada', 'Mexico', 'China', 'EU'], sanctionExposure: 'None' },
        nuclear: { warheads: 5550, deployed: 1700, doctrine: 'Flexible Response', triads: ['Land (400 MM-III ICBMs)', 'Sea (14 Ohio SSBNs)', 'Air (B-2/B-52 bombers)'], alertLevel: 'Peacetime' }
    },
    China: {
        airforce: { combatAircraft: 1500, j20: 500, j16: 300, j11b: 300, h6k: 100, drones: 1200, awacs: 8, tankers: 24 },
        army: { activeTroops: 915000, reserveTroops: 3000000, tanks: 5000, artillery: 35000, rocketSystems: 800, apcs: 9000 },
        navy: { activePlatforms: 355, carriers: 3, destroyers: 52, frigates: 54, submarines: 48, ssbn: 6, patrolBoats: 120 },
        missiles: [
            { name: 'DF-17 Hypersonic', range: '2000km', speed: 'Mach 10', warhead: 'HGV 500kg', deployments: '100+ launchers', nuclear: true },
            { name: 'DF-21D ASBM', range: '1500km', speed: 'Mach 10', warhead: '600kg', deployments: 'Carrier killer', nuclear: false },
            { name: 'DF-26 IRBM', range: '4000km', speed: 'Mach 18', warhead: '1000kg dual use', deployments: '200+ missiles (Guam killer)', nuclear: true },
            { name: 'DF-41 ICBM', range: '15000km', speed: 'Mach 25', warhead: '10 MIRV', deployments: '250+ silos (Gansu/Qinghai)', nuclear: true },
            { name: 'YJ-18 Anti-Ship', range: '540km', speed: 'Mach 3', warhead: '300kg', deployments: 'Submarines/destroyers', nuclear: false },
        ],
        economy: { gdp: 17.7, gdpGrowth: 5.2, defenceBudget: 225, defencePct: 1.7, tradeExports: 3380, tradeImports: 2500, keyPartners: ['USA', 'EU', 'ASEAN', 'Africa'], sanctionExposure: 'Medium' },
        nuclear: { warheads: 500, deployed: 350, doctrine: 'No First Use (ambiguous)', triads: ['Land (DF-41/DF-5B)', 'Sea (Jin SSBN JL-2)', 'Air (H-6N cruise)'], alertLevel: 'Elevated' }
    },
    Russia: {
        airforce: { combatAircraft: 1200, su57: 10, su35: 120, su30sm: 220, su34: 130, tu160: 16, tu95ms: 55, drones: 600, tankers: 160 },
        army: { activeTroops: 900000, reserveTroops: 2000000, tanks: 3500, artillery: 140000, rocketSystems: 500, apcs: 14000 },
        navy: { activePlatforms: 340, carriers: 0, destroyers: 15, frigates: 12, submarines: 58, ssbn: 12, patrolBoats: 80 },
        missiles: [
            { name: 'Kinzhal Hypersonic', range: '2000km', speed: 'Mach 10+', warhead: '500kg — NO INTERCEPT', deployments: 'MiG-31K/Tu-22M3', nuclear: true },
            { name: 'Iskander-M', range: '500km', speed: 'Mach 7', warhead: '700kg', deployments: '12 brigades', nuclear: true },
            { name: 'Kh-101 Cruise', range: '5500km', speed: 'Mach 0.78 stealth', warhead: '450kg', deployments: 'Tu-160/Tu-95MS', nuclear: false },
            { name: 'Sarmat ICBM', range: '18000km', speed: 'Mach 20', warhead: '15 MIRV 750kt', deployments: 'New Silovaya/Uzhur', nuclear: true },
            { name: 'Poseidon Torpedo', range: '10000km+', speed: '70 knots', warhead: '2Mt nuclear cobalt', deployments: 'Oscar-II submarines', nuclear: true },
        ],
        economy: { gdp: 2.1, gdpGrowth: 3.6, defenceBudget: 109, defencePct: 6.0, tradeExports: 530, tradeImports: 280, keyPartners: ['China', 'India', 'Turkey', 'UAE'], sanctionExposure: 'Extreme' },
        nuclear: { warheads: 6255, deployed: 1674, doctrine: 'Escalate to De-Escalate', triads: ['Land (RS-28 Sarmat)', 'Sea (Borei SSBN Bulava)', 'Air (Tu-160/Tu-95 bombs)'], alertLevel: 'High' }
    },
    Pakistan: {
        airforce: { combatAircraft: 430, j10ce: 36, f16block52: 76, jf17blockiii: 138, mirage: 180, drones: 100, awacs: 4 },
        army: { activeTroops: 654000, reserveTroops: 550000, tanks: 2400, artillery: 4472, rocketSystems: 120, apcs: 3000 },
        navy: { activePlatforms: 48, carriers: 0, frigates: 11, submarines: 5, patrolBoats: 19 },
        missiles: [
            { name: 'Shaheen-III MRBM', range: '2750km', speed: 'Mach 14', warhead: '1000kg', deployments: 'Road mobile', nuclear: true },
            { name: 'Nasr Tactical Nuke', range: '60km', speed: 'Mach 2', warhead: 'Sub-kiloton', deployments: '4+ launchers — BATTLEFIELD USE', nuclear: true },
            { name: 'Babur Cruise', range: '700km', speed: 'Mach 0.7', warhead: '450kg', deployments: 'Ground/ship', nuclear: true },
            { name: 'Ra\'ad ALCM', range: '350km', speed: 'Mach 0.9', warhead: '350kg', deployments: 'JF-17/Mirage launch', nuclear: true },
            { name: 'PL-15 BVR (on J-10CE)', range: '200km', speed: 'Mach 5', warhead: 'Fragmentation', deployments: 'J-10CE air-to-air', nuclear: false },
        ],
        economy: { gdp: 0.338, gdpGrowth: 2.4, defenceBudget: 7.5, defencePct: 3.8, tradeExports: 31, tradeImports: 55, keyPartners: ['China', 'UAE', 'Saudi Arabia', 'USA'], sanctionExposure: 'Medium' },
        nuclear: { warheads: 170, deployed: 100, doctrine: 'Full Spectrum Deterrence (first use)', triads: ['Land (Shaheen-III)', 'Air (Ra\'ad ALCM)', 'Sea (Babur naval)'], alertLevel: 'Elevated' }
    },
    Israel: {
        airforce: { combatAircraft: 340, f35iAdir: 50, f15iRaam: 25, f16barak: 240, heronDrones: 45, tankers: 4 },
        army: { activeTroops: 170000, reserveTroops: 465000, tanks: 2200, artillery: 5000, rocketSystems: 80, apcs: 10200 },
        navy: { activePlatforms: 65, carriers: 0, corvettes: 3, submarines: 6, patrolBoats: 45 },
        missiles: [
            { name: 'Jericho-III ICBM', range: '6500km', speed: 'Mach 20', warhead: '750kg nuclear (undeclared)', deployments: '50+ in hardened silos', nuclear: true },
            { name: 'Arrow-3 ABM', range: '2400km intercept', speed: 'Mach 9', warhead: 'Kinetic kill', deployments: '2 batteries (exo-atmo)', nuclear: false },
            { name: 'David\'s Sling', range: '300km', speed: 'Mach 7.5', warhead: 'Blast-fragmentation', deployments: '2 batteries (MRBM intercept)', nuclear: false },
            { name: 'Iron Dome', range: '70km', speed: 'Mach 10', warhead: 'Proximity fused', deployments: '10 batteries (90% kill rate)', nuclear: false },
            { name: 'Popeye Turbo ALCM', range: '480km', speed: 'Mach 0.8', warhead: '360kg nuclear capable', deployments: 'F-15I + Dolphin-class sub', nuclear: true },
        ],
        economy: { gdp: 0.52, gdpGrowth: 1.5, defenceBudget: 24, defencePct: 4.5, tradeExports: 145, tradeImports: 120, keyPartners: ['USA', 'EU', 'India', 'China'], sanctionExposure: 'None' },
        nuclear: { warheads: 90, deployed: 30, doctrine: 'Ambiguity / Samson Option', triads: ['Land (Jericho-III)', 'Air (F-15I Popeye ALCMs)', 'Sea (Dolphin sub cruise)'], alertLevel: 'Ambiguous' }
    },
    Iran: {
        airforce: { combatAircraft: 340, f14: 24, f4: 35, mig29: 20, su24: 30, shahed136Drones: 8000, shahed149: 12 },
        army: { activeTroops: 350000, irgc: 150000, proxyForces: 150000, tanks: 1650, artillery: 6000, rocketSystems: 300 },
        navy: { activePlatforms: 398, carriers: 0, frigates: 3, submarines: 29, fastAttackCraft: 100 },
        missiles: [
            { name: 'Fattah-1 Hypersonic', range: '1400km', speed: 'Mach 13-15', warhead: '500kg — UNSTOPPABLE', deployments: '12 known launchers', nuclear: false },
            { name: 'Shahab-3 MRBM', range: '2000km', speed: 'Mach 12', warhead: '760kg', deployments: '100+ missiles', nuclear: false },
            { name: 'Emad MaRV MRBM', range: '1700km', speed: 'Mach 12', warhead: '750kg precision', deployments: '40+ missiles', nuclear: false },
            { name: 'Shahed-136 Drone', range: '2000km', speed: '185 km/h', warhead: '40kg HEAT', deployments: 'THOUSANDS (proven in Ukraine)', nuclear: false },
            { name: 'Kheibar Shekan SRBM', range: '1450km', speed: 'Mach 8', warhead: '500kg — 30m CEP', deployments: 'Mobile solid-fuel', nuclear: false },
        ],
        economy: { gdp: 0.413, gdpGrowth: 5.0, defenceBudget: 10, defencePct: 2.5, tradeExports: 72, tradeImports: 55, keyPartners: ['China', 'Russia', 'Turkey', 'Iraq'], sanctionExposure: 'Extreme' },
        nuclear: { warheads: 0, deployed: 0, doctrine: 'Threshold State — 90%+ enriched uranium stockpile', triads: [], alertLevel: 'Pre-nuclear threshold' }
    },
    UK: {
        airforce: { combatAircraft: 195, f35b: 48, typhoon: 120, e3sentry: 5, tankers: 20, drones: 50 },
        army: { activeTroops: 75000, reserveTroops: 30000, tanks: 227, artillery: 400, rocketSystems: 90, apcs: 2000 },
        navy: { activePlatforms: 75, carriers: 2, destroyers: 6, frigates: 13, submarines: 11, ssbn: 4, patrolBoats: 20 },
        missiles: [
            { name: 'Trident-II D5 SLBM', range: '11000km', speed: 'Mach 24', warhead: '8 MIRV 100kt', deployments: '4 Vanguard SSBNs', nuclear: true },
            { name: 'Storm Shadow ALCM', range: '560km', speed: 'Mach 0.8', warhead: '450kg BROACH', deployments: 'Typhoon/F-35B', nuclear: false },
            { name: 'Brimstone 3', range: '60km', speed: 'Mach 2', warhead: 'Tandem HEAT', deployments: 'Typhoon (network-enabled)', nuclear: false },
            { name: 'Aster-30 Sea Viper', range: '120km', speed: 'Mach 4.5', warhead: 'Frag + kinetic', deployments: 'Type-45 destroyers', nuclear: false },
        ],
        economy: { gdp: 3.1, gdpGrowth: 0.4, defenceBudget: 74, defencePct: 2.5, tradeExports: 450, tradeImports: 700, keyPartners: ['USA', 'EU', 'India', 'China'], sanctionExposure: 'None' },
        nuclear: { warheads: 225, deployed: 40, doctrine: 'Sub-strategic deterrence + NATO', triads: ['Sea only (Vanguard SSBN Trident)'], alertLevel: 'Low' }
    },
};

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'airforce', label: 'Air Force', icon: <span style={{ fontSize: 14 }}>✈️</span> },
    { id: 'army', label: 'Army', icon: <span style={{ fontSize: 14 }}>⚔️</span> },
    { id: 'navy', label: 'Navy', icon: <Anchor size={13} /> },
    { id: 'missiles', label: 'Missiles', icon: <Crosshair size={13} /> },
    { id: 'economy', label: 'Economy', icon: <DollarSign size={13} /> },
    { id: 'nuclear', label: 'Nuclear', icon: <Radiation size={13} /> },
];

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = Math.ceil(value / 40);
        const timer = setInterval(() => {
            start = Math.min(start + step, value);
            setDisplay(start);
            if (start >= value) clearInterval(timer);
        }, 20);
        return () => clearInterval(timer);
    }, [value]);
    return <span>{display.toLocaleString()}{suffix}</span>;
}

function StatCard({ label, value, color = '#58a6ff' }: { label: string; value: React.ReactNode; color?: string }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
        </div>
    );
}

export default function CommandDashboard() {
    const { playerCountry, playerName, setShowCommandDashboard, activeConflict, setActiveConflict, setScenarioPhase, scenarioPhase, runCustomScenario, sendChatMessage } = useApp();
    const [activeTab, setActiveTab] = useState<Tab>('airforce');
    const [showScenarioCreator, setShowScenarioCreator] = useState(false);
    const [editingBase, setEditingBase] = useState<string | null>(null);
    const [baseEdits, setBaseEdits] = useState<Record<string, Record<string, number>>>({});
    const [expandedBase, setExpandedBase] = useState<string | null>(null);

    if (!playerCountry) return null;

    const fp = COUNTRY_FIREPOWER[playerCountry];
    const countryBases = COUNTRY_BASES[playerCountry] || [];
    if (!fp) return null;

    const renderTab = () => {
        switch (activeTab) {
            case 'airforce': {
                const af = fp.airforce;
                return (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                            <StatCard label="Combat Aircraft" value={<AnimatedNumber value={af.combatAircraft} />} />
                            <StatCard label="Helicopters" value={<AnimatedNumber value={af.helicopters || 0} />} color="#22c55e" />
                            <StatCard label="Drones/UAS" value={<AnimatedNumber value={af.drones || 0} />} color="#f97316" />
                            <StatCard label="Tankers" value={<AnimatedNumber value={af.tankers || 0} />} color="#bc8cff" />
                        </div>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Platform Breakdown</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {Object.entries(af).filter(([k]) => !['combatAircraft', 'helicopters', 'drones', 'tankers', 'awacs'].includes(k)).map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: '6px 12px' }}>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                            <div style={{ width: `${Math.min((Number(v) / af.combatAircraft) * 100, 100)}%`, height: '100%', background: '#58a6ff', borderRadius: 2 }} />
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: 'white', fontFamily: 'JetBrains Mono, monospace', minWidth: 40, textAlign: 'right' }}>{Number(v).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            case 'army': {
                const a = fp.army;
                return (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                            <StatCard label="Active Troops" value={<AnimatedNumber value={a.activeTroops} />} />
                            <StatCard label="Reserve" value={<AnimatedNumber value={a.reserveTroops || 0} />} color="#8b949e" />
                            <StatCard label="Main Battle Tanks" value={<AnimatedNumber value={a.tanks} />} color="#f97316" />
                            <StatCard label="Artillery Pieces" value={<AnimatedNumber value={a.artillery} />} color="#ef4444" />
                            <StatCard label="Rocket Systems" value={<AnimatedNumber value={a.rocketSystems || 0} />} color="#bc8cff" />
                            <StatCard label="APCs/IFVs" value={<AnimatedNumber value={a.apcs || 0} />} color="#22c55e" />
                        </div>
                    </div>
                );
            }
            case 'navy': {
                const n = fp.navy;
                return (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                            <StatCard label="Total Platforms" value={<AnimatedNumber value={n.activePlatforms} />} />
                            <StatCard label="Carriers" value={<AnimatedNumber value={n.carriers || 0} />} color="#ef4444" />
                            <StatCard label="Submarines" value={<AnimatedNumber value={n.submarines || 0} />} color="#f97316" />
                            <StatCard label="Destroyers" value={<AnimatedNumber value={n.destroyers || 0} />} color="#bc8cff" />
                            <StatCard label="Frigates" value={<AnimatedNumber value={n.frigates || 0} />} color="#22c55e" />
                            <StatCard label="SSBNs" value={<AnimatedNumber value={n.ssbn || 0} />} color="#ff4444" />
                            <StatCard label="Patrol Boats" value={<AnimatedNumber value={n.patrolBoats || 0} />} color="#8b949e" />
                            <StatCard label="Amphibious" value={<AnimatedNumber value={n.amphibiousShips || 0} />} color="#58a6ff" />
                        </div>
                    </div>
                );
            }
            case 'missiles': {
                const missiles = fp.missiles as any[];
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {missiles.map((m: any, i: number) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${m.nuclear ? 'rgba(248,81,73,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '12px 16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {m.nuclear && <span style={{ fontSize: 8, fontWeight: 900, background: 'rgba(248,81,73,0.2)', color: '#f85149', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>☢ NUCLEAR</span>}
                                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'white' }}>{m.name}</h4>
                                    </div>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace' }}>{m.deployments}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                    {[['Range', m.range, '#22c55e'], ['Speed', m.speed, '#58a6ff'], ['Warhead', m.warhead, '#f97316']].map(([l, v, c]) => (
                                        <div key={l as string} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '6px 10px' }}>
                                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{l}</div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: c as string, fontFamily: 'JetBrains Mono, monospace' }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }
            case 'economy': {
                const e = fp.economy;
                return (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                            <StatCard label="GDP (USD Trillion)" value={`$${e.gdp}T`} color="#22c55e" />
                            <StatCard label="GDP Growth" value={`${e.gdpGrowth}%`} color={e.gdpGrowth > 3 ? '#22c55e' : '#f97316'} />
                            <StatCard label="Defence Budget" value={`$${e.defenceBudget}B`} color="#58a6ff" />
                            <StatCard label="Defence % GDP" value={`${e.defencePct}%`} color="#bc8cff" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: '0.1em' }}>Top Trade Partners</div>
                                {e.keyPartners.map((p: string) => (
                                    <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{p}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: '0.1em' }}>Sanctions Exposure</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: e.sanctionExposure === 'None' ? '#22c55e' : e.sanctionExposure === 'Extreme' ? '#ef4444' : '#f97316' }}>
                                    {e.sanctionExposure}
                                </div>
                                <div style={{ marginTop: 12, fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Exports / Imports</div>
                                <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>${e.tradeExports}B / ${e.tradeImports}B</div>
                            </div>
                        </div>
                    </div>
                );
            }
            case 'nuclear': {
                const n = fp.nuclear;
                return (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                            <StatCard label="Total Warheads" value={<AnimatedNumber value={n.warheads} />} color="#ef4444" />
                            <StatCard label="Deployed" value={<AnimatedNumber value={n.deployed} />} color="#f97316" />
                            <StatCard label="Alert Level" value={n.alertLevel} color={n.alertLevel === 'Low' ? '#22c55e' : '#f97316'} />
                        </div>
                        <div style={{ background: 'rgba(248,81,73,0.05)', border: '1px solid rgba(248,81,73,0.15)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                            <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(248,81,73,0.6)', letterSpacing: '0.1em', marginBottom: 8 }}>Nuclear Doctrine</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{n.doctrine}</div>
                        </div>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: '0.1em' }}>Delivery Triads</div>
                        {n.triads.map((t: string, i: number) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ fontSize: 11, color: '#f85149' }}>☢</span>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{t}</span>
                            </div>
                        ))}
                    </div>
                );
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)'
            }}
        >
            <div style={{
                width: '90vw', maxWidth: 1100, maxHeight: '90vh',
                background: 'linear-gradient(135deg, rgba(10,14,20,0.99) 0%, rgba(8,11,18,0.99) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 40px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(88,166,255,0.05)'
            }}>
                {/* Header */}
                <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
                        <div>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                {playerCountry} Command Center
                            </h2>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Operator: {playerName} · Clearance: ULTRA
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {scenarioPhase === 'inactive' && (
                            <button
                                onClick={() => setShowScenarioCreator(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, color: '#ef4444', fontSize: 11, fontWeight: 800, padding: '8px 14px', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                            >
                                <Zap size={12} /> Create Scenario
                            </button>
                        )}
                        <button onClick={() => setShowCommandDashboard(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '12px 8px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.15s',
                                background: activeTab === t.id ? 'rgba(88,166,255,0.08)' : 'transparent',
                                color: activeTab === t.id ? '#58a6ff' : 'rgba(255,255,255,0.3)',
                                borderBottom: activeTab === t.id ? '2px solid #58a6ff' : '2px solid transparent',
                            }}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                            {renderTab()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bases Section */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 24px', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)' }}>
                            Active Installations ({countryBases.length})
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {countryBases.map(base => (
                            <div key={base.id}
                                onClick={() => setExpandedBase(expandedBase === base.id ? null : base.id)}
                                style={{
                                    background: expandedBase === base.id ? 'rgba(88,166,255,0.08)' : 'rgba(255,255,255,0.03)',
                                    border: expandedBase === base.id ? '1px solid #58a6ff' : '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', transition: 'all 0.15s'
                                }}
                            >
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                                    {base.type === 'air' ? '✈️' : base.type === 'naval' ? '🚢' : base.type === 'army' || base.type === 'hq' ? '⚔️' : base.type === 'missile' ? '🚀' : base.type === 'nuclear' ? '☢️' : '🏛️'} {base.shortName}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scenario Creator Modal */}
            <AnimatePresence>
                {showScenarioCreator && (
                    <ScenarioCreator
                        playerCountry={playerCountry}
                        onClose={() => setShowScenarioCreator(false)}
                        onLaunch={(conflict) => {
                            setActiveConflict(conflict);
                            setScenarioPhase('active');
                            // Align map and overlays with the custom scenario
                            runCustomScenario(conflict.attacker, conflict.defender, conflict.year);
                            // Commander guidance prompt
                            sendChatMessage(`We have initiated a scenario: ${conflict.attacker} vs ${conflict.defender} in ${conflict.year}. Provide a step-by-step operational plan (3-5 steps), expected enemy reaction, and escalation risks.`);
                            setShowScenarioCreator(false);
                            setShowCommandDashboard(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Scenario Creator ────────────────────────────────────────────────────────

const COUNTRIES = ['USA', 'Russia', 'China', 'India', 'Pakistan', 'Israel', 'Iran', 'UK', 'France', 'Taiwan', 'Saudi Arabia', 'Turkey', 'North Korea', 'Ukraine'];
const CASUS_BELLI = ['Full Scale Invasion', 'Border Incursion', 'Proxy War', 'Naval Blockade', 'Nuclear Deterrence', 'Economic Warfare', 'Covert Operations', 'Preemptive Strike'];

function ScenarioCreator({ playerCountry, onClose, onLaunch }: {
    playerCountry: string;
    onClose: () => void;
    onLaunch: (c: { attacker: string; defender: string; year: number; casusBelli: string }) => void;
}) {
    const [opponent, setOpponent] = useState('Pakistan');
    const [year, setYear] = useState(2027);
    const [casusBelli, setCasusBelli] = useState('Full Scale Invasion');
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiAnswer, setAiAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    const opposingCountries = COUNTRIES.filter(c => c !== playerCountry);

    const askAI = async () => {
        if (!aiAnswer.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'user', content: `I am the head of ${playerCountry}. I want to ${casusBelli.toLowerCase()} against ${opponent} in ${year}. My reason: ${aiAnswer}. As a military strategist, briefly assess the strategic rationale (2-3 sentences max).` }
                    ]
                })
            });
            const data = await res.json();
            setAiQuestion(data.response || '');
        } catch {
            setAiQuestion('Strategic assessment: Your scenario parameters have been logged.');
        }
        setLoading(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.8)'
            }}
        >
            <div style={{
                width: 580, background: 'linear-gradient(135deg, rgba(10,14,20,0.99) 0%, rgba(8,11,18,0.99) 100%)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 32,
                boxShadow: '0 40px 80px rgba(0,0,0,0.9), 0 0 40px rgba(239,68,68,0.06)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Create War Scenario</h3>
                        <div style={{ fontSize: 10, color: 'rgba(239,68,68,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                            ⚠️ Classified — Command HQ Only
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px 12px' }}><X size={16} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Attacker / Defender */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>⚔️ Attacker (YOU)</div>
                            <div style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#58a6ff' }}>{playerCountry}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>🛡️ Opponent (AI)</div>
                            <select
                                value={opponent}
                                onChange={e => setOpponent(e.target.value)}
                                style={{ width: '100%', background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '10px 14px', fontSize: 12, cursor: 'pointer', outline: 'none' }}
                            >
                                {opposingCountries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Casus Belli */}
                    <div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>📋 Casus Belli</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                            {CASUS_BELLI.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setCasusBelli(c)}
                                    style={{
                                        background: casusBelli === c ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${casusBelli === c ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.06)'}`,
                                        borderRadius: 6, padding: '6px 4px', color: casusBelli === c ? '#ef4444' : 'rgba(255,255,255,0.4)',
                                        fontSize: 9, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em'
                                    }}
                                >{c}</button>
                            ))}
                        </div>
                    </div>

                    {/* Year */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>📅 Year of Conflict</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: '#58a6ff', fontFamily: 'JetBrains Mono, monospace' }}>{year}</div>
                        </div>
                        <input type="range" min={2025} max={2040} value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: '100%' }} className="year-slider" />
                    </div>

                    {/* AI Rationale */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>🤖 Why this conflict? (briefing for AI advisor)</div>
                        <input
                            type="text"
                            value={aiAnswer}
                            onChange={e => setAiAnswer(e.target.value)}
                            placeholder={`e.g. "China invades Taiwan simultaneously, Pakistan opens second front..."`}
                            onKeyDown={e => e.key === 'Enter' && askAI()}
                            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 11, boxSizing: 'border-box' }}
                        />
                        {aiQuestion && (
                            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(88,166,255,0.08)', borderRadius: 6, borderLeft: '2px solid #58a6ff', fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                                <span style={{ color: '#58a6ff', fontWeight: 700 }}>WARGAME-AI: </span>
                                {loading ? 'Analysing scenario...' : aiQuestion}
                            </div>
                        )}
                    </div>

                    {/* Launch */}
                    <button
                        onClick={() => onLaunch({ attacker: playerCountry, defender: opponent, year, casusBelli })}
                        style={{
                            width: '100%', padding: '14px', borderRadius: 10, cursor: 'pointer',
                            background: 'linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(248,81,73,0.2) 100%)',
                            border: '1px solid rgba(239,68,68,0.6)', color: '#ef4444', fontSize: 13, fontWeight: 900,
                            textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                        }}
                    >
                        <Zap size={16} /> Launch Scenario — {playerCountry} vs {opponent} ({year})
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
