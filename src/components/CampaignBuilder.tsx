import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Play, Activity, ShieldAlert, Crosshair } from 'lucide-react';

export default function CampaignBuilder() {
    const { playerCountry, campaignPlan, setSimulationResults } = useApp();
    const [isOpen, setIsOpen] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);

    const [config, setConfig] = useState({
        escalation_posture: 1, // 0: low, 1: calibrated, 2: full
        surprise_factor: 60,
        doctrine_id: 1, // 0: cold start, 1: surgical, 2: air_land, etc.
        air_force_readiness: 85,
        army_readiness: 80,
    });

    if (!playerCountry) return null;

    const handleSimulate = async () => {
        if (!campaignPlan.target || campaignPlan.activeBases.length === 0) {
            alert('Select at least one base and right-click to set a target on the map.');
            return;
        }

        setIsSimulating(true);
        try {
            // Predict adversary based on target location simply (for prototype)
            // In a real app we'd map coords to specific country poly regions
            const adversary = playerCountry === 'India' ? 'Pakistan' : 'Russia';

            const res = await fetch('/api/simulate-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenario: `${playerCountry.toLowerCase()}_${adversary.toLowerCase()}`,
                    player_country: playerCountry,
                    adversary_country: adversary,
                    active_bases: campaignPlan.activeBases,
                    ...config
                })
            });
            const data = await res.json();
            setSimulationResults(data);
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
                    className="absolute top-20 right-4 w-80 bg-black/90 border border-white/10 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden z-[400]"
                >
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-red-500/20 to-transparent flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Crosshair size={18} className="text-red-400" />
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">STRATEGIC COMMAND</h2>
                        </div>
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
                                <label className="text-xs text-white/60 uppercase block mb-1">Escalation Posture</label>
                                <select
                                    className="w-full bg-[#111] border border-white/10 text-white text-xs p-2 rounded"
                                    value={config.escalation_posture}
                                    onChange={e => setConfig({ ...config, escalation_posture: Number(e.target.value) })}
                                >
                                    <option value={0}>Low (Limited Skirmish)</option>
                                    <option value={1}>Calibrated (Conventional)</option>
                                    <option value={2}>Full Scale (Total War)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-white/60 uppercase flex justify-between mb-1">
                                    <span>Surprise Factor</span>
                                    <span>{config.surprise_factor}%</span>
                                </label>
                                <input
                                    type="range" min="10" max="100"
                                    className="w-full accent-red-500"
                                    value={config.surprise_factor}
                                    onChange={e => setConfig({ ...config, surprise_factor: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="text-xs text-white/60 uppercase flex justify-between mb-1">
                                    <span>Air Force Readiness</span>
                                    <span>{config.air_force_readiness}%</span>
                                </label>
                                <input
                                    type="range" min="10" max="100"
                                    className="w-full accent-blue-500"
                                    value={config.air_force_readiness}
                                    onChange={e => setConfig({ ...config, air_force_readiness: Number(e.target.value) })}
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
