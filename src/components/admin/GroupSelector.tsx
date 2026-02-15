import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Group } from '@/types';
import { ChevronRight, Search, X, CheckCircle2, ChevronDown } from 'lucide-react';

interface GroupSelectorProps {
    groups: Group[];
    selectedGroupId?: string;
    onChange: (groupId: string | undefined) => void;
    className?: string;
    placeholder?: string;
    multiSelect?: boolean;
    selectedGroupIds?: string[];
    onChangeMulti?: (groupIds: string[]) => void;
}

export function GroupSelector({ 
    groups, 
    selectedGroupId, 
    onChange, 
    className, 
    placeholder = 'All Groups (Any)',
    multiSelect = false,
    selectedGroupIds = [],
    onChangeMulti
}: GroupSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['mega']); // Default expanded
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Filter Groups
    const filteredGroups = useMemo(() => {
        if (!search.trim()) return groups;
        return groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
    }, [groups, search]);

    const megaFightGroups = filteredGroups.filter(g => g.type !== 'Community');
    const communityGroups = filteredGroups.filter(g => g.type === 'Community');
    
    // In Admin/Challenge context, we don't really have "My Groups" (User Local) usually, 
    // but we'll include the section for UI consistency with the request.
    const myGroups: Group[] = []; 

    const selectedGroup = groups.find(g => g.id === selectedGroupId);

    const handleSelect = (groupId: string | undefined) => {
        if (multiSelect && onChangeMulti) {
            if (!groupId) {
                onChangeMulti([]);
                setIsOpen(false);
                return;
            }
            if (selectedGroupIds.includes(groupId)) {
                onChangeMulti(selectedGroupIds.filter(id => id !== groupId));
            } else {
                onChangeMulti([...selectedGroupIds, groupId]);
            }
        } else {
            onChange(groupId);
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <div 
                onClick={() => setIsOpen(true)}
                className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white flex items-center justify-between cursor-pointer hover:border-zinc-600 transition-colors ${className}`}
            >
                {multiSelect ? (
                    <div className="flex flex-wrap gap-1">
                        {selectedGroupIds.length > 0 ? (
                            selectedGroupIds.slice(0, 3).map(id => {
                                const group = groups.find(g => g.id === id);
                                return (
                                    <span key={id} className="text-xs bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                                        {group?.name || id}
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-zinc-500">{placeholder}</span>
                        )}
                        {selectedGroupIds.length > 3 && (
                            <span className="text-xs bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded-full text-zinc-400">
                                +{selectedGroupIds.length - 3} more
                            </span>
                        )}
                    </div>
                ) : (
                    <span className={selectedGroup ? 'text-white font-bold' : 'text-zinc-500'}>
                        {selectedGroup ? selectedGroup.name : placeholder}
                    </span>
                )}
                <ChevronDown size={16} className="text-zinc-500" />
            </div>

            {/* Modal */}
            {isOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-bold text-white">Select Franchise</h3>
                                <p className="text-zinc-500 text-xs">Filter fighters by their origin universe.</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-6 pt-6 pb-2 shrink-0 flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Search groups..." 
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-orange-500 outline-none transition-colors"
                                    autoFocus
                                />
                            </div>
                            {multiSelect && (
                                <button 
                                    onClick={() => { onChangeMulti?.([]); }} 
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            
                            {/* Option: All Groups */}
                            {!multiSelect && (
                                <button 
                                    onClick={() => handleSelect(undefined)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${!selectedGroupId ? 'bg-orange-900/20 border-orange-500/50' : 'bg-zinc-950/50 border-zinc-800 hover:bg-zinc-900'}`}
                                >
                                    <span className="font-bold text-lg text-white">All Groups (Any)</span>
                                    {!selectedGroupId && <CheckCircle2 size={20} className="text-orange-500" />}
                                </button>
                            )}

                            {/* My Groups Section */}
                            <div className="border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden">
                                <button 
                                    onClick={() => {
                                        if (expandedCategories.includes('my-groups')) setExpandedCategories(expandedCategories.filter(c => c !== 'my-groups'));
                                        else setExpandedCategories([...expandedCategories, 'my-groups']);
                                    }}
                                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-900 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <ChevronRight className={`text-zinc-500 transition-transform ${expandedCategories.includes('my-groups') ? 'rotate-90' : ''}`} size={20} />
                                        <span className="font-bold text-lg text-white">My Groups</span>
                                        <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">{myGroups.length}</span>
                                    </div>
                                </button>
                                
                                {expandedCategories.includes('my-groups') && (
                                    <div className="p-2 space-y-2 border-t border-zinc-800">
                                        {myGroups.length === 0 ? (
                                            <p className="text-center text-zinc-600 text-sm py-4">No custom groups found.</p>
                                        ) : (
                                            myGroups.map(group => {
                                                const isSelected = multiSelect ? selectedGroupIds.includes(group.id) : selectedGroupId === group.id;
                                                return (
                                                    <button 
                                                        key={group.id}
                                                        onClick={() => handleSelect(group.id)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${isSelected ? 'bg-orange-900/20 text-orange-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                                                    >
                                                        <span className="font-bold">{group.name}</span>
                                                        {isSelected && <CheckCircle2 size={16} />}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Mega Fight Groups Section */}
                            <div className="border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden">
                                <button 
                                    onClick={() => {
                                        if (expandedCategories.includes('mega')) setExpandedCategories(expandedCategories.filter(c => c !== 'mega'));
                                        else setExpandedCategories([...expandedCategories, 'mega']);
                                    }}
                                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-900 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <ChevronRight className={`text-zinc-500 transition-transform ${expandedCategories.includes('mega') ? 'rotate-90' : ''}`} size={20} />
                                        <span className="font-bold text-lg text-white">Mega Fight Groups</span>
                                        <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">{megaFightGroups.length}</span>
                                    </div>
                                </button>
                                
                                {expandedCategories.includes('mega') && (
                                    <div className="p-2 space-y-2 border-t border-zinc-800">
                                        {megaFightGroups.map(group => {
                                            const isSelected = multiSelect ? selectedGroupIds.includes(group.id) : selectedGroupId === group.id;
                                            return (
                                                <button 
                                                    key={group.id}
                                                    onClick={() => handleSelect(group.id)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${isSelected ? 'bg-orange-900/20 text-orange-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                                                >
                                                    <span className="font-bold">{group.name}</span>
                                                    {isSelected && <CheckCircle2 size={16} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Community Groups Section */}
                            {communityGroups.length > 0 && (
                                <div className="border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden">
                                    <button 
                                        onClick={() => {
                                            if (expandedCategories.includes('community')) setExpandedCategories(expandedCategories.filter(c => c !== 'community'));
                                            else setExpandedCategories([...expandedCategories, 'community']);
                                        }}
                                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-900 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <ChevronRight className={`text-zinc-500 transition-transform ${expandedCategories.includes('community') ? 'rotate-90' : ''}`} size={20} />
                                            <span className="font-bold text-lg text-white">Community Groups</span>
                                            <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">{communityGroups.length}</span>
                                        </div>
                                    </button>
                                    
                                    {expandedCategories.includes('community') && (
                                        <div className="p-2 space-y-2 border-t border-zinc-800">
                                            {communityGroups.map(group => {
                                                const isSelected = multiSelect ? selectedGroupIds.includes(group.id) : selectedGroupId === group.id;
                                                return (
                                                    <button 
                                                        key={group.id}
                                                        onClick={() => handleSelect(group.id)}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${isSelected ? 'bg-orange-900/20 text-orange-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                                                    >
                                                        <span className="font-bold">{group.name}</span>
                                                        {isSelected && <CheckCircle2 size={16} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
