import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { COUNTRY_BASES } from '../data/countryBases';
import { GLOBAL_MILITARY_BASES } from '../data/militaryBases';
import { Play, Activity, ShieldAlert, Crosshair } from 'lucide-react';

export default function CampaignBuilder() {
    const { playerCountry, campaignPlan, setSimulationResults, sendChatMessage, triggerOpponentTurn, destroyBase } = useApp();
    const [isOpen, setIsOpen] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);

    const [config, setConfig] = useState({
        escalation_posture: 1, // 0: low, 1: calibrated, 2: full
        surprise_factor: 60,
        doctrine_id: 1, // 0: cold start, 1: surgical, 2: air_land, etc.
        air_force_readiness: 85,
        army_readiness: 80,
        assetType: 'Fighter Jets',
        quantity: 24,
    });

    if (!playerCountry || !campaignPlan.target) return null;

    const calculateBaseStrength = () => {
        let totalJets = 0, totalMen = 0, totalTanks = 0, totalShips = 0, totalMissiles = 0;
        let avgBrilliance = 0;
        let countedBases = 0;

        const allBases: any[] = [...Object.values(COUNTRY_BASES).flat(), ...GLOBAL_MILITARY_BASES];

        campaignPlan.activeBases.forEach(baseId => {
            const base = allBases.find(b => b.id === baseId);
            if (base) {
                if (base.strength) {
                    // CountryBase format
                    totalJets += base.strength.jets || 0;
                    totalMen += base.strength.men || 0;
                    totalTanks += base.strength.tanks || 0;
                    totalShips += base.strength.ships || 0;
                    totalMissiles += (base.strength.missiles?.length || 0) * 10;
                    avgBrilliance += base.strength.tacticalBrillianceRating || 5;
                } else if (base.assets) {
                    // MilitaryBaseData format
                    // Rough estimation based on asset length
                    totalJets += base.assets.filter((a: string) => a.toLowerCase().includes('f-') || a.toLowerCase().includes('su-') || a.toLowerCase().includes('mig-')).length * 24;
                    totalShips += base.assets.filter((a: string) => a.toLowerCase().includes('uss ') || a.toLowerCase().includes('class') || a.toLowerCase().includes('ship') || a.toLowerCase().includes('destroyer')).length * 5;
                    totalMissiles += base.assets.filter((a: string) => a.toLowerCase().includes('missile') || a.toLowerCase().includes('bomb')).length * 20;

                    if (typeof base.personnel === 'string') {
                        const parsed = parseInt(base.personnel.replace(/,/g, ''), 10);
                        if (!isNaN(parsed)) totalMen += parsed;
                    } else if (typeof base.personnel === 'number') {
                        totalMen += base.personnel;
                    }

                    avgBrilliance += 7; // default for major global bases
                }
                countedBases++;
            }
        });

        if (countedBases > 0) avgBrilliance /= countedBases;

        const calcAir = Math.min(100, Math.max(30, (totalJets / 100) * 100));
        const calcArmy = Math.min(100, Math.max(30, (totalMen / 50000) * 100));
        const calcNavy = Math.min(100, Math.max(30, (totalShips / 30) * 100));
        const calcMissile = Math.min(100, Math.max(30, (totalMissiles / 50) * 100));

        return {
            air_force_readiness: Math.round(calcAir),
            army_readiness: Math.round(calcArmy),
            navy_readiness: Math.round(calcNavy),
            missile_readiness: Math.round(calcMissile),
            intel_grade: Math.round(avgBrilliance * 10),
        };
    };

    const handleSimulate = async () => {
        if (!campaignPlan.target || campaignPlan.activeBases.length === 0) {
            alert('Select at least one base and right-click to set a target on the map.');
            return;
        }

        setIsSimulating(true);
        try {
            const adversary = playerCountry === 'India' ? 'Pakistan' : 'Russia';

            const calculatedStrengths = calculateBaseStrength();

            const res = await fetch('/api/simulate-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenario: `${playerCountry.toLowerCase()}_${adversary.toLowerCase()}`,
                    player_country: playerCountry,
                    adversary_country: adversary,
                    active_bases: campaignPlan.activeBases,
                    ...config,
                    // Override default config with calculated strengths based on selected bases
                    ...calculatedStrengths
                })
            });
            const data = await res.json();
            setSimulationResults(data);

            // Trigger the AI Battle Report
            sendChatMessage(`[SYSTEM LOG]: Commander executed strike on coordinates [${campaignPlan.target[0].toFixed(2)}, ${campaignPlan.target[1].toFixed(2)}] using ${config.quantity} ${config.assetType}. Escalation Posture: ${config.escalation_posture}. Provide an immediate and detailed Battle Damage Assessment (BDA) report and strategic fallout analysis.`);
            // Trigger opponent AI turn
            triggerOpponentTurn(`Player executed ${config.assetType} strike with ${config.quantity} units`);
            // Mark nearest enemy base at target as destroyed (visual feedback)
            try {
                const allBases = [...Object.values(COUNTRY_BASES).flat(), ...GLOBAL_MILITARY_BASES];
                const target = campaignPlan.target!;
                let nearest: { id: string; country: string; d: number } | null = null;
                for (const b of allBases) {
                    const [lat, lng] = b.coords as [number, number];
                    const d = Math.hypot(lat - target[0], lng - target[1]);
                    if (!nearest || d < nearest.d) nearest = { id: b.id, country: b.country, d };
                }
                if (nearest && nearest.d < 1.0) { // ~<1 deg proximity
                    destroyBase(nearest.id);
                }
            } catch { }

            // Clear target after launch so it feels "done"
            // We do not clear it if we want the user to see exactly what they hit, but clearing is cleaner.

        } catch (e) {
            console.error(e);
            alert('Simulation Engine disconnected.');
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    className="absolute top-24 right-4 w-80 bg-black/90 border border-white/10 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden z-[400]"
                >
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-red-500/20 to-transparent flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Crosshair size={18} className="text-red-400" />
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">STRATEGIC COMMAND</h2>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/40 hover:text-white transition cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        <div>
                            <div className="flex justify-between text-xs text-white/60 mb-1 uppercase">
                                <span>Active Launch Bases</span>
                                <span>{campaignPlan.activeBases.length}</span>
                            </div>
                            <div className="flex justify-between text-xs text-red-400 mb-2 uppercase">
                                <span>Target Coordinates</span>
                                <span>{campaignPlan.target ? `${campaignPlan.target[0].toFixed(2)}, ${campaignPlan.target[1].toFixed(2)}` : 'None defined'}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-white/60 uppercase block mb-1">Asset Allocation</label>
                                <select
                                    className="w-full bg-[#111] border border-white/10 text-white text-xs p-2 rounded"
                                    value={config.assetType}
                                    onChange={e => setConfig({ ...config, assetType: e.target.value })}
                                >
                                    <option value="Fighter Jets">Fighter Jets</option>
                                    <option value="Stealth Bombers">Stealth Bombers</option>
                                    <option value="Drone Swarm">UCAV Drone Swarm</option>
                                    <option value="Cruise Missiles">Cruise Missiles</option>
                                    <option value="Ground Assault Brigade">Ground Assault Brigade</option>
                                    <option value="Naval Strike Group">Naval Strike Group</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-white/60 uppercase flex justify-between mb-1">
                                    <span>Quantity / Force Size</span>
                                    <span className="text-red-400 font-bold">{config.quantity} units</span>
                                </label>
                                <input
                                    type="range" min="1" max="150"
                                    className="w-full accent-red-500"
                                    value={config.quantity}
                                    onChange={e => setConfig({ ...config, quantity: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSimulate}
                            disabled={isSimulating}
                            className={`w-full mt-4 py-3 rounded-lg font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${campaignPlan.target && campaignPlan.activeBases.length > 0
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {isSimulating ? (
                                <>
                                    <Activity className="animate-pulse" size={16} />
                                    <span>Simulating ML Outcome...</span>
                                </>
                            ) : (
                                <>
                                    <Play size={16} />
                                    <span>Execute Campaign</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
