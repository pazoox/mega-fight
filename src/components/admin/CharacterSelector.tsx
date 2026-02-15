import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Character, Group } from '@/types';
import { ChevronDown, ChevronRight, CheckCircle2, X, Search, Users, User } from 'lucide-react';

interface CharacterSelectorProps {
    characters: Character[];
    allCharacters?: Character[];
    groups: Group[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    className?: string;
    placeholder?: string;
}

export function CharacterSelector({ characters, allCharacters, groups, selectedIds, onChange, className, placeholder = 'Select Characters...' }: CharacterSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);

    // Use allCharacters for name lookup if provided, otherwise fallback to characters
    const lookupCharacters = allCharacters || characters;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Filter Logic
    const filteredCharacters = useMemo(() => {
        if (!search.trim()) return characters;
        const lowerSearch = search.toLowerCase();
        return characters.filter(c => 
            c.name.toLowerCase().includes(lowerSearch) || 
            (c.stages && c.stages.some(s => s.name && s.name.toLowerCase().includes(lowerSearch)))
        );
    }, [characters, search]);

    // Group by Franchise (Group)
    const groupedCharacters = useMemo(() => {
        const result: Record<string, Character[]> = {};
        
        filteredCharacters.forEach(char => {
            const groupId = char.groupId || 'uncategorized';
            if (!result[groupId]) result[groupId] = [];
            result[groupId].push(char);
        });

        return result;
    }, [filteredCharacters]);

    // Get Group Name Helper
    const getGroupName = (groupId: string) => {
        if (groupId === 'uncategorized') return 'Uncategorized';
        return groups.find(g => g.id === groupId)?.name || 'Unknown Group';
    };

    const groupIds = Object.keys(groupedCharacters).sort((a, b) => getGroupName(a).localeCompare(getGroupName(b)));

    // Auto-expand on search
    useEffect(() => {
        if (search) {
            setExpandedGroups(groupIds);
        } else if (groupIds.length > 0 && expandedGroups.length === 0) {
             // Expand first few by default
             setExpandedGroups(groupIds.slice(0, 3));
        }
    }, [search, groupIds.length]);

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(cid => cid !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const toggleGroup = (groupId: string) => {
        if (expandedGroups.includes(groupId)) {
            setExpandedGroups(expandedGroups.filter(id => id !== groupId));
        } else {
            setExpandedGroups([...expandedGroups, groupId]);
        }
    };

    const selectAllInGroup = (groupId: string) => {
        const charIds = groupedCharacters[groupId].map(c => c.id);
        const allSelected = charIds.every(id => selectedIds.includes(id));
        
        if (allSelected) {
            // Deselect all in group
            onChange(selectedIds.filter(id => !charIds.includes(id)));
        } else {
            // Select all in group (union)
            const newIds = [...selectedIds];
            charIds.forEach(id => {
                if (!newIds.includes(id)) newIds.push(id);
            });
            onChange(newIds);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <div 
                onClick={() => setIsOpen(true)} 
                className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white flex items-center justify-between cursor-pointer hover:border-zinc-600 transition-colors ${className}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Users size={18} className="text-zinc-500 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                        {selectedIds.length > 0 ? (
                            selectedIds.slice(0, 3).map(id => {
                                const char = lookupCharacters.find(c => c.id === id);
                                return (
                                    <span key={id} className="text-xs bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                                        {char?.name || id}
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-zinc-500">{placeholder}</span>
                        )}
                        {selectedIds.length > 3 && (
                            <span className="text-xs bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded-full text-zinc-400">
                                +{selectedIds.length - 3} more
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
                                    <Users className="text-blue-500" />
                                    Select Specific Characters
                                </h3>
                                <p className="text-zinc-500 text-xs">Add specific characters to the roster (Union with Group filters).</p>
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
                                    placeholder="Search characters..." 
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-colors"
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
                            {groupIds.map(groupId => (
                                <div key={groupId} className="border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden">
                                    {/* Category Header */}
                                    <div className="w-full flex items-center justify-between p-4 hover:bg-zinc-900 transition-colors">
                                        <div 
                                            onClick={() => toggleGroup(groupId)}
                                            className="flex items-center gap-3 cursor-pointer flex-1"
                                        >
                                            <ChevronRight className={`text-zinc-500 transition-transform ${expandedGroups.includes(groupId) ? 'rotate-90' : ''}`} size={20} />
                                            <span className="font-bold text-lg text-white">{getGroupName(groupId)}</span>
                                            <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">
                                                {groupedCharacters[groupId].length}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); selectAllInGroup(groupId); }}
                                            className="text-xs px-2 py-1 rounded border border-zinc-700 hover:bg-zinc-800 text-zinc-400"
                                        >
                                            Select All
                                        </button>
                                    </div>

                                    {/* Grid of Characters */}
                                    {expandedGroups.includes(groupId) && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 border-t border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                                            {groupedCharacters[groupId].map(char => {
                                                const isSelected = selectedIds.includes(char.id);
                                                const image = char.stages?.[0]?.thumbnail || char.stages?.[0]?.image;

                                                return (
                                                    <div 
                                                        key={char.id}
                                                        onClick={() => toggleSelection(char.id)}
                                                        className={`
                                                            group relative rounded-xl border cursor-pointer transition-all overflow-hidden aspect-[3/4]
                                                            ${isSelected ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'}
                                                        `}
                                                    >
                                                        {/* Image */}
                                                        {image ? (
                                                            <img 
                                                                src={image} 
                                                                alt={char.name} 
                                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                                                                <User size={32} />
                                                            </div>
                                                        )}
                                                        
                                                        {/* Name Overlay */}
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
                                                            <div className={`font-bold text-sm truncate ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                                                                {char.name}
                                                            </div>
                                                        </div>

                                                        {/* Checkmark */}
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg">
                                                                <CheckCircle2 size={14} />
                                                            </div>
                                                        )}
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
