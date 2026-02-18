'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/context/AuthContext'
import { 
  Users, 
  Swords, 
  Globe, 
  Zap, 
  Shield, 
  CheckCircle2, 
  Circle,
  MapPin,
  Layers,
  Search,
  X,
  Trophy,
  ChevronDown,
  ChevronRight,
  Minus,
  Gamepad2,
  Flame,
  Droplets,
  CloudLightning,
  Mountain,
  Sun,
  Moon,
  Wind,
  Cloud
} from 'lucide-react'
import { Group, Arena, Character, CharacterStage } from '@/types'
import { calculateRank, getRankColor, RankType } from '@/utils/statTiers'

const RANK_ORDER: RankType[] = ['C', 'C+', 'B', 'B+', 'A', 'S', 'S+']

const getStageRank = (stage: CharacterStage): RankType => {
  const totalStats = Object.values(stage.stats).reduce((sum, val) => 
      typeof val === 'number' ? (sum as number) + (val as number) : sum as number, 0) as number
  
  return calculateRank(totalStats)
}

const getCharacterRank = (char: Character): RankType => {
  if (!char || !char.stages || char.stages.length === 0) return 'C';
  
  const strongestStage = char.stages.reduce((prev, current) => {
      const prevTotal = Object.values(prev.stats).reduce((a, b) => typeof a === 'number' ? (a as number) + (b as number) : a as number, 0) as number
      const currTotal = Object.values(current.stats).reduce((a, b) => typeof a === 'number' ? (a as number) + (b as number) : a as number, 0) as number
      return currTotal > prevTotal ? current : prev
  }, char.stages[0])

  return getStageRank(strongestStage)
}

