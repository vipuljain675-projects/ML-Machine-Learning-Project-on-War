'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { SEARCH_INDEX, SearchResult, BaseType } from '../data/militaryBases';

function getTypeIcon(type: BaseType | 'country'): string {
    switch (type) {
        case 'naval': return '⚓';
        case 'air': return '✈';
        case 'army': return '⬛';
        case 'missile': return '🚀';
        case 'drone': return '🛸';
        case 'hq': return '★';
        case 'country': return '🌍';
        default: return '📍';
    }
}

function getTypeColor(type: BaseType | 'country'): string {
    switch (type) {
        case 'naval': return '#1d4ed8';
        case 'air': return '#0891b2';
        case 'army': return '#15803d';
        case 'missile': return '#b45309';
        case 'drone': return '#7c3aed';
        case 'hq': return '#b91c1c';
        case 'country': return '#374151';
        default: return '#6b7280';
    }
}

// Inner component that uses useMap() hook — must be inside <MapContainer>
export default function MapSearchBar() {
    const map = useMap();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter search index on query change
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setOpen(false);
            return;
        }
        const q = query.toLowerCase();
        const filtered = SEARCH_INDEX.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.shortName.toLowerCase().includes(q) ||
            r.operator.toLowerCase().includes(q)
        ).slice(0, 10);
        setResults(filtered);
        setOpen(filtered.length > 0);
        setHighlighted(0);
    }, [query]);

    function flyTo(result: SearchResult) {
        map.flyTo(result.coords, result.zoom, { duration: 1.8 });
        setQuery(result.shortName);
        setOpen(false);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted(h => Math.min(h + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted(h => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[highlighted]) flyTo(results[highlighted]);
        } else if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
        }
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Prevent map zoom/drag when interacting with search
    useEffect(() => {
        const el = inputRef.current?.closest('.map-search-wrapper') as HTMLElement | null;
        if (!el) return;
        const stop = (e: Event) => e.stopPropagation();
        el.addEventListener('mousedown', stop);
        el.addEventListener('wheel', stop);
        return () => {
            el.removeEventListener('mousedown', stop);
            el.removeEventListener('wheel', stop);
        };
    }, []);

    return (
        <div
            className="map-search-wrapper"
            style={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                width: 380,
                // Ensure it sits above scenario banner (which is also centered)
                marginTop: 0,
            }}
        >
            {/* Search input */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(254,252,232,0.98)',
                border: '2px solid #b45309',
                borderRadius: open ? '8px 8px 0 0' : 8,
                padding: '8px 14px',
                gap: 10,
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                fontFamily: 'monospace',
            }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔍</span>
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query && results.length > 0 && setOpen(true)}
                    placeholder="Search base, country, city…  (Kadena, Yokosuka, Iran…)"
                    style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        color: '#1c1917',
                        fontWeight: 600,
                    }}
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: 16, lineHeight: 1, padding: 0 }}
                    >✕</button>
                )}
            </div>

            {/* Dropdown */}
            {open && results.length > 0 && (
                <div
                    ref={dropdownRef}
                    style={{
                        background: 'rgba(254,252,232,0.99)',
                        border: '2px solid #b45309',
                        borderTop: '1px solid #d97706',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                        maxHeight: 360,
                        overflowY: 'auto',
                    }}
                >
                    {results.map((r, i) => {
                        const icon = getTypeIcon(r.type);
                        const color = getTypeColor(r.type);
                        return (
                            <div
                                key={r.id}
                                onClick={() => flyTo(r)}
                                onMouseEnter={() => setHighlighted(i)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '9px 14px',
                                    cursor: 'pointer',
                                    background: highlighted === i ? 'rgba(217,119,6,0.12)' : 'transparent',
                                    borderBottom: i < results.length - 1 ? '1px solid rgba(180,83,9,0.12)' : 'none',
                                    fontFamily: 'monospace',
                                }}
                            >
                                {/* Type badge */}
                                <div style={{
                                    width: 28, height: 28,
                                    borderRadius: 4,
                                    background: `${color}18`,
                                    border: `1.5px solid ${color}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, flexShrink: 0,
                                }}>
                                    {icon}
                                </div>
                                {/* Text */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#1c1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {r.operatorFlag} {r.name}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#78350f', fontWeight: 600 }}>
                                        {r.operator} · {r.type.toUpperCase()}
                                    </div>
                                </div>
                                {/* Arrow */}
                                <span style={{ color: '#b45309', fontSize: 12, flexShrink: 0 }}>→</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
