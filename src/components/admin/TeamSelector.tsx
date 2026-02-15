import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TeamConfig, Group, Character } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronRight, Search, X, CheckCircle2, Users, Folder, FolderOpen, CheckSquare, Square, Star } from 'lucide-react';

interface TeamSelectorProps {
    config: TeamConfig;
    onChange: (updates: Partial<TeamConfig>) => void;
    groups: Group[];
    characters: Character[];
    className?: string;
    teamLabel?: string;
}

export function TeamSelector({ config, onChange, groups, characters, className, teamLabel }: TeamSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState('');
    
    // Default expanded categories
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['user', 'mega', 'community']);
    // Expanded groups
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    
    // Internal state for the modal (committed on confirm)
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [includedFighters, setIncludedFighters] = useState<string[]>([]); // Explicitly included fighters (outside selected groups)
    const [excludedFighters, setExcludedFighters] = useState<string[]>([]); // Excluded fighters (from selected groups)
    const [excludedStages, setExcludedStages] = useState<string[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync state when opening
    useEffect(() => {
        if (isOpen) {
            setSelectedGroups(config.groupIds || (config.groupId ? [config.groupId] : []));
            setIncludedFighters(config.includedFighters || (config.characterId ? [config.characterId] : []));
            setExcludedFighters(config.excludedFighters || []);
            setExcludedStages(config.excludedStages || []);
        }
    }, [isOpen, config]);

    const handleConfirm = () => {
        const updates: Partial<TeamConfig> = {
            groupIds: selectedGroups,
            groupId: selectedGroups.length === 1 ? selectedGroups[0] : undefined, // Legacy compat
            includedFighters: includedFighters,
            characterId: includedFighters.length === 1 ? includedFighters[0] : undefined, // Legacy compat
            excludedFighters: excludedFighters,
            excludedStages: excludedStages,
            stageId: undefined 
        };

        onChange(updates);
        setIsOpen(false);
    };

    // Derived stats for UI
    const totalSelected = useMemo(() => {
        let count = 0;
        // Count all chars in selected groups (minus excluded)
        selectedGroups.forEach(gid => {
            const gChars = characters.filter(c => c.groupId === gid);
            count += gChars.filter(c => !excludedFighters.includes(c.id)).length;
        });
        // Add individual includes
        count += includedFighters.filter(fid => {
            const char = characters.find(c => c.id === fid);
            // Don't double count if group is already selected
            return char && !selectedGroups.includes(char.groupId);
        }).length;
        return count;
    }, [selectedGroups, includedFighters, excludedFighters, characters]);

    // Filtering & Categorization
    const { megaGroups, communityGroups, userGroups } = useMemo(() => {
        const query = search.toLowerCase();
        
        const filterFn = (g: Group) => {
            if (!query) return true;
            const groupMatch = g.name.toLowerCase().includes(query);
            const charsMatch = characters.some(c => c.groupId === g.id && c.name.toLowerCase().includes(query));
            return groupMatch || charsMatch;
        };

        const filtered = groups.filter(filterFn);
        
        return {
            megaGroups: filtered.filter(g => !['Community', 'User'].includes(g.type || '')),
            communityGroups: filtered.filter(g => g.type === 'Community'),
            userGroups: filtered.filter(g => g.type === 'User')
        };
    }, [groups, characters, search]);

    const getGroupState = (groupId: string) => {
        if (selectedGroups.includes(groupId)) return 'selected';
        // Check if partially selected (some fighters included explicitly)
        const groupChars = characters.filter(c => c.groupId === groupId);
        const includedCount = groupChars.filter(c => includedFighters.includes(c.id)).length;
        if (includedCount === groupChars.length && groupChars.length > 0) return 'selected'; // All manually selected
        if (includedCount > 0) return 'partial';
        return 'none';
    };

    const toggleGroup = (groupId: string) => {
        const currentState = getGroupState(groupId);
        
        if (currentState === 'selected') {
            // Deselect: Remove from selectedGroups, remove any of its chars from included/excluded
            setSelectedGroups(prev => prev.filter(id => id !== groupId));
            const groupCharIds = characters.filter(c => c.groupId === groupId).map(c => c.id);
            setIncludedFighters(prev => prev.filter(id => !groupCharIds.includes(id)));
            setExcludedFighters(prev => prev.filter(id => !groupCharIds.includes(id)));
        } else {
            // Select: Add to selectedGroups, clear individual includes (since whole group is in)
            setSelectedGroups(prev => [...prev, groupId]);
            const groupCharIds = characters.filter(c => c.groupId === groupId).map(c => c.id);
            setIncludedFighters(prev => prev.filter(id => !groupCharIds.includes(id))); // Remove individual includes as they are now covered
            setExcludedFighters(prev => prev.filter(id => !groupCharIds.includes(id))); // Reset exclusions
        }
    };

    const toggleCategory = (categoryGroups: Group[]) => {
        // Check if all are currently selected
        const allSelected = categoryGroups.every(g => selectedGroups.includes(g.id));
        
        const categoryGroupIds = categoryGroups.map(g => g.id);
        const categoryCharIds = characters.filter(c => categoryGroupIds.includes(c.groupId)).map(c => c.id);

        if (allSelected) {
            // Deselect All in Category
            setSelectedGroups(prev => prev.filter(id => !categoryGroupIds.includes(id)));
            // Also clean up any individual includes/excludes for these groups
            setIncludedFighters(prev => prev.filter(id => !categoryCharIds.includes(id)));
            setExcludedFighters(prev => prev.filter(id => !categoryCharIds.includes(id)));
        } else {
            // Select All in Category
            // Add all group IDs that aren't already selected
            setSelectedGroups(prev => {
                const newIds = categoryGroupIds.filter(id => !prev.includes(id));
                return [...prev, ...newIds];
            });
            // Clean up individual includes (since groups are now selected)
            setIncludedFighters(prev => prev.filter(id => !categoryCharIds.includes(id)));
            // Clean up exclusions (reset to full include)
            setExcludedFighters(prev => prev.filter(id => !categoryCharIds.includes(id)));
        }
    };

    const toggleFighter = (charId: string, groupId: string) => {
        const isGroupSelected = selectedGroups.includes(groupId);
        
        if (isGroupSelected) {
            // If group is selected, toggling a fighter means Excluding/Re-including
            if (excludedFighters.includes(charId)) {
                setExcludedFighters(prev => prev.filter(id => id !== charId));
            } else {
                setExcludedFighters(prev => [...prev, charId]);
            }
        } else {
            // If group is NOT selected, toggling means Including/Removing
            if (includedFighters.includes(charId)) {
                setIncludedFighters(prev => prev.filter(id => id !== charId));
            } else {
                setIncludedFighters(prev => [...prev, charId]);
            }
        }
    };

    const toggleStage = (charId: string, stageName: string) => {
        const key = `${charId}:${stageName}`;
        if (excludedStages.includes(key)) {
            setExcludedStages(prev => prev.filter(k => k !== key));
        } else {
            setExcludedStages(prev => [...prev, key]);
        }
    };

    const renderGroupList = (categoryGroups: Group[]) => {
        return (
            <div className="space-y-2 p-2">
                {categoryGroups.map(group => {
                    const groupState = getGroupState(group.id);
                    const isGroupSelected = groupState === 'selected';
                    const isPartial = groupState === 'partial';
                    const isExpanded = expandedGroups.includes(group.id) || search.length > 0;
                    const groupChars = characters.filter(c => c.groupId === group.id);
                    
                    if (groupChars.length === 0) return null;

                    return (
                        <div key={group.id} className={`border rounded-xl overflow-hidden transition-all ${isGroupSelected ? 'bg-orange-900/10 border-orange-500/30' : 'bg-zinc-950/50 border-zinc-800'}`}>
                            {/* Group Header */}
                            <div className="flex items-center p-3 hover:bg-zinc-900/50 transition-colors">
                                <button 
                                    onClick={() => {
                                        if (expandedGroups.includes(group.id)) setExpandedGroups(expandedGroups.filter(id => id !== group.id));
                                        else setExpandedGroups([...expandedGroups, group.id]);
                                    }}
                                    className="p-2 mr-2 text-zinc-500 hover:text-white"
                                >
                                    <ChevronRight size={20} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                
                                <div 
                                    onClick={() => toggleGroup(group.id)}
                                    className="flex-1 cursor-pointer flex items-center justify-between"
                                >
                                    <div>
                                        <h4 className={`font-bold text-lg ${isGroupSelected ? 'text-orange-400' : 'text-zinc-200'}`}>{group.name}</h4>
                                        <p className="text-xs text-zinc-500">{groupChars.length} Fighters</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isGroupSelected ? 'bg-orange-500 border-orange-500' : isPartial ? 'bg-orange-900/30 border-orange-500' : 'border-zinc-700'}`}>
                                        {isGroupSelected && <CheckCircle2 size={16} className="text-white" />}
                                        {isPartial && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                    </div>
                                </div>
                            </div>

                            {/* Fighters List */}
                            {isExpanded && (
                                <div className="border-t border-zinc-800/50 bg-black/20">
                                    {groupChars.map(char => {
                                        const isExcluded = excludedFighters.includes(char.id);
                                        const isIncluded = includedFighters.includes(char.id);
                                        const isSelected = isGroupSelected ? !isExcluded : isIncluded;
                                        
                                        return (
                                            <div key={char.id} className="border-b border-zinc-800/30 last:border-0 pl-12 pr-4 py-2 hover:bg-white/5 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            onClick={() => toggleFighter(char.id, group.id)}
                                                            className={`cursor-pointer w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-zinc-600'}`}
                                                        >
                                                            {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                                        </div>
                                                        <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-zinc-500'}`}>
                                                            {char.name}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Stage Toggles */}
                                                    {isSelected && (
                                                        <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                                                            {char.stages.map((stage, idx) => {
                                                                const stageKey = `${char.id}:${stage.stage}`;
                                                                const isStageExcluded = excludedStages.includes(stageKey);
                                                                
                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => toggleStage(char.id, stage.stage)}
                                                                        className={`px-1.5 py-0.5 text-[10px] rounded border transition-all ${!isStageExcluded ? 'bg-zinc-800 border-zinc-600 text-zinc-300' : 'bg-transparent border-zinc-800 text-zinc-600 line-through'}`}
                                                                        title={!isStageExcluded ? "Click to exclude stage" : "Click to include stage"}
                                                                    >
                                                                        {stage.name || stage.stage}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            {/* Trigger Button */}
            <div 
                onClick={() => setIsOpen(true)}
                className={cn("w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white flex items-center justify-between cursor-pointer hover:border-zinc-600 transition-colors", className)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <Users size={18} className="text-zinc-500 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold truncate">
                            {totalSelected === 0 ? 'Select Fighters...' : `${totalSelected} Fighters Selected`}
                        </span>
                        {totalSelected > 0 && (
                            <div className="flex gap-1 text-[10px] text-zinc-500">
                                {selectedGroups.length > 0 && <span>{selectedGroups.length} Groups</span>}
                                {selectedGroups.length > 0 && includedFighters.length > 0 && <span>+</span>}
                                {includedFighters.length > 0 && <span>{includedFighters.length} Individuals</span>}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {totalSelected > 0 && <CheckCircle2 size={16} className="text-green-500" />}
                    <ChevronRight size={16} className="text-zinc-500 rotate-90" />
                </div>
            </div>

            {/* Modal */}
            {isOpen && mounted && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0 bg-zinc-900 z-10">
                            <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Users className="text-orange-500" />
                                    Select Team Roster
                                </h3>
                                <p className="text-zinc-500 text-xs">
                                    Configuring: <span className="text-orange-400 font-bold">{teamLabel || 'Team'}</span>
                                </p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-6 py-4 shrink-0 bg-zinc-900/95 backdrop-blur z-10 border-b border-zinc-800/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Search groups, fighters..." 
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-orange-500 outline-none transition-colors"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            
                            {/* User Groups */}
                            {userGroups.length > 0 && (
                                <div className="border border-zinc-800 rounded-xl bg-zinc-950/30 overflow-hidden">
                                    <div className="flex items-center justify-between p-4 bg-zinc-900/80 border-b border-zinc-800">
                                        <button 
                                            onClick={() => {
                                                if (expandedCategories.includes('user')) setExpandedCategories(expandedCategories.filter(c => c !== 'user'));
                                                else setExpandedCategories([...expandedCategories, 'user']);
                                            }}
                                            className="flex items-center gap-2 text-white font-bold text-lg hover:text-purple-400 transition-colors"
                                        >
                                            <ChevronRight className={`transition-transform ${expandedCategories.includes('user') ? 'rotate-90' : ''}`} size={20} />
                                            <Star className="text-purple-500" size={20} />
                                            My Collection
                                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-2">{userGroups.length}</span>
                                        </button>
                                        
                                        {/* Select All in Category */}
                                        <button 
                                            onClick={() => toggleCategory(userGroups)}
                                            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-purple-400 transition-colors"
                                        >
                                            {userGroups.every(g => selectedGroups.includes(g.id)) ? (
                                                <>
                                                    <CheckSquare size={16} className="text-purple-500" />
                                                    Deselect All
                                                </>
                                            ) : (
                                                <>
                                                    <Square size={16} />
                                                    Select All
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    
                                    {expandedCategories.includes('user') && renderGroupList(userGroups)}
                                </div>
                            )}

                            {/* Mega Fight Groups */}
                            {megaGroups.length > 0 && (
                                <div className="border border-zinc-800 rounded-xl bg-zinc-950/30 overflow-hidden">
                                    <div className="flex items-center justify-between p-4 bg-zinc-900/80 border-b border-zinc-800">
                                        <button 
                                            onClick={() => {
                                                if (expandedCategories.includes('mega')) setExpandedCategories(expandedCategories.filter(c => c !== 'mega'));
                                                else setExpandedCategories([...expandedCategories, 'mega']);
                                            }}
                                            className="flex items-center gap-2 text-white font-bold text-lg hover:text-orange-400 transition-colors"
                                        >
                                            <ChevronRight className={`transition-transform ${expandedCategories.includes('mega') ? 'rotate-90' : ''}`} size={20} />
                                            <FolderOpen className="text-orange-500" size={20} />
                                            Mega Fight Groups
                                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-2">{megaGroups.length}</span>
                                        </button>
                                        
                                        {/* Select All in Category */}
                                        <button 
                                            onClick={() => toggleCategory(megaGroups)}
                                            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-orange-400 transition-colors"
                                        >
                                            {megaGroups.every(g => selectedGroups.includes(g.id)) ? (
                                                <>
                                                    <CheckSquare size={16} className="text-orange-500" />
                                                    Deselect All
                                                </>
                                            ) : (
                                                <>
                                                    <Square size={16} />
                                                    Select All
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    
                                    {expandedCategories.includes('mega') && renderGroupList(megaGroups)}
                                </div>
                            )}

                            {/* Community Groups */}
                            {communityGroups.length > 0 && (
                                <div className="border border-zinc-800 rounded-xl bg-zinc-950/30 overflow-hidden">
                                    <div className="flex items-center justify-between p-4 bg-zinc-900/80 border-b border-zinc-800">
                                        <button 
                                            onClick={() => {
                                                if (expandedCategories.includes('community')) setExpandedCategories(expandedCategories.filter(c => c !== 'community'));
                                                else setExpandedCategories([...expandedCategories, 'community']);
                                            }}
                                            className="flex items-center gap-2 text-white font-bold text-lg hover:text-orange-400 transition-colors"
                                        >
                                            <ChevronRight className={`transition-transform ${expandedCategories.includes('community') ? 'rotate-90' : ''}`} size={20} />
                                            <Folder className="text-blue-500" size={20} />
                                            Community Groups
                                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-2">{communityGroups.length}</span>
                                        </button>
                                        
                                        {/* Select All in Category */}
                                        <button 
                                            onClick={() => toggleCategory(communityGroups)}
                                            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-orange-400 transition-colors"
                                        >
                                            {communityGroups.every(g => selectedGroups.includes(g.id)) ? (
                                                <>
                                                    <CheckSquare size={16} className="text-orange-500" />
                                                    Deselect All
                                                </>
                                            ) : (
                                                <>
                                                    <Square size={16} />
                                                    Select All
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    
                                    {expandedCategories.includes('community') && renderGroupList(communityGroups)}
                                </div>
                            )}

                            {megaGroups.length === 0 && communityGroups.length === 0 && userGroups.length === 0 && (
                                <div className="text-center py-12 text-zinc-500">
                                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No groups found matching "{search}"</p>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-zinc-800 bg-zinc-900 shrink-0 flex justify-between items-center">
                            <div className="text-sm text-zinc-400">
                                <strong className="text-white">{totalSelected}</strong> Fighters Selected
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="px-6 py-2 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleConfirm}
                                    className="px-8 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-lg shadow-orange-900/20 transition-all hover:scale-105"
                                >
                                    Confirm Selection
                                </button>
                            </div>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
