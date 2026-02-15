import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Arena, EnvironmentType } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, CheckCircle2, X, Search, Map, Cloud, Zap, Droplets, Mountain, Skull, Globe, Leaf, Wind } from 'lucide-react';

interface ArenaSelectorProps {
    arenas: Arena[];
    selectedArenaIds: string[];
    onChange: (ids: string[]) => void;
    className?: string;
}

// Helper to get icon for environment
const getEnvironmentIcon = (type: EnvironmentType) => {
    switch (type) {
        case 'Volcanic': return <Map size={12} className="text-red-400" />;
        case 'Aquatic': return <Droplets size={12} className="text-blue-400" />;
        case 'Storm': return <Zap size={12} className="text-yellow-400" />;
        case 'Earth': return <Leaf size={12} className="text-green-400" />;
        case 'Holy': return <Globe size={12} className="text-yellow-200" />;
        case 'Dark': return <Skull size={12} className="text-purple-400" />;
        default: return <Map size={12} className="text-zinc-400" />;
    }
};

export function ArenaSelector({ arenas, selectedArenaIds, onChange, className }: ArenaSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    // Categories could be dynamic, for now let's use Environment or Folder if available
    // The user's reference showed "Rotation", maybe we can infer or just list all for now if no clear grouping.
    // However, the reference HTML had categories. Let's group by "Environment" as a fallback for rich grouping.
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['All']);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const filteredArenas = useMemo(() => {
        if (!search.trim()) return arenas;
        return arenas.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    }, [arenas, search]);

    // Grouping Logic
    // Group by Folder (as requested)
    const groupedArenas = useMemo(() => {
        const groups: Record<string, Arena[]> = {};
        
        filteredArenas.forEach(arena => {
            const key = arena.folder || 'Uncategorized'; // Use Folder as primary grouping
            if (!groups[key]) groups[key] = [];
            groups[key].push(arena);
        });

        return groups;
    }, [filteredArenas]);

    const categories = Object.keys(groupedArenas).sort();

    // Initialize expanded categories only once or when search changes significantly
    // But to avoid infinite loops or re-renders, let's just use an effect that runs when grouped keys change length significantly
    // Actually, simpler approach: just initialize state with empty and let user expand, or expand all on mount.
    // Let's remove the useMemo side-effect and just use useEffect
    React.useEffect(() => {
        if (categories.length > 0 && expandedCategories.length === 0 && !search) {
             // Initial load: expand all if few, or just first
             if (categories.length <= 5) setExpandedCategories(categories);
             else setExpandedCategories([categories[0]]);
        } else if (search) {
            // If searching, expand all to show results
            setExpandedCategories(categories);
        }
    }, [categories.length, search]);

    const toggleSelection = (id: string) => {
        if (selectedArenaIds.includes(id)) {
            onChange(selectedArenaIds.filter(aid => aid !== id));
        } else {
            onChange([...selectedArenaIds, id]);
        }
    };

    const toggleCategory = (cat: string) => {
        if (expandedCategories.includes(cat)) {
            setExpandedCategories(expandedCategories.filter(c => c !== cat));
        } else {
            setExpandedCategories([...expandedCategories, cat]);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <div 
                onClick={() => setIsOpen(true)} 
                className={cn("w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white flex items-center justify-between cursor-pointer hover:border-zinc-600 transition-colors", className)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Map size={18} className="text-zinc-500 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                        {selectedArenaIds.length > 0 ? (
                            selectedArenaIds.slice(0, 3).map(id => {
                                const arena = arenas.find(a => a.id === id);
                                return (
                                    <span key={id} className="text-xs bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                                        {arena?.name || id}
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-zinc-500">Select Arenas...</span>
                        )}
                        {selectedArenaIds.length > 3 && (
                            <span className="text-xs bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded-full text-zinc-400">
                                +{selectedArenaIds.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
                <ChevronDown size={16} className="text-zinc-500" />
            </div>

            {/* Modal */}
            {isOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Map className="text-orange-500" />
                                    Select Arenas
                                </h3>
                                <p className="text-zinc-500 text-xs">Choose the battlegrounds for this challenge.</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Search & Actions */}
                        <div className="px-6 pt-6 pb-2 shrink-0 flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Search arenas..." 
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-orange-500 outline-none transition-colors"
                                    autoFocus
                                />
                            </div>
                            <button 
                                onClick={() => onChange([])} 
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold transition-colors"
                            >
                                Clear All
                            </button>
                        </div>

                        {/* List */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {categories.map(category => (
                                <div key={category} className="border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden">
                                    {/* Category Header */}
                                    <div 
                                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-900 transition-colors cursor-pointer group/header"
                                    >
                                        <div 
                                            className="flex items-center gap-3 flex-1"
                                            onClick={() => toggleCategory(category)}
                                        >
                                            <ChevronRight className={`text-zinc-500 transition-transform ${expandedCategories.includes(category) ? 'rotate-90' : ''}`} size={20} />
                                            <span className="font-bold text-lg text-white capitalize">{category}</span>
                                            <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">
                                                {groupedArenas[category].length}
                                            </span>
                                        </div>
                                        
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const categoryIds = groupedArenas[category].map(a => a.id);
                                                const allSelected = categoryIds.every(id => selectedArenaIds.includes(id));
                                                
                                                if (allSelected) {
                                                    onChange(selectedArenaIds.filter(id => !categoryIds.includes(id)));
                                                } else {
                                                    // Add missing ones
                                                    const toAdd = categoryIds.filter(id => !selectedArenaIds.includes(id));
                                                    onChange([...selectedArenaIds, ...toAdd]);
                                                }
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg opacity-0 group-hover/header:opacity-100 transition-all"
                                        >
                                            {groupedArenas[category].every(a => selectedArenaIds.includes(a.id)) ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>

                                    {/* Grid of Arenas */}
                                    {expandedCategories.includes(category) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 border-t border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                                            {groupedArenas[category].map(arena => {
                                                const isSelected = selectedArenaIds.includes(arena.id);
                                                return (
                                                    <div 
                                                        key={arena.id}
                                                        onClick={() => toggleSelection(arena.id)}
                                                        className={`
                                                            group relative rounded-xl border cursor-pointer transition-all overflow-hidden
                                                            ${isSelected ? 'bg-orange-900/20 border-orange-500 ring-1 ring-orange-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'}
                                                        `}
                                                    >
                                                        {/* Media Preview */}
                                                        <div className="relative h-32 bg-black overflow-hidden border-b border-zinc-800/50">
                                                            {arena.video ? (
                                                                <video 
                                                                    src={arena.video + '#t=0.1'} 
                                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                                                                    muted 
                                                                    playsInline
                                                                />
                                                            ) : arena.image ? (
                                                                <img 
                                                                    src={arena.image} 
                                                                    alt={arena.name} 
                                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                                                                    <Map size={32} />
                                                                </div>
                                                            )}
                                                            
                                                            {/* Checkmark Overlay */}
                                                            {isSelected && (
                                                                <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1 shadow-lg">
                                                                    <CheckCircle2 size={16} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="p-3">
                                                            <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-orange-400' : 'text-white'}`}>
                                                                {arena.name}
                                                            </h4>
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {(arena.environment || []).slice(0, 2).map(env => (
                                                                    <span key={env} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 flex items-center gap-1">
                                                                        {getEnvironmentIcon(env)}
                                                                        {env}
                                                                    </span>
                                                                ))}
                                                                {arena.difficulty && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-500">
                                                                        Diff: {Object.values(arena.difficulty).reduce((a, b) => a + b, 0)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
