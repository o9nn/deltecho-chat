import React, { useState, useMemo } from 'react';
import { Atom } from '@deltecho/cognitive';
import './MemoryBrowser.css';

export interface MemoryBrowserProps {
    atoms: Atom[];
    onSelectAtom?: (atom: Atom) => void;
    className?: string;
}

export const MemoryBrowser: React.FC<MemoryBrowserProps> = ({
    atoms,
    onSelectAtom,
    className = ''
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const filteredAtoms = useMemo(() => {
        if (!searchTerm) return atoms;
        const lower = searchTerm.toLowerCase();
        return atoms.filter(a =>
            a.name.toLowerCase().includes(lower) ||
            a.type.toLowerCase().includes(lower) ||
            a.id.includes(lower)
        );
    }, [atoms, searchTerm]);

    const handleSelect = (atom: Atom) => {
        setSelectedId(atom.id);
        onSelectAtom?.(atom);
    };

    return (
        <div className={`dte-memory-browser ${className}`}>
            <div className="dte-memory-toolbar">
                <input
                    type="text"
                    className="dte-search-input"
                    placeholder="Search AtomSpace..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="dte-memory-list">
                {filteredAtoms.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#909296' }}>
                        No atoms found.
                    </div>
                ) : (
                    filteredAtoms.map(atom => (
                        <div
                            key={atom.id}
                            className={`dte-atom-card ${selectedId === atom.id ? 'selected' : ''}`}
                            onClick={() => handleSelect(atom)}
                        >
                            <div className="dte-atom-header">
                                <span className="dte-atom-name">{atom.name}</span>
                                <span className="dte-atom-type">{atom.type}</span>
                            </div>
                            <div className="dte-atom-meta">
                                <span>TV: {atom.truthValue.toFixed(2)}</span>
                                <span>Conf: {atom.confidence.toFixed(2)}</span>
                                <span>ID: {atom.id.substring(0, 8)}...</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
