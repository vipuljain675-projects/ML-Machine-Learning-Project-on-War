import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { FileWarning, Skull, Clock, Target, ShieldAlert, X } from 'lucide-react';

export default function AdvisorPanel() {
    const { simulationResults, setSimulationResults } = useApp();
    const [briefing, setBriefing] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!simulationResults) return;

        const fetchBriefing = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/advisor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(simulationResults)
                });
                const data = await res.json();
                setBriefing(data.briefing);
            } catch (e) {
                console.error(e);
                setBriefing('COMMUNICATIONS FAILURE: Unable to reach AI Strategic Core.');
            } finally {
                setLoading(false);
            }
        };

        fetchBriefing();
    }, [simulationResults]);

    if (!simulationResults) return null;

    const res = simulationResults;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl z-[500] mb-4"
            >
                <div className="bg-[#0a0a0a]/95 border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden font-mono text-white flex flex-col max-h-[70vh]">

                    {/* HEADER */}
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-900/40 to-transparent border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={18} className="text-red-500" />
                            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">AFTER ACTION REPORT / ADVISOR BRIEFING</h2>
                        </div>
                        <button
                            onClick={() => setSimulationResults(null)}
                            className="text-white/50 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1 overflow-hidden">

                        {/* LEFT: ML RAW STATS */}
                        <div className="col-span-1 border-r border-white/10 p-5 overflow-y-auto bg-black/40">
                            <h3 className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-4">ML Engine Telemetry</h3>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] text-white/40 uppercase mb-1">Predicted Outcome</div>
                                    <div className={`text-2xl font-black uppercase tracking-wider ${res.outcome === 'WIN' ? 'text-green-500' : res.outcome === 'LOSS' ? 'text-red-500' : 'text-yellow-500'
                                        }`}>
                                        {res.outcome}
                                    </div>
                                    <div className="flex gap-2 text-[10px] text-white/60 mt-1">
                                        <span>W: {res.outcome_probabilities?.WIN || 0}%</span>
                                        <span>L: {res.outcome_probabilities?.LOSS || 0}%</span>
                                    </div>
                                </div>

                                <div className="border border-white/5 rounded p-3 bg-white/[0.02]">
                                    <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase mb-1"><Clock size={12} /> Duration</div>
                                    <div className="text-lg font-bold">{res.estimated_duration_days} Days</div>
                                </div>

                                <div className="border border-white/5 rounded p-3 bg-white/[0.02]">
                                    <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase mb-1"><Skull size={12} /> Force Attrition</div>
                                    <div className="text-lg font-bold text-orange-500">{res.attrition_percent}%</div>
                                </div>

                                <div className="border border-white/5 rounded p-3 bg-white/[0.02]">
                                    <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase mb-1"><FileWarning size={12} /> Escalation Risk</div>
                                    <div className="text-sm font-bold uppercase text-red-400">{res.escalation_risk}</div>
                                </div>

                                <div>
                                    <div className="text-[10px] text-white/40 uppercase mb-2">Top Recommended Bases (ML)</div>
                                    <div className="space-y-2">
                                        {res.top_bases?.slice(0, 3).map((b: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[10px] bg-blue-900/10 p-2 rounded border border-blue-500/20">
                                                <span className="truncate w-3/4">{b.base}</span>
                                                <span className="text-blue-400 font-bold">{(b.priority_score * 100).toFixed(0)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: GROQ NARRATIVE */}
                        <div className="col-span-2 p-6 overflow-y-auto">
                            <h3 className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Target size={14} /> Strategic Commander's Briefing
                            </h3>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-40 opacity-50 space-y-4">
                                    <div className="w-8 h-8 border-2 border-t-blue-500 rounded-full animate-spin" />
                                    <div className="text-xs uppercase tracking-widest animate-pulse">Generating Briefing from Groq...</div>
                                </div>
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed">
                                    {briefing.split('\n').map((para, idx) => (
                                        <p key={idx}>{para}</p>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
