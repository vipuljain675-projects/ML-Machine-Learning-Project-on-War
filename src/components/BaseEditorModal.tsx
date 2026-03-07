import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';

interface BaseEditorModalProps {
    coords: [number, number];
    existingBase?: any;
    onClose: () => void;
    onSave: (baseInfo: any) => void;
}

export default function BaseEditorModal({ coords, existingBase, onClose, onSave }: BaseEditorModalProps) {
    const { playerCountry } = useApp();
    const [name, setName] = useState(existingBase?.name || existingBase?.shortName || `FOB Alpha ${Math.floor(Math.random() * 1000)}`);
    const [type, setType] = useState(existingBase?.type || 'air');

    // Attempt to extract jets and personnel from existing assets if available
    const initialJets = existingBase?.assets?.find((a: string) => a.includes('Fighter') || a.includes('Jet') || a.includes('Combat Aircraft'))?.match(/\d+/)?.[0] || 24;
    const initialPersonnel = existingBase?.personnel || existingBase?.assets?.find((a: string) => a.includes('Personnel'))?.match(/\d+/)?.[0] || 1500;

    const [jets, setJets] = useState(Number(initialJets));
    const [personnel, setPersonnel] = useState(Number(initialPersonnel));

    const handleSave = () => {
        const id = existingBase?.id || name.toLowerCase().replace(/\s+/g, '_');
        const newBase = {
            id,
            name,
            shortName: name, // Ensure both exist for compatibility
            country: existingBase?.country || playerCountry || 'Unknown',
            operator: existingBase?.operator || playerCountry || 'Unknown',
            type,
            lat: coords[0],
            lng: coords[1],
            personnel,
            assets: [
                `${jets} Multi-role Fighters`,
                `${personnel} Stationed Personnel`,
                'Patriot PAC-3 Air Defense'
            ]
        };
        onSave(newBase);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#111] border border-white/20 p-6 rounded-xl w-full max-w-sm shadow-2xl relative"
            >
                <div className="absolute top-4 right-4 text-xs text-white/30 font-mono">
                    [{coords[0].toFixed(2)}, {coords[1].toFixed(2)}]
                </div>

                <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-6 border-b border-white/10 pb-2">
                    <span className="text-blue-500 mr-2">✦</span>
                    {existingBase ? 'Update Base' : 'Establish Base'}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs uppercase text-white/50 block mb-1">Designation</label>
                        <input
                            className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white"
                            value={name} onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs uppercase text-white/50 block mb-1">Facility Type</label>
                        <select
                            className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white"
                            value={type} onChange={e => setType(e.target.value)}
                        >
                            <option value="air">Air Base</option>
                            <option value="naval">Naval Port</option>
                            <option value="army">Army Garrison</option>
                            <option value="missile">Missile Silo</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs uppercase text-white/50 block mb-1">Combat Jets</label>
                            <input
                                type="number"
                                className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white focus:border-red-500"
                                value={jets} onChange={e => setJets(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-white/50 block mb-1">Personnel Limit</label>
                            <input
                                type="number"
                                className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white focus:border-blue-500"
                                value={personnel} onChange={e => setPersonnel(Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded bg-white/5 hover:bg-white/10 text-white/70 text-sm uppercase tracking-wider transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
                    >
                        {existingBase ? 'Update' : 'Deploy'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