export default function FightSetupPage() {
  const router = useRouter()
  const { profile } = useAuth()
  
  // -- Game Settings State --
  const [mode, setMode] = useState<'solo' | 'room'>('solo')
  const [teamSize, setTeamSize] = useState<'1x1' | '2v2' | '3v3' | '4v4'>('1x1')
  const [tournamentType, setTournamentType] = useState<'bracket' | 'last-standing'>('bracket')
  const [powerScale, setPowerScale] = useState(false)
  const [thirdPlace, setThirdPlace] = useState(true)
  const [modifiersEnabled, setModifiersEnabled] = useState(true) // New State for Modifiers Toggle
  
  // -- Arena Settings --
  const [arenaMode, setArenaMode] = useState<'null' | 'select' | 'all'>('all')
  const [selectedArenas, setSelectedArenas] = useState<string[]>([]) // IDs
  
  // -- Group Settings --
  const [groupMode, setGroupMode] = useState<'all' | 'select'>('all')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]) // IDs
  const [stageSelectionMode, setStageSelectionMode] = useState<'random' | 'unique' | 'weakest' | 'strongest'>('random')
  const [excludedFighters, setExcludedFighters] = useState<string[]>([]) // IDs of fighters explicitly deselected
  const [battleLimit, setBattleLimit] = useState<string>('all')
  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false)
  
  // -- Group Selection Modal State --
  const [groupSearch, setGroupSearch] = useState('')
  const [selectedRanks, setSelectedRanks] = useState<string[]>(RANK_ORDER)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['mega'])
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [expandedCharacters, setExpandedCharacters] = useState<string[]>([]) // New: Track expanded characters
  const [excludedStages, setExcludedStages] = useState<string[]>([]) // New: ID + StageIndex (e.g. "char_id:0")

  // -- Data --
  const [availableArenas, setAvailableArenas] = useState<Arena[]>([])
  const [availableGroups, setAvailableGroups] = useState<Group[]>([])
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)

  const userGroups = useMemo(() => {
    if (!profile?.username) return []
    return availableGroups.filter(g => g.type === 'User' && g.name === `${profile.username}'s Group`)
  }, [availableGroups, profile])

  const franchiseGroups = useMemo(() => {
    return availableGroups.filter(g => g.type !== 'User')
  }, [availableGroups])

  // -- Derived State for Battle Count (Bracket Size) --
  const rankCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableCharacters.forEach(c => {
       if (!c) return;
       if (c.stages && c.stages.length > 0) {
          c.stages.forEach(stage => {
             const rank = getStageRank(stage);
             counts[rank] = (counts[rank] || 0) + 1;
          });
       } else {
           // Fallback for no stages (shouldn't happen with valid data)
           const rank = getCharacterRank(c);
           counts[rank] = (counts[rank] || 0) + 1;
       }
    });
    return counts;
  }, [availableCharacters]);

  const filteredCharacters = useMemo(() => {
    let chars = availableCharacters
    
    if (groupMode === 'select') {
      chars = chars.filter(c => selectedGroups.includes(c.groupId))
    }
    
    // Filter by Rank
    if (selectedRanks.length > 0) {
       // A character is visible if AT LEAST ONE of its NON-EXCLUDED stages matches the selected ranks
       chars = chars.filter(c => {
          if (!c || !c.stages) return false;
          const visibleStages = c.stages.map((_, idx) => idx).filter(idx => !excludedStages.includes(`${c.id}:${idx}`));
          if (visibleStages.length === 0) return false; // If all stages excluded, character is effectively hidden/excluded?
          
          // Check if any visible stage has a rank that is selected
          return visibleStages.some(idx => {
             const stageRank = getStageRank(c.stages[idx]);
             return selectedRanks.includes(stageRank);
          });
       })
    }

    return chars.filter(c => !excludedFighters.includes(c.id))
  }, [groupMode, selectedGroups, excludedFighters, availableCharacters, selectedRanks, excludedStages])

  // Calculate Max Bracket Size (Power of 2)
  const maxBracketSize = useMemo(() => {
    const n = filteredCharacters.length
    if (n < 2) return 0
    
    let participants = n;
    if (teamSize === '2v2') {
       participants = Math.floor(n / 2);
    } else if (teamSize === '3v3') {
       participants = Math.floor(n / 3);
    } else if (teamSize === '4v4') {
       participants = Math.floor(n / 4);
    }
    
    if (participants < 2) return 0;

    // Find largest power of 2 <= participants
    let size = 1;
    while (size * 2 <= participants) {
      size *= 2;
    }
    
    return size;
  }, [filteredCharacters.length, teamSize])

  const battleCount = maxBracketSize; // Alias for compatibility with existing UI refs if any

  // Calculate Matches for Display (Size - 1 + ThirdPlace)
  const calculateMatches = (size: number) => {
    if (size < 2) return 0;
    let matches = size - 1;
    if (thirdPlace && size >= 4) matches += 1;
    return matches;
  }

  const maxMatches = calculateMatches(maxBracketSize);

  const canConfigureMatchLimit = useMemo(() => {
    if (tournamentType === 'bracket') {
      return maxBracketSize >= 4;
    }
    return filteredCharacters.length >= 2;
  }, [tournamentType, maxBracketSize, filteredCharacters.length]);


  // -- Modals --
  const [showArenaModal, setShowArenaModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)

  // -- Arena Modal State --
  const [arenaSearch, setArenaSearch] = useState('')
  const [expandedArenaFolders, setExpandedArenaFolders] = useState<string[]>(['Canon'])

  // Fetch Data
  useEffect(() => {
    const run = async () => {
      try {
        const [arenasData, groupsData, charsData] = await Promise.all([
          fetch('/api/catalog/arenas?onlyActive=true').then(res => res.json()),
          fetch('/api/catalog/groups?onlyActive=true').then(res => res.json()),
          fetch('/api/catalog/characters?onlyActive=true').then(res => res.json())
        ])

        setAvailableArenas(Array.isArray(arenasData) ? arenasData : [])
        setAvailableGroups(Array.isArray(groupsData) ? groupsData : [])
        setAvailableCharacters(Array.isArray(charsData) ? charsData : [])
      } catch (error) {
        console.error('Failed to load catalog data for fight setup', error)
        setAvailableArenas([])
        setAvailableGroups([])
        setAvailableCharacters([])
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const handleStart = async () => {
    if (false) {
      if (!profile) {
        alert('You must be logged in to create a room');
        return;
      }

      setLoading(true);
      try {
        // 1. Create a "Quick Match" Cup
        const config = {
            format: tournamentType === 'last-standing' ? 'queue' : 'elimination',
            teamSize: teamSize === '2v2' ? 2 : 1,
            participantCriteria: {
                franchises: groupMode === 'select' ? selectedGroups : [],
                stageMode: stageSelectionMode,
                bracketSize: battleLimit === 'all' ? maxBracketSize : Number(battleLimit),
                tags: [],
                excludedFighters: excludedFighters // Pass excluded fighters
            },
            rules: {
                powerScale,
                thirdPlace,
                modifiers: modifiersEnabled,
                arenaPool: arenaMode === 'select' ? selectedArenas : []
            }
        };

        const { supabase } = await import('@/lib/supabase')
         const { data: { session } } = await supabase.auth.getSession()

         const res = await fetch('/api/user/cups', {
             method: 'POST',
             headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${session?.access_token}`
             },
             body: JSON.stringify({
                 userId: profile?.id || '',
                 name: `Quick Match ${new Date().toLocaleTimeString()}`,
                 description: 'Generated from Battle Configuration',
                 config: { 
                   ...config, 
                   meta: { ...(config as any).meta, origin: 'quick_match' } 
                 }
             })
         });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create match configuration');
        }

        const cup = await res.json();

        // 2. Create Room with Cup ID
        const roomId = crypto.randomUUID();
        router.push(`/fight/room/${roomId}?cupId=${cup.id}`);
        
      } catch (err: any) {
        console.error(err);
        alert('Error creating room: ' + err.message);
        setLoading(false);
      }
    } else {
      // Solo mode - pass config via query params or context
      // For now just redirect to the solo page
      // If limit matches battleCount (Max), we don't send it, so it defaults to Bracket Mode in solo page
      // unless user specifically selected a lower limit.
      let limitParam = battleLimit
      if (battleLimit === 'all') {
        // If it's 'all', we send nothing so it uses Default Bracket
        limitParam = ''
      }

      // Calculate effective excluded fighters (manual + power scale)
      // Updated logic: We pass excludedStages now too, or handle it here?
      // The backend probably doesn't know about stage exclusion yet.
      // Current system only allows excluding FIGHTERS (IDs).
      // If we want to exclude specific stages, we need to pass that info.
      // However, the 'draftCharacter' logic in tournament.ts picks a random stage.
      // We should probably filter the character object itself before generating the bracket?
      // Or pass 'excludedStages' in query params and handle it in the solo page.
      
      const effectiveExcluded = new Set(excludedFighters)
      
      // If a character has NO valid stages (all excluded or rank mismatch), exclude the character entirely
      availableCharacters.forEach(c => {
         if (effectiveExcluded.has(c.id)) return;

         const validStages = c.stages.map((_, idx) => idx).filter(idx => {
            const isExcluded = excludedStages.includes(`${c.id}:${idx}`);
            const rank = getStageRank(c.stages[idx]);
            const isRankSelected = selectedRanks.length === 0 || selectedRanks.includes(rank);
            return !isExcluded && isRankSelected;
         });

         if (validStages.length === 0) {
            effectiveExcluded.add(c.id);
         }
      });

      const query = new URLSearchParams({
        teamSize,
        powerScale: String(powerScale),
        thirdPlace: String(thirdPlace),
        modifiers: String(modifiersEnabled), // Pass modifier state
        arenaMode,
        arenas: selectedArenas.join(','),
        groupMode,
        groups: selectedGroups.join(','),
        excluded: Array.from(effectiveExcluded).join(','),
        // Pass excluded stages if we update the backend/logic to support it
        // For now, we only support full character exclusion in URL based on logic above.
        // Wait, the user wants to select/deselect specific forms.
        // If I deselect "Base Form" but keep "Super Saiyan", the character is still IN.
        // But the tournament generator needs to know NOT to pick "Base Form".
        // We need a new param 'excludedStages'
        excludedStages: excludedStages.join(','),
        tournamentType,
        stageSelectionMode
      })

      if (limitParam) {
        query.set('limit', limitParam)
      }

      router.push(`/fight/solo?${query.toString()}`)
    }
  }

  // Ensure limit is valid when count changes
  useEffect(() => {
    if (battleLimit !== 'all' && Number(battleLimit) > battleCount) {
      setBattleLimit('all')
    }
  }, [battleCount, battleLimit])

  // Helper for toggling selection
  const toggleSelection = (id: string, current: string[], setFn: (ids: string[]) => void) => {
    if (current.includes(id)) {
      setFn(current.filter(i => i !== id))
    } else {
      setFn([...current, id])
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <Navbar active="play" />

      <main className="flex-1 pt-24 pb-12 px-6 flex items-center justify-center relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/10 via-black to-black pointer-events-none" />

        <div className="w-full max-w-7xl z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600 mb-4">
              Battle Configuration
            </h1>
            <p className="text-zinc-500 font-mono tracking-widest">
              Set the rules of engagement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Column 1: Game */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-wider text-sm mb-2 border-b border-white/10 pb-2">
                <Gamepad2 size={16} /> Game
              </div>
              
              

              {/* Team Size */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
                <h3 className="text-zinc-400 font-black italic uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                  <Users size={16} /> Team Size
                </h3>
                <div className="grid grid-cols-2 gap-2 bg-zinc-900/60 rounded-xl p-2 border border-zinc-800 hover:border-orange-500/30 transition-colors">
                  <button 
                    onClick={() => setTeamSize('1x1')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${teamSize === '1x1' ? 'bg-orange-900/20 text-white border-orange-500 shadow-lg ring-1 ring-orange-500/30' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'}`}
                  >
                    <Users size={18} className={`${teamSize === '1x1' ? 'text-white' : 'text-zinc-500'}`} />
                    <span className="font-bold">1 vs 1</span>
                  </button>
                  <button 
                    onClick={() => setTeamSize('2v2')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${teamSize === '2v2' ? 'bg-orange-900/20 text-white border-orange-500 shadow-lg ring-1 ring-orange-500/30' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'}`}
                  >
                    <Users size={18} className={`${teamSize === '2v2' ? 'text-white' : 'text-zinc-500'}`} />
                    <span className="font-bold">Tag Team (2v2)</span>
                  </button>
                  <button 
                    onClick={() => setTeamSize('3v3')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${teamSize === '3v3' ? 'bg-orange-900/20 text-white border-orange-500 shadow-lg ring-1 ring-orange-500/30' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'}`}
                  >
                    <Users size={18} className={`${teamSize === '3v3' ? 'text-white' : 'text-zinc-500'}`} />
                    <span className="font-bold">Trios (3v3)</span>
                  </button>
                  <button 
                    onClick={() => setTeamSize('4v4')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${teamSize === '4v4' ? 'bg-orange-900/20 text-white border-orange-500 shadow-lg ring-1 ring-orange-500/30' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'}`}
                  >
                    <Users size={18} className={`${teamSize === '4v4' ? 'text-white' : 'text-zinc-500'}`} />
                    <span className="font-bold">Squads (4v4)</span>
                  </button>
                </div>
              </section>

              {/* Power Scale */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="flex justify-between items-center">
                  <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                    <Zap size={16} /> Power Scale
                  </h3>
                  <button 
                    onClick={() => setPowerScale(!powerScale)}
                    className={`w-14 h-8 rounded-full p-1 transition-colors ${powerScale ? 'bg-orange-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${powerScale ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  {powerScale ? 'Canonical power levels enabled. Stats affect outcome.' : 'Stats normalized. Skill based matchup.'}
                </p>
              </section>

              {/* Modifiers */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="flex justify-between items-center">
                  <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                    <CloudLightning size={16} /> Modifiers
                  </h3>
                  <button 
                    onClick={() => setModifiersEnabled(!modifiersEnabled)}
                    className={`w-14 h-8 rounded-full p-1 transition-colors ${modifiersEnabled ? 'bg-orange-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${modifiersEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  {modifiersEnabled ? 'Dynamic rules active (Weather, Synergy, Physics).' : 'Standard rules only. No environmental effects.'}
                </p>
              </section>
            </div>

            {/* Column 2: Pool */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-wider text-sm mb-2 border-b border-white/10 pb-2">
                <Layers size={16} /> Pool
              </div>

              {/* Arena Pool */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
                <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Arena Pool
                </h3>
                <div className="space-y-3">
                  <div 
                    onClick={() => setArenaMode('all')}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${arenaMode === 'all' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${arenaMode === 'all' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {arenaMode === 'all' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">All Arenas</span>
                    <span className="text-xs text-zinc-500 ml-auto">Random selection</span>
                  </div>

                  <div 
                    onClick={() => { setArenaMode('select'); setShowArenaModal(true); }}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${arenaMode === 'select' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${arenaMode === 'select' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {arenaMode === 'select' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">Select Arenas</span>
                    <span className="text-xs text-zinc-500 ml-auto">{selectedArenas.length} Selected</span>
                  </div>
                </div>
              </section>

              {/* Character Pool (Groups) */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
                <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                  <Layers size={16} /> Character Pool
                </h3>
                <div className="space-y-3">
                  <div 
                    onClick={() => setGroupMode('all')}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${groupMode === 'all' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${groupMode === 'all' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {groupMode === 'all' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">All Groups</span>
                    <span className="text-xs text-zinc-500 ml-auto">Everything goes</span>
                  </div>

                  <div 
                    onClick={() => { setGroupMode('select'); setShowGroupModal(true); }}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${groupMode === 'select' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${groupMode === 'select' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {groupMode === 'select' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">Select Groups</span>
                    <span className="text-xs text-zinc-500 ml-auto">{selectedGroups.length} Selected</span>
                  </div>
                </div>
              </section>

              {/* Stage / Form Selection */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
                <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                   <Shield size={16} /> Stage / Form
                </h3>
                <div className="space-y-3">
                  <div 
                    onClick={() => setStageSelectionMode('random')}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${stageSelectionMode === 'random' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${stageSelectionMode === 'random' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {stageSelectionMode === 'random' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">Random</span>
                    <span className="text-xs text-zinc-500 ml-auto">Random selection</span>
                  </div>

                  <div 
                    onClick={() => setStageSelectionMode('unique')}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${stageSelectionMode === 'unique' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${stageSelectionMode === 'unique' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {stageSelectionMode === 'unique' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">Unique</span>
                    <span className="text-xs text-zinc-500 ml-auto">Random once, fixed</span>
                  </div>

                  <div 
                    onClick={() => setStageSelectionMode('weakest')}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${stageSelectionMode === 'weakest' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${stageSelectionMode === 'weakest' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {stageSelectionMode === 'weakest' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">Weakest</span>
                    <span className="text-xs text-zinc-500 ml-auto">Lowest Power</span>
                  </div>

                  <div 
                    onClick={() => setStageSelectionMode('strongest')}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${stageSelectionMode === 'strongest' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${stageSelectionMode === 'strongest' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {stageSelectionMode === 'strongest' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">Strongest</span>
                    <span className="text-xs text-zinc-500 ml-auto">Highest Power</span>
                  </div>
                </div>
              </section>
            </div>

            
            {/* Column 3: Bracket */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase tracking-wider text-sm mb-2 border-b border-white/10 pb-2">
                <Swords size={16} /> Bracket
              </div>
              
              {/* Bracket Type */}
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
                <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                  <Swords size={16} /> Bracket Type
                </h3>
                <div className="space-y-3">
                  <div 
                    onClick={() => setTournamentType('bracket')}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${tournamentType === 'bracket' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${tournamentType === 'bracket' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {tournamentType === 'bracket' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">Classic</span>
                    <span className="text-xs text-zinc-500 ml-auto">Standard elimination</span>
                  </div>

                  <div 
                    onClick={() => setTournamentType('last-standing')}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${tournamentType === 'last-standing' ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                     <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${tournamentType === 'last-standing' ? 'border-orange-500' : 'border-zinc-600'}`}>
                      {tournamentType === 'last-standing' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span className="font-bold">Last One Standing</span>
                    <span className="text-xs text-zinc-500 ml-auto">Queue survival</span>
                  </div>
                </div>
              </section>
              
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
                <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                  <Layers size={16} /> Match Limit
                </h3>
                
                {canConfigureMatchLimit ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-zinc-400 text-sm font-mono">
                        {(() => {
                          if (battleLimit === 'all') {
                            if (tournamentType === 'bracket') {
                               const steps = [4, 8, 16, 32, 64, 128].filter(n => n <= maxBracketSize);
                               if (steps.length === 0) return '0 Matches';
                               const p = steps[steps.length - 1];
                               return `${p - 1 + (thirdPlace && p >= 4 ? 1 : 0)} Matches`;
                            }
                            return `${filteredCharacters.length - 1} Matches`;
                          } else {
                            const p = Number(battleLimit);
                            if (tournamentType === 'bracket') {
                               return `${p - 1 + (thirdPlace && p >= 4 ? 1 : 0)} Matches`;
                            }
                            return `${p - 1} Matches`;
                          }
                        })()}
                      </div>
                      <div className="text-xs font-bold text-orange-500 bg-orange-900/20 px-2 py-0.5 rounded border border-orange-500/30">
                        {battleLimit === 'all' 
                          ? 'MAX' 
                          : `${battleLimit} Fighters`
                        }
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">Small</span>
                      <input 
                         type="range"
                         min="0"
                         max={(() => {
                            if (tournamentType === 'bracket') {
                               const steps = [4, 8, 16, 32, 64, 128].filter(n => n <= maxBracketSize);
                               return steps.length > 1 ? steps.length - 1 : 1;
                            } else {
                               const maxVal = filteredCharacters.length - 2;
                               return maxVal > 0 ? maxVal : 1;
                            }
                         })()}
                         step="1"
                         value={(() => {
                            if (battleLimit === 'all') {
                               if (tournamentType === 'bracket') {
                                  const steps = [4, 8, 16, 32, 64, 128].filter(n => n <= maxBracketSize);
                                  return steps.length > 1 ? steps.length - 1 : 1;
                               } else {
                                  const maxVal = filteredCharacters.length - 2;
                                  return maxVal > 0 ? maxVal : 1;
                               }
                            }
                            
                            if (tournamentType === 'bracket') {
                               const steps = [4, 8, 16, 32, 64, 128].filter(n => n <= maxBracketSize);
                               if (steps.length <= 1) return 1;
                               return steps.indexOf(Number(battleLimit));
                            } else {
                               const maxVal = filteredCharacters.length - 2;
                               if (maxVal <= 0) return 1;
                               return Number(battleLimit) - 2;
                            }
                         })()}
                         onChange={(e) => {
                            const val = Number(e.target.value);
                            if (tournamentType === 'bracket') {
                               const steps = [4, 8, 16, 32, 64, 128].filter(n => n <= maxBracketSize);
                               if (steps.length <= 1) {
                                  if (steps.length > 0) setBattleLimit(String(steps[0]));
                               } else {
                                  setBattleLimit(String(steps[val]));
                               }
                            } else {
                               const maxVal = filteredCharacters.length - 2;
                               if (maxVal <= 0) {
                                  setBattleLimit(String(2));
                               } else {
                                  setBattleLimit(String(val + 2));
                               }
                            }
                         }}
                         className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <span className="text-xs text-zinc-500">Large</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-zinc-400 text-sm font-mono">
                        0 Matches
                      </div>
                      <div className="text-xs font-bold text-zinc-500 bg-zinc-900/40 px-2 py-0.5 rounded border border-zinc-700/60">
                        N/A
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Not enough fighters available to configure match limit.
                    </p>
                  </div>
                )}
              </section>
              
              {/* 3rd Place Match */}
              {tournamentType === 'bracket' && (
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
                <div className="flex justify-between items-center">
                  <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                    <Trophy size={16} /> 3rd Place Match
                  </h3>
                  <button 
                    onClick={() => setThirdPlace(!thirdPlace)}
                    className={`w-14 h-8 rounded-full p-1 transition-colors ${thirdPlace ? 'bg-orange-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${thirdPlace ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Adds a Bronze match for brackets of 4+.
                </p>
              </section>
              )}
            </div>
            
          </div>

          {/* Action Bar */}
          <div className="mt-12 flex justify-center">
            <button 
              onClick={handleStart}
              className="px-12 py-4 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-black text-xl tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(234,88,12,0.4)] hover:scale-105 hover:shadow-[0_0_50px_rgba(234,88,12,0.6)] flex items-center gap-3"
            >
              {mode === 'room' ? 'CREATE LOBBY' : 'START BATTLE'} <Swords size={24} />
            </button>
          </div>

        </div>
      </main>

      {/* Arena Selection Modal */}
      {showArenaModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-bold text-white">Select Arenas</h3>
              <button onClick={() => setShowArenaModal(false)} className="p-2 hover:bg-zinc-800 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            {/* Search */}
            <div className="px-6 pt-6 pb-2 shrink-0">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input 
                     type="text" 
                     placeholder="Search arenas..." 
                     value={arenaSearch}
                     onChange={e => setArenaSearch(e.target.value)}
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                  />
               </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Group Arenas by Folder */}
              {Array.from(new Set(availableArenas.map(a => a.folder || 'Uncategorized'))).sort().map(folderName => {
                  const folderArenas = availableArenas.filter(a => (a.folder || 'Uncategorized') === folderName);
                  
                  // Apply search filter
                  const visibleArenas = folderArenas.filter(a => {
                      if (!arenaSearch) return true;
                      return a.name.toLowerCase().includes(arenaSearch.toLowerCase());
                  });

                  if (visibleArenas.length === 0) return null;

                  const isExpanded = expandedArenaFolders.includes(folderName) || !!arenaSearch;
                  const allSelected = visibleArenas.every(a => selectedArenas.includes(a.id));
                  const someSelected = visibleArenas.some(a => selectedArenas.includes(a.id));
                  const isPartiallySelected = someSelected && !allSelected;

                  return (
                      <div key={folderName} className="border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden">
                          <div className="w-full flex items-center justify-between p-4 hover:bg-zinc-900 transition-colors">
                              <div 
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                onClick={() => {
                                    if (expandedArenaFolders.includes(folderName)) setExpandedArenaFolders(expandedArenaFolders.filter(f => f !== folderName));
                                    else setExpandedArenaFolders([...expandedArenaFolders, folderName]);
                                }}
                              >
                                  <ChevronRight className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} size={20} />
                                  <span className="font-bold text-lg">{folderName}</span>
                                  <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">{visibleArenas.length}</span>
                              </div>

                              <div 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      const visibleIds = visibleArenas.map(a => a.id);
                                      if (allSelected) {
                                          setSelectedArenas(selectedArenas.filter(id => !visibleIds.includes(id)));
                                      } else {
                                          const missing = visibleIds.filter(id => !selectedArenas.includes(id));
                                          setSelectedArenas([...selectedArenas, ...missing]);
                                      }
                                  }}
                                  className={`w-6 h-6 rounded border flex items-center justify-center transition-colors cursor-pointer ${allSelected ? 'bg-orange-500 border-orange-500' : 'border-zinc-600 hover:border-zinc-400'}`}
                              >
                                  {allSelected && <CheckCircle2 size={16} className="text-black" />}
                                  {isPartiallySelected && <Minus size={16} className="text-white" />}
                              </div>
                          </div>

                          {isExpanded && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border-t border-zinc-800">
                                  {visibleArenas.map(arena => (
                                      <div 
                                          key={arena.id}
                                          onClick={() => toggleSelection(arena.id, selectedArenas, setSelectedArenas)}
                                          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedArenas.includes(arena.id) ? 'bg-orange-900/20 border-orange-500' : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800'}`}
                                      >
                                          <div className="relative w-24 h-16 bg-black rounded-md overflow-hidden flex-shrink-0 border border-zinc-800 group-hover:border-zinc-500 transition-all">
                                              {arena.image ? (
                                                  <img src={arena.image} className="w-full h-full object-cover" alt={arena.name} />
                                              ) : arena.video ? (
                                                  <video 
                                                      src={`${arena.video}#t=0.1`} 
                                                      className="w-full h-full object-cover" 
                                                      preload="metadata"
                                                      muted
                                                      playsInline
                                                      autoPlay
                                                      loop
                                                  />
                                              ) : (
                                                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                                      <span className="text-[10px] text-zinc-700">No Image</span>
                                                  </div>
                                              )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <h4 className="font-bold text-sm text-white truncate">{arena.name}</h4>
                                              
                                              {/* Arena Tags */}
                                              <div className="mt-2 flex flex-wrap gap-1">
                                                {arena.environment?.map((env, i) => {
                                                   const Icon = {
                                                     'Volcanic': Flame,
                                                     'Aquatic': Droplets,
                                                     'Storm': CloudLightning,
                                                     'Earth': Mountain,
                                                     'Holy': Sun,
                                                     'Dark': Moon,
                                                     'Neutral': Wind
                                                   }[env as string] || Wind;
                                                   
                                                   return (
                                                      <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 flex items-center gap-1">
                                                        <Icon size={10} /> {env}
                                                      </span>
                                                   )
                                                })}
                                                {arena.weather && (
                                                   <span className="px-1.5 py-0.5 rounded bg-blue-900/20 border border-blue-500/30 text-[10px] text-blue-300 flex items-center gap-1">
                                                      <Cloud size={10} /> {arena.weather}
                                                   </span>
                                                )}
                                              </div>
                                          </div>
                                          {selectedArenas.includes(arena.id) && <CheckCircle2 className="text-orange-500" size={20} />}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )
              })}
            </div>
            
            <div className="p-6 border-t border-zinc-800 flex justify-end">
              <button 
                onClick={() => setShowArenaModal(false)}
                className="px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
              >
                Confirm ({selectedArenas.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Selection Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-bold text-white">Select Franchises</h3>
              <button onClick={() => setShowGroupModal(false)} className="p-2 hover:bg-zinc-800 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            {/* Search */}
            <div className="px-6 pt-6 pb-2 shrink-0">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input 
                     type="text" 
                     placeholder="Search groups or fighters..." 
                     value={groupSearch}
                     onChange={e => setGroupSearch(e.target.value)}
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                  />
               </div>
            </div>

            {/* Rank Filter */}
            <div className="px-6 pb-4 shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
               {RANK_ORDER.map(rank => {
                 const count = rankCounts[rank] || 0
                 const isSelected = selectedRanks.includes(rank)
                 const color = getRankColor(rank)
                 const isDisabled = count === 0

                 return (
                   <button
                     key={rank}
                     onClick={() => {
                       if (isDisabled) return
                       toggleSelection(rank, selectedRanks, setSelectedRanks)
                     }}
                     className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                       isDisabled
                         ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed opacity-60'
                         : !isSelected
                           ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                           : ''
                     }`}
                     style={
                       !isDisabled && isSelected
                         ? {
                             backgroundColor: `${color}33`,
                             borderColor: color,
                             color
                           }
                         : undefined
                     }
                   >
                     {rank} ({count})
                   </button>
                 )
               })}
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* My Groups */}
              <div className="border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden">
                <button 
                  onClick={() => {
                    if (expandedCategories.includes('my-groups')) setExpandedCategories(expandedCategories.filter(c => c !== 'my-groups'))
                    else setExpandedCategories([...expandedCategories, 'my-groups'])
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-900 transition-colors"
                >
                   <div className="flex items-center gap-3">
                      <ChevronRight className={`text-zinc-500 transition-transform ${expandedCategories.includes('my-groups') ? 'rotate-90' : ''}`} size={20} />
                      <span className="font-bold text-lg">My Groups</span>
                      <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">{userGroups.length}</span>
                   </div>
                </button>
                {expandedCategories.includes('my-groups') && (
                   <div className="border-t border-zinc-800">
                      {userGroups.length === 0 && (
                         <div className="p-8 text-center text-zinc-600 italic">
                            No custom groups created yet.
                         </div>
                      )}
                      {userGroups.map(group => {
                           const groupChars = availableCharacters.filter(c => c.groupId === group.id);
                           const isExpanded = expandedGroups.includes(group.id);
                           const isSelected = selectedGroups.includes(group.id);
                           const visibleExcludedCount = groupChars.filter(c => excludedFighters.includes(c.id)).length;
                           const isFullySelected = isSelected && visibleExcludedCount === 0;
                           const isPartiallySelected = isSelected && visibleExcludedCount > 0 && visibleExcludedCount < groupChars.length;
                           
                           return (
                             <div key={group.id} className="border-b border-zinc-800 last:border-0">
                                <div className={`flex items-center p-3 hover:bg-zinc-900 transition-colors ${isSelected ? 'bg-orange-900/5' : ''}`}>
                                   <button 
                                      onClick={() => {
                                         if (expandedGroups.includes(group.id)) setExpandedGroups(expandedGroups.filter(id => id !== group.id));
                                         else setExpandedGroups([...expandedGroups, group.id]);
                                      }}
                                      className="p-2 mr-2 text-zinc-500 hover:text-white"
                                   >
                                      <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                   </button>
                                   
                                   <div className="flex-1 cursor-pointer" onClick={() => {
                                         if (expandedGroups.includes(group.id)) setExpandedGroups(expandedGroups.filter(id => id !== group.id));
                                         else setExpandedGroups([...expandedGroups, group.id]);
                                   }}>
                                      <div className="font-bold text-zinc-200">{group.name}</div>
                                      <div className="text-xs text-zinc-500">
                                        {groupChars.length - visibleExcludedCount} / {groupChars.length} Fighters
                                      </div>
                                   </div>

                                   <div 
                                      onClick={() => {
                                         if (isSelected) {
                                            setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                                            const allGroupCharIds = availableCharacters.filter(c => c.groupId === group.id).map(c => c.id);
                                            setExcludedFighters(excludedFighters.filter(id => !allGroupCharIds.includes(id)));
                                         } else {
                                            setSelectedGroups([...selectedGroups, group.id]);
                                            const allGroupCharIds = availableCharacters.filter(c => c.groupId === group.id).map(c => c.id);
                                            setExcludedFighters(excludedFighters.filter(id => !allGroupCharIds.includes(id)));
                                         }
                                      }}
                                      className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-zinc-600 hover:border-zinc-400'}`}
                                   >
                                      {isFullySelected && <CheckCircle2 size={14} className="text-white" />}
                                      {isPartiallySelected && <Minus size={14} className="text-white" />}
                                   </div>
                                </div>
                                
                                {isExpanded && (
                                   <div className="pl-14 pr-4 py-2 bg-black/20 space-y-1">
                                      {groupChars.map(char => {
                                         const isCharExcluded = excludedFighters.includes(char.id);
                                         const isCharSelected = isSelected && !isCharExcluded;
                                         
                                         return (
                                            <div key={char.id} className="flex items-center justify-between py-1 group/char">
                                               <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <span className={`text-sm truncate ${isCharSelected ? 'text-zinc-300' : 'text-zinc-600'}`}>{char.name}</span>
                                               </div>
                                               <div 
                                                  onClick={() => {
                                                     if (isCharSelected) {
                                                        setExcludedFighters([...excludedFighters, char.id]);
                                                     } else {
                                                        setExcludedFighters(excludedFighters.filter(id => id !== char.id));
                                                        if (!selectedGroups.includes(group.id)) {
                                                           setSelectedGroups([...selectedGroups, group.id]);
                                                        }
                                                     }
                                                  }}
                                                  className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${isCharSelected ? 'bg-orange-600 border-orange-600' : 'border-zinc-700 hover:border-zinc-500'}`}
                                               >
                                                  {isCharSelected && <CheckCircle2 size={12} className="text-white" />}
                                               </div>
                                            </div>
                                         )
                                      })}
                                   </div>
                                )}
                             </div>
                           )
                      })}
                   </div>
                )}
              </div>

              {/* Mega Fight Groups */}
              <div className="border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden">
                <button 
                  onClick={() => {
                    if (expandedCategories.includes('mega')) setExpandedCategories(expandedCategories.filter(c => c !== 'mega'))
                    else setExpandedCategories([...expandedCategories, 'mega'])
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-900 transition-colors"
                >
                   <div className="flex items-center gap-3">
                      <ChevronRight className={`text-zinc-500 transition-transform ${expandedCategories.includes('mega') ? 'rotate-90' : ''}`} size={20} />
                      <span className="font-bold text-lg">Mega Fight Groups</span>
                      <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">{franchiseGroups.length}</span>
                   </div>
                   {/* Aggregator Checkbox */}
                   <div 
                      onClick={(e) => {
                         e.stopPropagation();
                         const allIds = franchiseGroups.map(g => g.id);
                         const allSelected = allIds.every(id => selectedGroups.includes(id));
                         if (allSelected) {
                            setSelectedGroups(selectedGroups.filter(id => !allIds.includes(id)));
                         } else {
                            // Add missing ones
                            const missing = allIds.filter(id => !selectedGroups.includes(id));
                            setSelectedGroups([...selectedGroups, ...missing]);
                            // Also clear exclusions for these groups? Yes, usually selecting a group implies full selection.
                            // But we should only clear exclusions for the NEWLY selected groups to be safe, or just all of them?
                            // Simpler: Clear exclusions for ALL Mega Fight groups if we are doing a "Select All".
                            // If we are selecting all, we want ALL fighters.
                            const allMegaCharIds = availableCharacters.filter(c => allIds.includes(c.groupId)).map(c => c.id);
                            setExcludedFighters(excludedFighters.filter(id => !allMegaCharIds.includes(id)));
                         }
                      }}
                      className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${franchiseGroups.length > 0 && franchiseGroups.every(g => selectedGroups.includes(g.id)) ? 'bg-orange-500 border-orange-500' : 'border-zinc-600 hover:border-zinc-400'}`}
                   >
                      {franchiseGroups.length > 0 && franchiseGroups.every(g => selectedGroups.includes(g.id)) && <CheckCircle2 size={16} className="text-black" />}
                   </div>
                </button>
                
                {expandedCategories.includes('mega') && (
                   <div className="border-t border-zinc-800">
                      {franchiseGroups
                       .filter(g => {
                          // Filter by Rank first (if active)
                          if (selectedRanks.length > 0) {
                             const groupChars = availableCharacters.filter(c => c.groupId === g.id);
                             const hasVisibleChars = groupChars.some(c => 
                                c.stages.some(s => selectedRanks.includes(getStageRank(s)))
                             );
                             if (!hasVisibleChars) return false;
                          }

                          if (!groupSearch) return true;
                          const search = groupSearch.toLowerCase();
                          if (g.name.toLowerCase().includes(search)) return true;
                          const groupChars = availableCharacters.filter(c => c.groupId === g.id);
                          return groupChars.some(c => c.name.toLowerCase().includes(search));
                       })
                       .map(group => {
                          // Filter characters based on Rank (keep char if ANY stage matches)
                          const groupChars = availableCharacters.filter(c => {
                             if (c.groupId !== group.id) return false;
                             if (selectedRanks.length > 0) {
                                return c.stages.some(s => selectedRanks.includes(getStageRank(s)));
                             }
                             return true;
                          });
                           
                           const isExpanded = expandedGroups.includes(group.id) || !!groupSearch;
                           
                           const isSelected = selectedGroups.includes(group.id);
                           // Count excluded fighters for this group (only visible ones matters for UI, but logic handles all)
                           // Actually, for the UI "Partially Selected" state, we should check if ALL visible chars are selected.
                           
                           const visibleExcludedCount = groupChars.filter(c => excludedFighters.includes(c.id)).length;
                           const isFullySelected = isSelected && visibleExcludedCount === 0;
                           const isPartiallySelected = isSelected && visibleExcludedCount > 0 && visibleExcludedCount < groupChars.length;
                           
                           return (
                             <div key={group.id} className="border-b border-zinc-800 last:border-0">
                                <div className={`flex items-center p-3 hover:bg-zinc-900 transition-colors ${isSelected ? 'bg-orange-900/5' : ''}`}>
                                   <button 
                                      onClick={() => {
                                         if (expandedGroups.includes(group.id)) setExpandedGroups(expandedGroups.filter(id => id !== group.id));
                                         else setExpandedGroups([...expandedGroups, group.id]);
                                      }}
                                      className="p-2 mr-2 text-zinc-500 hover:text-white"
                                   >
                                      <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                   </button>
                                   
                                   <div className="flex-1 cursor-pointer" onClick={() => {
                                         if (expandedGroups.includes(group.id)) setExpandedGroups(expandedGroups.filter(id => id !== group.id));
                                         else setExpandedGroups([...expandedGroups, group.id]);
                                   }}>
                                      <div className="font-bold text-zinc-200">{group.name}</div>
                                     <div className="text-xs text-zinc-500">
                                       {groupChars.length - visibleExcludedCount} / {groupChars.length} Fighters
                                       {selectedRanks.length > 0 && <span className="ml-1 text-orange-500">(Filtered)</span>}
                                     </div>
                                  </div>

                                   <div 
                                      onClick={() => {
                                         if (isSelected) {
                                            // Deselect group
                                            setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                                            // Clear exclusions for this group
                                            const allGroupCharIds = availableCharacters.filter(c => c.groupId === group.id).map(c => c.id);
                                            setExcludedFighters(excludedFighters.filter(id => !allGroupCharIds.includes(id)));
                                         } else {
                                            // Select group
                                            setSelectedGroups([...selectedGroups, group.id]);
                                            
                                            // Handle Smart Selection (Filter Awareness)
                                            const allGroupChars = availableCharacters.filter(c => c.groupId === group.id);
                                            const visibleIds = groupChars.map(c => c.id);
                                            const hiddenIds = allGroupChars.filter(c => !visibleIds.includes(c.id)).map(c => c.id);
                                            
                                            const newExcluded = new Set(excludedFighters);
                                            // Exclude hidden ones (so they don't get selected implicitly)
                                            hiddenIds.forEach(id => newExcluded.add(id));
                                            // Include visible ones (remove from exclusion)
                                            visibleIds.forEach(id => newExcluded.delete(id));
                                            
                                            setExcludedFighters(Array.from(newExcluded));
                                         }
                                      }}
                                      className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-zinc-600 hover:border-zinc-400'}`}
                                   >
                                      {isFullySelected && <CheckCircle2 size={14} className="text-white" />}
                                      {isPartiallySelected && <Minus size={14} className="text-white" />}
                                   </div>
                                </div>
                                
                                {isExpanded && (
                                   <div className="pl-14 pr-4 py-2 bg-black/20 space-y-1">
                                      {(() => {
                                        const rankedGroupChars = groupChars
                                          .map(char => {
                                            const charStages = char.stages || [];
                                            const visibleStages = selectedRanks.length > 0
                                              ? charStages.filter(s => selectedRanks.includes(getStageRank(s)))
                                              : charStages;
                                            let groupingRank: RankType = 'C';
                                            if (visibleStages.length > 0) {
                                              const strongest = visibleStages.reduce((prev, curr) => {
                                                const prevTotal = Object.values(prev.stats || {}).reduce((a: any, b: any) => (Number(a)||0) + (Number(b)||0), 0) as number;
                                                const currTotal = Object.values(curr.stats || {}).reduce((a: any, b: any) => (Number(a)||0) + (Number(b)||0), 0) as number;
                                                return currTotal > prevTotal ? curr : prev;
                                              }, visibleStages[0]);
                                              groupingRank = getStageRank(strongest);
                                            } else {
                                              groupingRank = getCharacterRank(char);
                                            }
                                            return { char, rank: groupingRank };
                                          })
                                          .sort((a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank));

                                        let lastRank: RankType | null = null;
                                        return rankedGroupChars.map(({ char, rank }) => {
                                          const rankColor = getRankColor(rank);
                                          const isCharExcluded = excludedFighters.includes(char.id);
                                          const isCharSelected = isSelected && !isCharExcluded;
                                          const isCharExpanded = expandedCharacters.includes(char.id);
                                          const charStages = char.stages || [];
                                          const visibleStageIndices = charStages
                                            .map((s, i) => ({ s, i }))
                                            .filter(({ s }) => selectedRanks.length === 0 || selectedRanks.includes(getStageRank(s)))
                                            .map(({ i }) => i);
                                          const excludedVisibleCount = visibleStageIndices.filter(idx => excludedStages.includes(`${char.id}:${idx}`)).length;
                                          const isFullyStagesSelected = excludedVisibleCount === 0;
                                          const isPartiallyStagesSelected = excludedVisibleCount > 0 && excludedVisibleCount < visibleStageIndices.length;

                                          return (
                                            <div key={char.id} className="flex flex-col">
                                              {lastRank !== rank && (
                                                <div className="flex items-center gap-2 py-2">
                                                  <span
                                                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                                                    style={{
                                                      color: rankColor,
                                                      borderColor: `${rankColor}40`,
                                                      backgroundColor: `${rankColor}10`
                                                    }}
                                                  >
                                                    {rank}
                                                  </span>
                                                  <span className="text-[10px] text-zinc-600">Rank</span>
                                                </div>
                                              )}
                                              {(() => { lastRank = rank; return null })()}
                                              <div className="flex items-center justify-between py-1 group/char">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  {charStages.length > 1 && (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isCharExpanded) setExpandedCharacters(expandedCharacters.filter(id => id !== char.id));
                                                        else setExpandedCharacters([...expandedCharacters, char.id]);
                                                      }}
                                                      className="p-1 text-zinc-600 hover:text-zinc-300"
                                                    >
                                                      <ChevronRight size={12} className={`transition-transform ${isCharExpanded ? 'rotate-90' : ''}`} />
                                                    </button>
                                                  )}
                                                  <span className={`text-sm truncate ${isCharSelected ? 'text-zinc-300' : 'text-zinc-600'}`}>{char.name}</span>
                                                </div>

                                                <div
                                                  onClick={() => {
                                                    if (isCharSelected) {
                                                      setExcludedFighters([...excludedFighters, char.id]);
                                                    } else {
                                                      setExcludedFighters(excludedFighters.filter(id => id !== char.id));
                                                      if (!selectedGroups.includes(group.id)) {
                                                        setSelectedGroups([...selectedGroups, group.id]);
                                                      }
                                                    }
                                                  }}
                                                  className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${isCharSelected ? 'bg-orange-600 border-orange-600' : 'border-zinc-700 hover:border-zinc-500'}`}
                                                >
                                                  {isCharSelected && isFullyStagesSelected && <CheckCircle2 size={12} className="text-white" />}
                                                  {isCharSelected && isPartiallyStagesSelected && <Minus size={12} className="text-white" />}
                                                </div>
                                              </div>

                                              {isCharExpanded && charStages.length > 1 && (
                                                <div className="pl-6 pr-2 py-1 space-y-1 border-l border-zinc-800 ml-2">
                                                  {charStages.map((stage, idx) => {
                                                    const stageId = `${char.id}:${idx}`;
                                                    const isStageExcluded = excludedStages.includes(stageId);
                                                    const isStageSelected = isCharSelected && !isStageExcluded;
                                                    const stageRank = getStageRank(stage);
                                                    if (selectedRanks.length > 0 && !selectedRanks.includes(stageRank)) return null;
                                                    const stageRankColor = getRankColor(stageRank);
                                                    return (
                                                      <div key={idx} className="flex items-center justify-between py-0.5">
                                                        <div className="flex items-center gap-2">
                                                          <span
                                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                                            style={{
                                                              color: stageRankColor,
                                                              borderColor: `${stageRankColor}40`,
                                                              backgroundColor: `${stageRankColor}10`
                                                            }}
                                                          >
                                                            {stageRank}
                                                          </span>
                                                          <span className={`text-xs ${isStageSelected ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                                            {stage.stage}
                                                          </span>
                                                        </div>
                                                        <div
                                                          onClick={() => {
                                                            if (isStageSelected) {
                                                              setExcludedStages([...excludedStages, stageId]);
                                                            } else {
                                                              setExcludedStages(excludedStages.filter(id => id !== stageId));
                                                              if (excludedFighters.includes(char.id)) {
                                                                setExcludedFighters(excludedFighters.filter(id => id !== char.id));
                                                                if (!selectedGroups.includes(group.id)) {
                                                                  setSelectedGroups([...selectedGroups, group.id]);
                                                                }
                                                              }
                                                            }
                                                          }}
                                                          className={`w-3 h-3 rounded border flex items-center justify-center cursor-pointer ${isStageSelected ? 'bg-zinc-700 border-zinc-600' : 'border-zinc-800 hover:border-zinc-600'}`}
                                                        >
                                                          {isStageSelected && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                                                        </div>
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })
                                      })()}
                                   </div>
                                )}
                             </div>
                           )
                        })}
                   </div>
                )}
              </div>



            </div>
            
            <div className="p-6 border-t border-zinc-800 flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                 <span className="text-sm text-zinc-500">Total Selected</span>
                 <span className="text-xl font-bold text-white">{filteredCharacters.length} <span className="text-xs font-normal text-zinc-600">Fighters</span></span>
              </div>
              <button 
                onClick={() => setShowGroupModal(false)}
                className="px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
              >
                Confirm ({selectedGroups.length} Groups)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
