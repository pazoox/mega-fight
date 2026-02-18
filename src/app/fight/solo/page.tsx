'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Character, Arena, Challenge, TeamConfig } from '@/types'
import { CharacterCard } from '@/components/CharacterCard'
import { calculateArenaModifiers, getScaledStats } from '@/utils/fightUtils'
import { runBattleAnalysis } from '@/lib/battleEngine'
import { generateBracket, generateMatchQueue, BattleSession, Match, Team } from '@/lib/tournament'
import { calculateRank } from '@/utils/statTiers'
import { Swords, MapPin, Trophy, Crown, ArrowRight, RefreshCw, Zap, Shield, LogOut, HelpCircle, BarChart2, Maximize, Minimize } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue } from 'framer-motion'
import { ChampionBracketView, BattleLeaderboardView, VsBadge } from './components'
import { BattleSimulation } from './components/BattleSimulation'
import { GameRulesModal } from './components/GameRulesModal'
import { BattleSimulationModal } from './components/BattleSimulationModal'

// -- Helpers --

function generateLastOneStanding(
  characters: Character[],
  teamSize: '1x1' | '2v2' | '3v3' | '4v4',
  limit: number,
  stageMode: 'random' | 'unique' | 'weakest' | 'strongest',
  excludedStages: string[]
){
  const size = teamSize === '4v4' ? 4 : teamSize === '3v3' ? 3 : teamSize === '2v2' ? 2 : 1

  let pool = [...characters]

  const minChars = size * 2
  if (pool.length < minChars && characters.length > 0) {
    while (pool.length < minChars) {
      const rnd = characters[Math.floor(Math.random() * characters.length)]
      pool.push(rnd)
    }
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5)

  const teams: Team[] = []
  while (shuffled.length >= size) {
    const members: Character[] = []
    for (let i = 0; i < size; i++) {
      const next = shuffled.pop()
      if (next) members.push(next)
    }
    if (members.length === size) {
      teams.push({
        id: `team-${teams.length}-${Math.random().toString(36).substr(2, 5)}`,
        name: members.map(c => c.name).join(' & '),
        members
      })
    }
  }

  if (teams.length < 2) {
    throw new Error('Not enough teams for Last Standing mode')
  }

  let usedTeams = teams
  if (limit && limit > 1) {
    usedTeams = teams.slice(0, Math.min(limit, teams.length))
  }

  const [first, second, ...remaining] = usedTeams

  const firstMatch: Match = {
    id: `match-${Math.random().toString(36).substr(2, 9)}`,
    p1: first,
    p2: second,
    winner: null,
    round: 0
  }

  return {
    matches: [firstMatch],
    currentMatchIndex: 0,
    history: [],
    champion: null,
    type: 'last-standing',
    remainingTeams: remaining
  }
}

// -- Challenge Helpers --

function generateChallengeTeam(
  config: TeamConfig, 
  allCharacters: Character[], 
  excludedIds: Set<string>
): Team {
  const members: Character[] = []
  
  // 1. Specific Character
  if (config.characterId) {
    const char = allCharacters.find(c => c.id === config.characterId)
    if (char) {
      members.push(char)
      excludedIds.add(char.id)
    }
  }

    // 2. Fill remaining slots
  const needed = config.count - members.length
  if (needed > 0) {
    // Filter pool
      let pool = Array.isArray(allCharacters) ? allCharacters.filter(c => !excludedIds.has(c.id)) : []
    
    if (config.groupId) {
      pool = pool.filter(c => c.groupId === config.groupId)
    }

    // -- Rank Filters (Based on Total Stats) --
    // If NOT using PowerScale (Canon), we filter by Rank/Stats
    if (!config.usePowerScale) {
       // Check for Min/Max Total Stats (which maps to Rank)
       // The user UI might send 'minRank'/'maxRank' as values or keys.
       // But based on user input: "total pwr e filtrei por la" -> "setei o filtro para Time B pwr>10000 e time b<9990"
       // This suggests we need to check if 'powerRange' is being used for STATS when usePowerScale is FALSE.
       // Or maybe the user is using the "Rank" slider which actually sets min/max stats?
       
       // Let's assume if usePowerScale is false, powerRange refers to Total Stats (0-16000+)
       // And if usePowerScale is true, powerRange refers to Canon Scale (0-1000)
       
       if (config.powerRange) {
          pool = pool.filter(c => {
             const maxStats = Math.max(...c.stages.map(s => 
                Object.values(s.stats).reduce((a, b) => (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0), 0) as number
             ));
             return maxStats >= (config.powerRange?.min || 0) && maxStats <= (config.powerRange?.max || 99999);
          });
       }
       
       // Explicit Rank Selection (S+, S, A...)
       if (config.selectedRanks && config.selectedRanks.length > 0) {
          pool = pool.filter(c => {
             const maxStats = Math.max(...c.stages.map(s => 
                Object.values(s.stats).reduce((a, b) => (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0), 0) as number
             ));
             const rank = calculateRank(maxStats);
             return config.selectedRanks!.includes(rank);
          });
       }
    }

    // -- Power Scale Filters (no Canon Scale) --
    // Align with removal of canon_scale: use max stage stats range when powerScale is enabled
    if (config.usePowerScale && config.powerRange) {
        pool = pool.filter(c => {
            const maxStats = Math.max(...c.stages.map(s => 
                Object.values(s.stats).reduce((a, b) => (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0), 0) as number
            ));
            return maxStats >= (config.powerRange?.min || 0) && maxStats <= (config.powerRange?.max || 99999);
        });
    }

    // -- Tag Filters --
    if (config.tags) {
        if (config.tags.include && config.tags.include.length > 0) {
             pool = pool.filter(c => {
                 const charTags = new Set<string>();
                 c.stages.forEach(s => {
                     s.tags.combatClass.forEach(t => charTags.add(t));
                     s.tags.movement.forEach(t => charTags.add(t));
                     charTags.add(s.tags.composition);
                     charTags.add(s.tags.size);
                     s.tags.source.forEach(t => charTags.add(t));
                     s.tags.element.forEach(t => charTags.add(t));
                 });
                 // Check if character has ANY of the included tags
                 return config.tags!.include.some(tag => charTags.has(tag));
             });
        }
        
        if (config.tags.exclude && config.tags.exclude.length > 0) {
             pool = pool.filter(c => {
                 const charTags = new Set<string>();
                 c.stages.forEach(s => {
                     s.tags.combatClass.forEach(t => charTags.add(t));
                     s.tags.movement.forEach(t => charTags.add(t));
                     charTags.add(s.tags.composition);
                     charTags.add(s.tags.size);
                     s.tags.source.forEach(t => charTags.add(t));
                     s.tags.element.forEach(t => charTags.add(t));
                 });
                 // If any excluded tag is present, remove character
                 return !config.tags!.exclude.some(tag => charTags.has(tag));
             });
        }
    }
    
    // Shuffle and pick
    pool = pool.sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < needed && i < pool.length; i++) {
      const char = pool[i]
      members.push(char)
      excludedIds.add(char.id)
    }
  }
  
  return {
    id: `team-${Math.random().toString(36).substr(2, 9)}`,
    name: config.name || members.map(c => c.name).join(' & '),
    members
  }
}

function generateChallengeTournament(challenge: Challenge, allCharacters: Character[]): BattleSession {
  const excludedIds = new Set<string>()
  
  // Default configs if missing
  const configA = challenge.config.teamA || { type: 'player', count: 1 }
  const configB = challenge.config.teamB || { type: 'cpu', count: 1 }

  const teamA = generateChallengeTeam(configA, allCharacters, excludedIds)
  const teamB = generateChallengeTeam(configB, allCharacters, excludedIds)
  
  const match: Match = {
    id: `match-${Math.random().toString(36).substr(2, 9)}`,
    p1: teamA,
    p2: teamB,
    winner: null,
    round: 0
  }
  
  return {
    matches: [match],
    currentMatchIndex: 0,
    history: [],
    champion: null,
    type: 'queue' 
  }
}

function SoloFightContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // -- Config from URL --
  const challengeId = searchParams.get('challengeId')
  const teamSize = (searchParams.get('teamSize') as '1x1' | '2v2' | '3v3' | '4v4') || '1x1'
  const powerScale = searchParams.get('powerScale') === 'true'
  const arenaMode = searchParams.get('arenaMode') || 'all'
  const selectedArenasIdsStr = searchParams.get('arenas') // Keep as string for stable dependency
  const groupMode = searchParams.get('groupMode') || 'all'
  const selectedGroupsIdsStr = searchParams.get('groups') // Keep as string for stable dependency
  const enableThirdPlace = searchParams.get('thirdPlace') !== 'false' // Default to true as per user request
  const limit = searchParams.get('limit')
  const tournamentType = searchParams.get('tournamentType') || 'bracket'
  const stageSelectionMode = (searchParams.get('stageSelectionMode') as 'random' | 'unique' | 'weakest' | 'strongest') || 'random'
  const excludedStagesStr = searchParams.get('excludedStages') // Keep as string for stable dependency
  const modifiersEnabled = searchParams.get('modifiers') !== 'false' // Default true

  // -- Data State --
  const [characters, setCharacters] = useState<Character[]>([])
  const [arenas, setArenas] = useState<Arena[]>([])
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState(0)
  const [loadingTarget, setLoadingTarget] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [statsUpdated, setStatsUpdated] = useState(false)

  // -- Shared Motion Values for 2v2 Teams --
  const p1TeamX = useMotionValue(0);
  const p1TeamY = useMotionValue(0);
  const p2TeamX = useMotionValue(0);
  const p2TeamY = useMotionValue(0);

  // -- Global Flip State for Poker Layout (4v4+) --
  const [globalFlipP1, setGlobalFlipP1] = useState(false);
  const [globalFlipP2, setGlobalFlipP2] = useState(false);

  const handleTeamMouseMove = (e: React.MouseEvent<HTMLDivElement>, x: any, y: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  }

  const handleTeamMouseLeave = (x: any, y: any) => {
    x.set(0);
    y.set(0);
  }

  // -- Battle Session State --
  const [tournament, setTournament] = useState<BattleSession | null>(null)
  const [currentArena, setCurrentArena] = useState<Arena | null>(null)
  const [matchWinner, setMatchWinner] = useState<Team | null>(null) // Winner of current match (before advancing)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [isSimulationOpen, setIsSimulationOpen] = useState(false)
  
  // Safety Ref for Auto-Skip Loop
  const autoSkipCount = React.useRef(0);
  const [autoSkipError, setAutoSkipError] = useState<string | null>(null);
  const [manualResolutionNeeded, setManualResolutionNeeded] = useState(false);
  
  // -- Champion View State --
  const [championPhase, setChampionPhase] = useState<'bracket' | 'stats'>('bracket')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  // -- Match Data (Safe access for Hooks) --
  const match = tournament?.matches[tournament.currentMatchIndex]
  const p1Team = match?.p1
  const p2Team = match?.p2

  // Helper for dynamic card sizing (Boss Fight support)
  const p1Count = p1Team?.members?.length ?? 0
  const p2Count = p2Team?.members?.length ?? 0
  const isP1Compact = p1Count > 1
  const isP2Compact = p2Count > 1
  
  const getTeamScale = (count: number) => {
    if (count >= 4) return 0.75
    if (count === 3) return 0.82
    if (count === 2) return 1
    return 1
  }

  // Layout Helpers
  const isCompactLayout = p1Count >= 2 || p2Count >= 2;
  const isPokerLayoutP1 = p1Count >= 3;
  const isPokerLayoutP2 = p2Count >= 3;
  const isGridP1 = false; // Deprecated in favor of Poker Layout
  const isGridP2 = false; // Deprecated in favor of Poker Layout

  // Calculate Active Modifiers and Max Stats for UI Scaling
  // MOVED UP: To avoid "Rendered more hooks than during the previous render" error
  const uniqueStageMapRef = React.useRef<Map<string, number>>(new Map());
  const { activeModifiers, maxStatValue, p1BattleStats, p2BattleStats, p1Modifiers, p2Modifiers, modifiersMap, maxSimulationValue, stageIndexMap } = React.useMemo(() => {
    if (!p1Team || !p2Team) return { activeModifiers: [], maxStatValue: 1000, p1BattleStats: null, p2BattleStats: null, p1Modifiers: undefined, p2Modifiers: undefined, modifiersMap: new Map(), maxSimulationValue: 2000, stageIndexMap: new Map<string, number>() }

    const allParticipants = [...p1Team.members, ...p2Team.members];
    
    // --- STEP 1: CALCULATE BASE STATS (Scaled by Tier) ---
    // We do this FIRST so we can equalize "Raw Power" before Arena Buffs apply.
    const participantsStats = allParticipants.map(char => {
       if (!char) return { id: 'unknown', stats: { hp: 0, str: 0, def: 0, sta: 0, sp_atk: 0, int: 0, spd: 0, atk_spd: 0 }, equalizationBuff: null };
       // Determine stage index based on selection mode and exclusions
       const excluded = (excludedStagesStr?.split(',') || []);
       const stageIndices = char.stages.map((_, idx) => idx).filter(idx => !excluded.includes(`${char.id}:${idx}`));
       const total = (s: any) => Object.values(s.stats || {}).reduce((a: any, b: any) => (Number(a)||0) + (Number(b)||0), 0) as number;
       let stageIndex = 0;
       if (stageIndices.length > 0) {
          if (stageSelectionMode === 'weakest') {
            stageIndex = stageIndices.reduce((minIdx, idx) => total(char.stages[idx]) < total(char.stages[minIdx]) ? idx : minIdx, stageIndices[0]);
          } else if (stageSelectionMode === 'strongest') {
            stageIndex = stageIndices.reduce((maxIdx, idx) => total(char.stages[idx]) > total(char.stages[maxIdx]) ? idx : maxIdx, stageIndices[0]);
          } else if (stageSelectionMode === 'unique') {
            const map = uniqueStageMapRef.current;
            const existing = map.get(char.id);
            if (typeof existing === 'number' && stageIndices.includes(existing)) {
              stageIndex = existing;
            } else {
              stageIndex = stageIndices[Math.floor(Math.random() * stageIndices.length)];
              map.set(char.id, stageIndex);
            }
          } else {
            stageIndex = stageIndices[Math.floor(Math.random() * stageIndices.length)];
          }
       }
       return {
          id: char.id,
          stats: getScaledStats(char, stageIndex, powerScale),
          equalizationBuff: null as any,
          stageIndex
       };
    });

    // --- STEP 2: POWER EQUALIZATION (On Base Stats) ---
    if (powerScale) {
      const statsKeys = ['hp', 'str', 'def', 'sta', 'sp_atk', 'int', 'spd', 'atk_spd'] as const;
      const getPWR = (s: any) => statsKeys.reduce((acc, key) => acc + (s[key] || 0), 0);

      // Find Max PWR in the match (from Scaled Base Stats)
      let maxPWR = 0;
      participantsStats.forEach(p => {
          const pwr = getPWR(p.stats);
          if (pwr > maxPWR) maxPWR = pwr;
      });

      // Apply Boost to anyone below Max PWR
      participantsStats.forEach(p => {
          const pwr = getPWR(p.stats);
          if (pwr < maxPWR) {
              const diff = maxPWR - pwr;
              const boost = Math.round(diff / 8);
              
              // Apply boost to the base stats
              statsKeys.forEach(key => {
                  if (typeof p.stats[key] === 'number') {
                      (p.stats as any)[key] += boost;
                  }
              });

              // Record the buff for UI
              p.equalizationBuff = {
                 label: 'Power Equalization',
                 value: 1, 
                 category: 'Magic',
                 trigger: 'System',
                 stats: ['ALL']
              };
          }
      });
    }

    // --- STEP 3: APPLY ARENA MODIFIERS ---
    // Now we pass the Equalized Stats as the "Base" for the Arena to modify.
    // We pass powerScale=false because we already scaled them in Step 1.
    const allModifiers = allParticipants.map((char, idx) => {
      const pStats = participantsStats[idx];
      
      // Determine Teammates and Opponents
      const isP1 = p1Team.members.some(m => m.id === char.id);
      const myTeam = isP1 ? p1Team : p2Team;
      const enemyTeam = isP1 ? p2Team : p1Team;
      
      const teammates = myTeam.members.filter(m => m.id !== char.id);
      const opponents = enemyTeam.members;

      // Run Battle Analysis (Unified Rule Engine)
      const analysis = runBattleAnalysis({
        character: char,
        stageIndex: pStats.stageIndex ?? 0,
        arena: modifiersEnabled ? currentArena : null,
        teammates: modifiersEnabled ? teammates : [],
        opponents: modifiersEnabled ? opponents : [],
        baseStatsOverride: pStats.stats
      });

      // Convert to UI format (ArenaModifiers)
      const buffs = analysis.modifiers
        .filter(m => (m.type === 'flat' ? m.value > 0 : m.value >= 1))
        .map(m => ({
          ...m,
          stats: m.targetStat === 'all' ? ['ALL'] : [typeof m.targetStat === 'string' ? m.targetStat.toUpperCase() : '']
        }));
        
      const nerfs = analysis.modifiers
        .filter(m => (m.type === 'flat' ? m.value < 0 : m.value < 1))
        .map(m => ({
          ...m,
          stats: m.targetStat === 'all' ? ['ALL'] : [typeof m.targetStat === 'string' ? m.targetStat.toUpperCase() : '']
        }));

      const mods = {
        stats: analysis.finalStats,
        buffs: buffs,
        nerfs: nerfs
      };

      // Inject the Equalization Buff into the result so it shows in UI
      if (pStats.equalizationBuff) {
          mods.buffs.push(pStats.equalizationBuff);
      }
      
      return mods;
    });

    // Capture stats for P1 and P2
    // For 1v1, this is just the first member.
    // For 2v2+, we need to AGGREGATE stats for the Simulation to show Team Power.
    const p1TeamMods = allModifiers.slice(0, p1Team.members.length);
    const p2TeamMods = allModifiers.slice(p1Team.members.length);

    const sumStats = (mods: any[]) => {
       const acc = { hp: 0, str: 0, def: 0, sta: 0, sp_atk: 0, int: 0, spd: 0, atk_spd: 0 };
       mods.forEach(m => {
          if (!m || !m.stats) return;
          const s = m.stats;
          acc.hp += (s.hp || 0);
          acc.str += (s.str || 0);
          acc.def += (s.def || 0);
          acc.sta += (s.sta || 0);
          acc.sp_atk += (s.sp_atk || 0);
          acc.int += (s.int || 0);
          acc.spd += (s.spd || 0);
          acc.atk_spd += (s.atk_spd || 0);
       });
       return acc;
    };

    const p1AggStats = sumStats(p1TeamMods);
    const p2AggStats = sumStats(p2TeamMods);

    // Keep individual mods for Card displays (buffs/nerfs)
    const p1Mods = allModifiers[0]; 
    const p2Mods = allModifiers[p1Team.members.length];

    // 2. Determine Max Stat Value for INDIVIDUAL scaling bars (Character Cards)
    let maxVal = 2000; 
    if (powerScale) {
       // Find the highest single stat value across all characters (now equalized AND buffed)
       let absoluteMax = 0;
       allModifiers.forEach(mod => {
          const stats = Object.values(mod.stats);
          const numericStats = stats.filter(v => typeof v === 'number') as number[];
          const charMax = Math.max(...numericStats);
          if (charMax > absoluteMax) absoluteMax = charMax;
       });
       maxVal = Math.max(absoluteMax, 2000); 
    }

    // 3. Determine Max Stat Value for SIMULATION (Aggregated)
    let maxSimVal = 2000;
    const allAggStats = [...Object.values(p1AggStats), ...Object.values(p2AggStats)] as number[];
    const maxAgg = Math.max(...allAggStats);
    maxSimVal = Math.max(maxAgg, 2000);

    // 3. Extract active arena modifiers (only if arena exists)
    let modifiersList: any[] = [];
    if (currentArena) {
        // Proper aggregation:
        const aggregatedMods = allModifiers.flatMap(mod => [
            ...mod.buffs.map(b => ({ ...b, type: 'buff' as const })),
            ...mod.nerfs.map(n => ({ ...n, type: 'nerf' as const }))
        ]);

        // Deduplicate
        const uniqueMap = new Map();
        aggregatedMods.forEach(m => {
          // Skip Power Equalization in the Global Arena HUD to avoid clutter? 
          // Or keep it? User might want to see it. 
          // Let's keep it but maybe it shouldn't look like an Environment effect.
          // The previous code kept it.
          const key = `${m.label}-${m.trigger}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, m);
          }
        });

        modifiersList = Array.from(uniqueMap.values()).sort((a, b) => {
          if (a.type !== b.type) return a.type === 'buff' ? -1 : 1; 
          return a.label.localeCompare(b.label);
        });
    }

    // Create Map for JSX
    const modMap = new Map<string, any>();
    const stageMap = new Map<string, number>();
    allParticipants.forEach((char, idx) => {
        modMap.set(char.id, allModifiers[idx]);
        const sIdx = participantsStats[idx]?.stageIndex ?? 0;
        stageMap.set(char.id, sIdx);
    });

    return { activeModifiers: modifiersList, maxStatValue: maxVal, p1BattleStats: p1AggStats, p2BattleStats: p2AggStats, p1Modifiers: p1Mods, p2Modifiers: p2Mods, modifiersMap: modMap, maxSimulationValue: maxSimVal, stageIndexMap: stageMap };
  }, [p1Team, p2Team, currentArena, powerScale, stageSelectionMode, excludedStagesStr]);

  React.useEffect(() => {
    if (stageSelectionMode === 'unique') {
      uniqueStageMapRef.current.clear();
    }
  }, [stageSelectionMode]);

  // -- Effects --

  // Update Stats when Champion is declared
  useEffect(() => {
    if (tournament?.champion && !statsUpdated) {
      setStatsUpdated(true); // Mark as updated immediately to prevent race conditions

      // Calculate stats
      const statsMap = new Map<string, { wins: number, matches: number }>();
      
      const getStats = (id: string) => {
        if (!statsMap.has(id)) statsMap.set(id, { wins: 0, matches: 0 });
        return statsMap.get(id)!;
      }

      tournament!.history.forEach(match => {
        if (!match.winner) return;

        // Winner Team
        match.winner.members.forEach(char => {
          const s = getStats(char.id);
          s.wins += 1;
          s.matches += 1;
        });

        // Loser Team
        const loserTeam = match.p1.id === match.winner.id ? match.p2 : match.p1;
        if (loserTeam) {
          loserTeam.members.forEach(char => {
             const s = getStats(char.id);
             s.matches += 1;
          });
        }
      });

      // Convert to array
      const updates = Array.from(statsMap.entries()).map(([id, stats]) => ({
        id,
        wins: stats.wins,
        matches: stats.matches
      }));

      if (updates.length > 0) {
        fetch('/api/characters/batch-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        }).catch(err => console.error('Failed to update stats:', err));
      }
    }
  }, [tournament?.champion, statsUpdated, tournament?.history])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setLoadingStep(0)

      const fetchPromises: Promise<any>[] = [
        fetch('/api/characters').then(res => res.json()),
        fetch('/api/arenas').then(res => res.json())
      ]

      if (challengeId) {
        fetchPromises.push(fetch(`/api/challenges?id=${challengeId}`).then(res => res.json()))
      }

      try {
        const results = await Promise.all(fetchPromises)
        if (cancelled) return

        const charsData = results[0]
        const arenasData = results[1]
        const challengeData = challengeId ? results[2] : null

        setCharacters(charsData)
        setArenas(arenasData)
        if (challengeData) setChallenge(challengeData)
        setLoadingStep(1)

        let validChars: Character[] = charsData
        const selectedGroupsIds = selectedGroupsIdsStr?.split(',') || []
        const excludedIds = searchParams.get('excluded')?.split(',') || []
        const excludedStages = excludedStagesStr?.split(',') || []

        if (groupMode === 'select' && selectedGroupsIds.length > 0) {
          validChars = validChars.filter(c => selectedGroupsIds.includes(c.groupId))
        }

        if (excludedIds.length > 0) {
          validChars = validChars.filter(c => !excludedIds.includes(c.id))
        }

        let validArenas: Arena[] = arenasData
        const selectedArenasIds = selectedArenasIdsStr?.split(',') || []
        if (arenaMode === 'select' && selectedArenasIds.length > 0) {
          validArenas = validArenas.filter(a => selectedArenasIds.includes(a.id))
        } else if (arenaMode === 'null') {
          validArenas = []
        }

        setLoadingStep(2)

        let bracket: BattleSession

        if (challengeData) {
          bracket = generateChallengeTournament(challengeData, validChars)

          if (challengeData.config.fixedArenaId) {
            const fixedArena = arenasData.find((a: Arena) => a.id === challengeData.config.fixedArenaId)
            if (fixedArena) setCurrentArena(fixedArena)
          } else if (challengeData.config.arenaPool && challengeData.config.arenaPool.length > 0) {
            const pool = arenasData.filter((a: Arena) => challengeData.config.arenaPool?.includes(a.id))
            const randomArena = pool[Math.floor(Math.random() * pool.length)]
            setCurrentArena(randomArena)
          } else if (validArenas.length > 0) {
            const randomArena = validArenas[Math.floor(Math.random() * validArenas.length)]
            setCurrentArena(randomArena)
          }
          setLoadingStep(3)
        } else if (tournamentType === 'last-standing') {
          bracket = generateLastOneStanding(validChars, teamSize, limit && limit !== 'all' ? Number(limit) : 0, stageSelectionMode, excludedStages) as BattleSession
        } else {
          const sizePerTeam = teamSize === '4v4' ? 4 : teamSize === '3v3' ? 3 : teamSize === '2v2' ? 2 : 1
          let availableTeams = Math.floor(validChars.length / sizePerTeam)

          if (availableTeams < 2) {
            const fallbackPool = charsData && charsData.length > 0 ? charsData : validChars
            const neededChars = sizePerTeam * 2
            while (validChars.length < neededChars && fallbackPool.length > 0) {
              validChars.push(fallbackPool[Math.floor(Math.random() * fallbackPool.length)])
            }
            availableTeams = Math.floor(validChars.length / sizePerTeam)
          }

          let computedBracketSize = 2
          if (availableTeams >= 2) {
            computedBracketSize = Math.pow(2, Math.floor(Math.log2(availableTeams)))
            if (computedBracketSize < 2) computedBracketSize = 2
          }

          if (limit && limit !== 'all') {
            const requested = Number(limit)
            const capped = Math.max(2, Math.min(requested, computedBracketSize))
            bracket = generateBracket(validChars, teamSize, capped, stageSelectionMode)
          } else {
            bracket = generateBracket(validChars, teamSize, computedBracketSize, stageSelectionMode)
          }
        }

        try {
          const firstMatch = bracket.matches?.[bracket.currentMatchIndex || 0]
          if (firstMatch) {
            const ensureTeamFilled = (team: Team | undefined) => {
              if (!team || !Array.isArray(team.members) || team.members.length === 0) {
                const rnd = validChars[Math.floor(Math.random() * validChars.length)]
                const safeMember = rnd
                const safeTeam: Team = {
                  id: team?.id || `team-${Math.random().toString(36).substr(2, 9)}`,
                  name: team?.name || safeMember.name,
                  members: [safeMember]
                }
                return safeTeam
              }
              return team
            }
            firstMatch.p1 = ensureTeamFilled(firstMatch.p1)
            firstMatch.p2 = ensureTeamFilled(firstMatch.p2)
          }
        } catch (e) {
          console.warn('Solo fallback: failed to ensure team members', e)
        }

        if (cancelled) return

        setTournament(bracket)

        if (!challengeData && validArenas.length > 0) {
          const randomArena = validArenas[Math.floor(Math.random() * validArenas.length)]
          setCurrentArena(randomArena)
        }

        setLoadingStep(4)
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        console.error("Failed to generate bracket:", e)
        setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [teamSize, limit, groupMode, selectedGroupsIdsStr, arenaMode, selectedArenasIdsStr, enableThirdPlace, tournamentType, stageSelectionMode, excludedStagesStr, challengeId])

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(0)
      return
    }

    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= loadingTarget) return prev
        const diff = loadingTarget - prev
        const step = Math.max(1, Math.round(diff / 5))
        const next = prev + step
        return next > loadingTarget ? loadingTarget : next
      })
    }, 80)

    return () => clearInterval(interval)
  }, [loading, loadingTarget])

  useEffect(() => {
    if (!loading) {
      setLoadingTarget(100)
      return
    }

    const stepTargets = [10, 35, 60, 85, 99]
    const idx = Math.min(loadingStep, stepTargets.length - 1)
    setLoadingTarget(stepTargets[idx])
  }, [loading, loadingStep])

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0)
      return
    }

    setLoadingStep(0)

    const t1 = setTimeout(() => {
      setLoadingStep(prev => (prev < 1 ? 1 : prev))
    }, 10000)

    const t2 = setTimeout(() => {
      setLoadingStep(prev => (prev < 2 ? 2 : prev))
    }, 25000)

    const t3 = setTimeout(() => {
      setLoadingStep(prev => (prev < 3 ? 3 : prev))
    }, 40000)

    const t4 = setTimeout(() => {
      setLoadingStep(prev => (prev < 4 ? 4 : prev))
    }, 55000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [loading])

  // -- Handlers --

  const handleVote = React.useCallback((team: Team) => {
    if (matchWinner) return // Already voted
    setMatchWinner(team)
    setCountdown(3)
  }, [matchWinner])

  const handleNextMatch = React.useCallback(() => {
    setCountdown(null)
    if (!tournament || !matchWinner) return

    const currentMatch = tournament.matches[tournament.currentMatchIndex]
    const updatedMatch = { ...currentMatch, winner: matchWinner }
    
    // Update matches list
    const updatedMatches = [...tournament.matches]
    updatedMatches[tournament.currentMatchIndex] = updatedMatch

    // Check if we need to generate next round pairings
    // Logic: If all matches in current round are done, generate next level
    // Simplified: Just keep a queue. We need to pair winners.
    
    // Find if there's a pending match slot waiting for this winner?
    // In our simple queue model from generateBracket, we pre-generated only the first round.
    // So we need to create the next round dynamically.
    
    // Let's look at the History + Current Queue
    // We can maintain a "Winners Pool" for the current round.
    
    const nextIndex = tournament.currentMatchIndex + 1
    
    // Are we at the end of the current generated matches?
    // Or do we have pre-generated matches? 
    // My generateBracket only made Round 0 matches.
    
    // So, we need to store the winner in a temporary list for the next round.
    // But `tournament` object in state needs a place for this. 
    // Let's just calculate it on the fly.
    
    const finishedMatches = [...tournament.history, updatedMatch]
    
    // Check if we have a champion (Finals just ended)
    // For Last One Standing, a single match is NOT the end unless there are no remaining teams
    const isLastOneStanding = tournament.type === 'last-standing';
    const hasRemainingTeams = isLastOneStanding && tournament.remainingTeams && tournament.remainingTeams.length > 0;
    
    if (tournament.matches.length === 1 && tournament.currentMatchIndex === 0 && !hasRemainingTeams) {
       // Only 1 match total and no remaining teams?
       setTournament({
         ...tournament,
         matches: updatedMatches,
         history: finishedMatches,
         champion: matchWinner
       })
       setMatchWinner(null)
       return
    }

    // Determine if we need to generate next round
    // Current bracket logic:
    // We have N matches in the queue.
    // If we are at the end of the queue, we take the winners of these matches and pair them up.
    
    let newMatches = updatedMatches
    let newIndex = nextIndex
    let champion = null
    let nextRemainingTeams = tournament.remainingTeams

    // Advance index to next unplayed match (skip auto-wins/byes)
    // IMPORTANT: Do this BEFORE checking for end of tournament
    while (newIndex < newMatches.length && newMatches[newIndex].winner) {
       newIndex++
    }

    // Now check if we reached the end
    if (newIndex >= newMatches.length) {
      if (tournament.type === 'queue') {
         // Queue Finished logic
         
         // 1. Calculate Ranking based on Win Counts
         const winCounts = new Map<string, number>()
         finishedMatches.forEach(m => {
           if (m.winner) {
              winCounts.set(m.winner.id, (winCounts.get(m.winner.id) || 0) + 1)
           }
         })
         
         const teamsMap = new Map<string, Team>()
         finishedMatches.forEach(m => {
           if (m.p1) teamsMap.set(m.p1.id, m.p1)
           if (m.p2) teamsMap.set(m.p2.id, m.p2)
         })
         
         const sortedTeams = Array.from(teamsMap.values()).sort((a, b) => {
            const winsA = winCounts.get(a.id) || 0
            const winsB = winCounts.get(b.id) || 0
            return winsB - winsA // Descending
         })

         // 2. Check if we need to generate a FINAL match
         // If we just finished the Round Robin matches (matches defined in initialization)
         // AND we haven't generated the final yet.
         
         // Check if the last match played was a "Final" match
         const lastMatchWasFinal = updatedMatch.round === 999;
         
         if (lastMatchWasFinal) {
            // Battle REALLY finished
            champion = updatedMatch.winner
            setChampionPhase('stats')
         } else if (sortedTeams.length >= 2) {
            // Round Robin finished.
            // Create a FINAL Match between Top 1 and Top 2
            const top1 = sortedTeams[0]
            const top2 = sortedTeams[1]
            
            // Only create final if we have 2 distinct teams
            if (top1 && top2 && top1.id !== top2.id) {
               const finalMatch: Match = {
                  id: `final-${Math.random().toString(36).substr(2, 9)}`,
                  p1: top1,
                  p2: top2,
                  winner: null,
                  round: 999, // Special ID for Final
                  isThirdPlaceMatch: false
               }
               
               newMatches = [...newMatches, finalMatch]
               // newIndex is already pointing to this new slot because we incremented it
               // Actually, newIndex was at newMatches.length (out of bounds).
               // Now we added one, so newIndex points to the new match.
            } else {
               // Fallback if something weird happened (only 1 team?)
               champion = top1
               setChampionPhase('stats')
            }
         } else {
            // Not enough teams for final
            champion = sortedTeams[0] || finishedMatches[0].winner
            setChampionPhase('stats')
         }

      } else if (tournament.type === 'last-standing') {
         // LAST ONE STANDING LOGIC
         // Find next VALID opponent (skip self-matches)
         let nextTeam = nextRemainingTeams && nextRemainingTeams.length > 0 ? nextRemainingTeams[0] : null;
         let skippedCount = 0;

         // Deduplication Loop: Skip if next team is same as winner
         while (nextTeam && matchWinner && nextTeam.id === matchWinner.id && nextRemainingTeams && nextRemainingTeams.length > skippedCount + 1) {
            console.warn(`[LastStanding] Skipped self-match against ${nextTeam.name} (${nextTeam.id})`);
            skippedCount++;
            nextTeam = nextRemainingTeams[skippedCount];
         }

         // If we still have a self-match after checking all, we just stop (Champion) or proceed (will trigger auto-skip but we have no choice)
         // But effectively we slice off the skipped ones.
         
         if (nextTeam) {
             // If we skipped some, we need to remove them from remainingTeams so they don't come back?
             // Or do we just discard the self-match? 
             // Logic: If A vs A, A wins. So the "clone" A is defeated. 
             // So we should just consume the clone.
             
            // Create next match: Winner vs Next
            // We use the winner of the CURRENT match (updatedMatch.winner which is matchWinner)
            const winner = matchWinner;
            
            if (winner) {
                // Check AGAIN for self-match to be absolutely sure
                if (nextTeam.id === winner.id) {
                    console.warn(`[LastStanding] Final check: Self-match detected (Winner vs ${nextTeam.name}) and no other opponents found. Declaring Champion.`);
                    champion = matchWinner;
                    setChampionPhase('stats');
                } else {
                    const nextMatch: Match = {
                       id: `match-${Math.random().toString(36).substr(2, 9)}`,
                       p1: winner,
                       p2: nextTeam,
                       winner: null,
                       round: updatedMatch.round + 1
                    };
        
                    newMatches = [...newMatches, nextMatch];
                    // Update remaining teams (remove the one we used AND any we skipped)
                    nextRemainingTeams = nextRemainingTeams ? nextRemainingTeams.slice(1 + skippedCount) : [];
                }
            }
         } else {
            // No more opponents -> Winner is Champion
            champion = matchWinner;
            setChampionPhase('stats');
         }

      } else {
        // Round Complete! Generate next round.
        const currentRound = currentMatch.round
        const roundMatches = updatedMatches.filter(m => m.round === currentRound)
        const winners = roundMatches.map(m => m.winner!)
        
        // Check if this round included a 3rd Place Match (meaning it was the Finals + 3rd Place round)
        const hasThirdPlaceMatch = roundMatches.some(m => m.isThirdPlaceMatch)

        if (hasThirdPlaceMatch) {
          // Battle Finished!
          // The champion is the winner of the match that was NOT the 3rd place match
          const finalMatch = roundMatches.find(m => !m.isThirdPlaceMatch)
          if (finalMatch) {
            champion = finalMatch.winner
          }
        } else if (winners.length === 1) {
          // Was this the final match?
          // If it was a Third Place match, we do NOT declare a champion yet.
          // We need to check if there are more matches pending (the real Final).
          // Actually, if we structured correctly, the Final is AFTER the 3rd place match.
          // So if we are here and winners.length === 1, it implies we just finished the LAST match of the sequence.
          
          champion = winners[0]
        } else if (winners.length === 2 && enableThirdPlace) {
          // SEMI-FINALS JUST FINISHED -> Create 3rd Place Match & Final
          const match1 = roundMatches[0]
          const match2 = roundMatches[1]
          
          const loser1 = match1.winner!.id === match1.p1.id ? match1.p2 : match1.p1
          const loser2 = match2.winner!.id === match2.p1.id ? match2.p2 : match2.p1
          
          const winner1 = match1.winner!
          const winner2 = match2.winner!
          
          const thirdPlaceMatch: Match = {
            id: Math.random().toString(36).substr(2, 9),
            p1: loser1,
            p2: loser2,
            winner: null,
            round: currentRound + 1,
            isThirdPlaceMatch: true
          }
          
          const finalMatch: Match = {
            id: Math.random().toString(36).substr(2, 9),
            p1: winner1,
            p2: winner2,
            winner: null,
            round: currentRound + 1
          }
          
          newMatches = [...newMatches, thirdPlaceMatch, finalMatch]
          
        } else {
          // Create pairs for next round (standard logic)
          const nextRoundMatches: Match[] = []
          
          // DEDUPLICATION: Ensure unique winners to prevent Self-Matches (Root Cause Fix)
          // Add explicit logging for debugging
          console.log(`[Round Gen] Generating Round ${currentRound + 1}. Winners Count: ${winners.length}`);
          const uniqueWinners = Array.from(new Map(winners.map(w => [w.id, w])).values());
          console.log(`[Round Gen] Unique Winners: ${uniqueWinners.length}`);
          
          if (uniqueWinners.length !== winners.length) {
             console.warn(`[Round Gen] Found ${winners.length - uniqueWinners.length} duplicate winners. Deduplicated.`);
          }

          for (let i = 0; i < uniqueWinners.length; i += 2) {
            const p1 = uniqueWinners[i]
            const p2 = uniqueWinners[i+1]
            
            // EXPLICIT SELF-MATCH GUARD
            if (p2 && p1.id === p2.id) {
               console.error(`[Round Gen] CRITICAL: Detected p1.id === p2.id inside loop! ID: ${p1.id}. Converting to Bye.`);
               // Fallback: Convert to Bye match for p1
               nextRoundMatches.push({
                id: Math.random().toString(36).substr(2, 9),
                p1: p1,
                p2: { id: `bye-${Math.random().toString(36).substr(2, 9)}`, name: 'BYE', members: [] }, 
                winner: p1,
                round: currentRound + 1
              })
              continue;
            }

            if (p2) {
              nextRoundMatches.push({
                id: Math.random().toString(36).substr(2, 9),
                p1: p1,
                p2: p2,
                winner: null,
                round: currentRound + 1
              })
            } else {
              // Handle Odd Number of Winners (Bye)
              nextRoundMatches.push({
                id: Math.random().toString(36).substr(2, 9),
                p1: p1,
                p2: { id: `bye-${Math.random().toString(36).substr(2, 9)}`, name: 'BYE', members: [] }, 
                winner: p1,
                round: currentRound + 1
              })
            }
          }
          newMatches = [...newMatches, ...nextRoundMatches]
        }
      }
    }
    
    // If we generated new matches, check if we need to skip any (e.g. BYEs in new round)
    while (newIndex < newMatches.length && newMatches[newIndex].winner) {
       newIndex++
    }

    setTournament({
      ...tournament,
      matches: newMatches,
      currentMatchIndex: newIndex,
      history: finishedMatches,
      champion: champion,
      remainingTeams: nextRemainingTeams
    })
    
    setMatchWinner(null)
    
    // Pick new arena
    if (arenas.length > 0 && arenaMode !== 'null') {
      // Filter again based on selection if needed, but we can just pick from available
      // Let's just use the filtered list we had in useEffect... wait, we didn't save it.
      // Re-filter or just pick from all arenas for simplicity/randomness if 'all'
      // Ideally we use the same filter.
      // Quick fix: Just pick random from all arenas (or filtered if we stored it).
      // Let's assume 'arenas' contains all, we should filter.
      let validArenas = arenas
      const selectedArenasIds = selectedArenasIdsStr?.split(',') || []
      
      if (arenaMode === 'select') validArenas = arenas.filter(a => selectedArenasIds.includes(a.id))
      else if (arenaMode === 'null') validArenas = []
      
      if (validArenas.length > 0) {
        setCurrentArena(validArenas[Math.floor(Math.random() * validArenas.length)])
      } else {
        setCurrentArena(null)
      }
    }
  }, [tournament, matchWinner, arenas, arenaMode, selectedArenasIdsStr, enableThirdPlace])

  // -- Countdown Effect --
  useEffect(() => {
    if (countdown === null) return

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000)
      return () => clearTimeout(timer)
    } else {
      handleNextMatch()
    }
  }, [countdown, handleNextMatch]) // handleNextMatch is stable enough for this logic

  // -- Auto-Skip Invalid Matches --
  useEffect(() => {
    if (!match) return;

    const isInvalid = match.p1.id === match.p2.id || !match.p2;
    
    if (isInvalid && !matchWinner && !countdown) {
       // Safety Check: If we skip too many times in a row, PAUSE.
       // User requested REMOVAL of preventive measures. Proceed with auto-resolution.
       /* 
       if (autoSkipCount.current > 5) {
          console.warn("Too many auto-skips. Pausing for manual resolution.");
          setManualResolutionNeeded(true);
          return;
       }
       */

       if (manualResolutionNeeded) return; // Don't auto-skip if manual mode is active

       autoSkipCount.current += 1;
       console.warn(`[AutoSkip] Detected Invalid Match (AxA or Bye). Match ID: ${match.id}, P1: ${match.p1?.name} (${match.p1?.id}), P2: ${match.p2?.name} (${match.p2?.id})`);
       
       // Auto-win for p1 (or Bye handling)
       setMatchWinner(match.p1);
       // Fast forward - Increased delay to avoid rapid loops and allow UI update
       setTimeout(() => setCountdown(3), 500);
    } else if (!isInvalid) {
       // Reset count on valid match
       autoSkipCount.current = 0;
       setAutoSkipError(null);
    }
  }, [match, matchWinner, countdown, manualResolutionNeeded]);

  // -- Render Helpers --

  if (manualResolutionNeeded && match) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-6 z-50 relative">
        <h1 className="text-3xl font-bold text-orange-500">Manual Match Resolution</h1>
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 max-w-md w-full">
           <h2 className="text-xl font-bold mb-4 text-center">Invalid Match Detected</h2>
           <div className="space-y-2 mb-6 text-sm text-zinc-400">
             <p><strong className="text-white">Match ID:</strong> {match.id}</p>
             <p><strong className="text-white">P1:</strong> {match.p1?.name || 'Unknown'} (ID: {match.p1?.id})</p>
             <p><strong className="text-white">P2:</strong> {match.p2?.name || 'None/Bye'} (ID: {match.p2?.id})</p>
             <p className="text-red-400 mt-2">
               Reason: {match.p1?.id === match.p2?.id ? 'Self-Match (P1 vs P1)' : (!match.p2 ? 'Missing Opponent (Bye)' : 'Unknown Error')}
             </p>
           </div>
           
           <div className="flex flex-col gap-3">
             <button 
               onClick={() => {
                 setMatchWinner(match.p1);
                 setManualResolutionNeeded(false);
                 autoSkipCount.current = 0; // Reset count
                 setCountdown(3);
               }}
               className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors"
             >
               Force Win: {match.p1?.name || 'P1'}
             </button>
             
             {match.p2 && (
                <button 
                  onClick={() => {
                    setMatchWinner(match.p2);
                    setManualResolutionNeeded(false);
                    autoSkipCount.current = 0;
                    setCountdown(3);
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-colors"
                >
                  Force Win: {match.p2.name}
                </button>
             )}

             <button 
                onClick={() => {
                   // Emergency Skip: Just advance index without winner?
                   // No, bracket needs winner. 
                   // Let's just try to re-generate bracket? No.
                   window.location.reload();
                }}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-bold transition-colors mt-4"
             >
               Restart Battle
             </button>
           </div>
        </div>
      </div>
    )
  }

  if (autoSkipError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <h1 className="text-2xl font-bold text-red-500">System Error</h1>
        <p className="text-zinc-400">{autoSkipError}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-zinc-800 rounded-full hover:bg-zinc-700">Restart Battle</button>
      </div>
    )
  }

  if (loading) {
    const steps = [
      { title: 'Booting Mega Fight Protocol', subtitle: 'Calibrating power scales and safety limits' },
      { title: 'Warming Up Fighters', subtitle: 'Pulling combatants from the multiverse roster' },
      { title: 'Removing Dead Bodies From The Arenas', subtitle: 'Sanitizing environments for the next clash' },
      { title: 'Rolling Random Arenas', subtitle: 'Aligning hazards, buffs and debuffs' },
      { title: 'Finalizing Tournament Bracket', subtitle: 'Seeding teams and locking matchups' }
    ]
    const currentStep = steps[Math.min(loadingStep, steps.length - 1)]

    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-6">
            <div className="w-40 h-40 flex items-center justify-center">
              <VsBadge compact />
            </div>
            <div className="text-xs font-mono uppercase tracking-[0.3em] text-zinc-500">
              Initializing Battle
            </div>
          </div>

          <div className="space-y-3">
            <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-red-500 transition-all duration-500"
                style={{ width: `${Math.min(Math.max(loadingProgress, 8), 100)}%` }}
              />
            </div>
            <div className="text-center space-y-1">
              <div className="text-sm font-semibold text-orange-300">
                {currentStep.title}
              </div>
              <div className="text-xs text-zinc-400">
                {currentStep.subtitle}
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-zinc-500 font-mono tracking-[0.25em]">
            Please Wait
          </div>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <h1 className="text-2xl font-bold text-red-500">Battle Init Failed</h1>
        <p className="text-zinc-400">Not enough fighters matching criteria.</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-zinc-800 rounded-full hover:bg-zinc-700">Go Back</button>
      </div>
    )
  }

  // Calculate Team Stats if PowerScale is ON
  const getTeamStats = (team: Team) => {
    if (!powerScale) return null
    return team.members.reduce((acc, curr) => {
      if (!curr || !curr.stages || curr.stages.length === 0) return acc;
      const idx = stageIndexMap.get(curr.id) ?? 0;
      return {
        hp: acc.hp + (curr.stages[idx]?.stats.hp || 0),
        atk: acc.atk + (curr.stages[idx]?.stats.str || 0),
        spd: acc.spd + (curr.stages[idx]?.stats.spd || 0)
      };
    }, { hp: 0, atk: 0, spd: 0 })
  }

  const p1Stats = p1Team ? getTeamStats(p1Team) : null
  const p2Stats = p2Team ? getTeamStats(p2Team) : null

  // -- Champion View --
  if (tournament.champion) {
    const finalMatch = tournament.history[tournament.history.length - 1]
    const runnerUp = finalMatch ? (finalMatch.p1.id === tournament.champion.id ? finalMatch.p2 : finalMatch.p1) : null

    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-6 left-6 z-50">
          <button
            onClick={toggleFullScreen}
            className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 text-zinc-400 hover:text-white hover:bg-blue-900/50 hover:border-blue-500/50 transition-all flex items-center justify-center"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={() => setIsSimulationOpen(true)}
            className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 text-zinc-400 hover:text-white hover:bg-blue-900/50 hover:border-blue-500/50 transition-all flex items-center justify-center"
          >
            <BarChart2 size={20} />
          </button>
          <button
            onClick={() => setIsRulesOpen(true)}
            className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 text-zinc-400 hover:text-white hover:bg-blue-900/50 hover:border-blue-500/50 transition-all flex items-center justify-center"
          >
            <HelpCircle size={20} />
          </button>
          <Link 
            href="/" 
            className="px-4 py-2 bg-zinc-900/80 backdrop-blur border border-white/10 rounded-full text-zinc-400 font-bold text-sm hover:text-white hover:bg-red-900/50 hover:border-red-500/50 transition-all flex items-center gap-2"
          >
            <LogOut size={16} />
            Exit
          </Link>
        </div>
        
        <GameRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600/20 via-black to-black" />
        
        {championPhase === 'bracket' && (
           <ChampionBracketView 
             tournament={tournament}
             onComplete={() => setChampionPhase('stats')} 
           />
        )}

        {championPhase === 'stats' && (
          <BattleLeaderboardView 
            tournament={tournament} 
          />
        )}
      </div>
    )
  }

  if (match) {
     // Check for invalid match state
     if (match.p1.id === match.p2.id || !match.p2) {
        // Handled by useEffect, show loading/skipping UI
        return (
          <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-spin text-orange-500"><RefreshCw size={48} /></div>
            <p className="ml-4 text-zinc-500">Resolving invalid match...</p>
          </div>
        )
     }
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col">
      <div className="absolute top-6 left-6 z-50">
        <button
          onClick={toggleFullScreen}
          className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 text-zinc-400 hover:text-white hover:bg-blue-900/50 hover:border-blue-500/50 transition-all flex items-center justify-center"
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>

      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setIsSimulationOpen(true)}
          className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 text-zinc-400 hover:text-white hover:bg-blue-900/50 hover:border-blue-500/50 transition-all flex items-center justify-center"
        >
          <BarChart2 size={20} />
        </button>
        <button
          onClick={() => setIsRulesOpen(true)}
          className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 text-zinc-400 hover:text-white hover:bg-blue-900/50 hover:border-blue-500/50 transition-all flex items-center justify-center"
        >
          <HelpCircle size={20} />
        </button>
        <Link 
          href="/" 
          className="px-4 py-2 bg-zinc-900/80 backdrop-blur border border-white/10 rounded-full text-zinc-400 font-bold text-sm hover:text-white hover:bg-red-900/50 hover:border-red-500/50 transition-all flex items-center gap-2"
        >
          <LogOut size={16} />
          Exit
        </Link>
      </div>

      <GameRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <BattleSimulationModal 
        isOpen={isSimulationOpen} 
        onClose={() => setIsSimulationOpen(false)} 
        p1Name={p1Team?.name || 'P1'}
        p2Name={p2Team?.name || 'P2'}
        p1Stats={p1BattleStats}
        p2Stats={p2BattleStats}
        p1Modifiers={p1Modifiers}
        p2Modifiers={p2Modifiers}
        compact={false}
        maxStatValue={maxSimulationValue}
      />

      
      {/* Dynamic Background */}
      {currentArena ? (
        <>
          {currentArena.video ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-35 transition-opacity duration-1000"
              key={currentArena.id}
            >
              <source src={currentArena.video} type="video/mp4" />
            </video>
          ) : (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-35 transition-opacity duration-1000"
              style={{ backgroundImage: `url(${currentArena.image})` }}
              key={currentArena.id}
            />
          )}
          {/* Enhanced Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/10 z-0" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-900 to-black opacity-50" />
      )}

      <main className="flex-1 z-10 flex flex-col items-center justify-center px-4 relative">
        
        {/* Match Header */}
        <div className="absolute top-20 left-0 right-0 z-20 flex flex-col items-center gap-2 pointer-events-none">
          {(() => {
            const getRoundDisplay = () => {
              if (!tournament || !match) {
                 return { text: 'ROUND', color: 'text-zinc-400', border: 'border-zinc-800', icon: null }
              }
              if (tournament.type === 'queue') {
                 if (match.round === 999) return { text: 'FINALS', color: 'text-yellow-500', border: 'border-yellow-500', icon: <Trophy size={14} className="text-yellow-500" /> }
                 return { text: `ROUND ${match.round + 1}`, color: 'text-zinc-400', border: 'border-zinc-800', icon: null }
              }

              if (tournament.type === 'last-standing') {
                 const remainingCount = tournament.remainingTeams?.length || 0;
                 if (remainingCount === 0) {
                    return { text: 'FINALS', color: 'text-yellow-500', border: 'border-yellow-500', icon: <Trophy size={14} className="text-yellow-500" /> }
                 }
                 return { text: `ROUND ${match.round + 1}`, color: 'text-zinc-400', border: 'border-zinc-800', icon: null }
              }

              if (match?.isThirdPlaceMatch) {
                return { text: 'THIRD PLACE', color: 'text-amber-500', border: 'border-amber-500', icon: <Trophy size={14} className="text-amber-500" /> }
              }

              const initialMatches = tournament.matches.filter(m => m.round === 0).length
              if (initialMatches === 0) return { text: `ROUND ${match.round + 1}`, color: 'text-zinc-400', border: 'border-zinc-800', icon: null }

              const totalRounds = Math.log2(initialMatches * 2)
              const maxRoundIndex = totalRounds - 1
              
              if (match.round === maxRoundIndex) {
                return { text: 'FINALS', color: 'text-yellow-500', border: 'border-yellow-500', icon: <Trophy size={14} className="text-yellow-500" /> }
              }
              if (match.round === maxRoundIndex - 1) {
                return { text: 'SEMI FINALS', color: 'text-zinc-300', border: 'border-zinc-700', icon: null }
              }
              if (match.round === maxRoundIndex - 2) {
                return { text: 'QUARTER FINALS', color: 'text-zinc-400', border: 'border-zinc-800', icon: null }
              }
              
              return { text: `ROUND ${match.round + 1}`, color: 'text-zinc-400', border: 'border-zinc-800', icon: null }
            }

            const info = getRoundDisplay()

            return (
              <div className={`px-4 py-1 bg-zinc-900/80 backdrop-blur border ${info.border} rounded-full text-xs font-mono ${info.color} tracking-widest uppercase pointer-events-auto flex items-center gap-2 transition-colors duration-300`}>
                <span>Match {tournament.currentMatchIndex + 1}</span>
                <span className="opacity-50">•</span>
                {info.icon}
                <span>{info.text}</span>
              </div>
            )
          })()}
          {currentArena && (
             <div className="flex flex-col items-center gap-3">
               <div className="flex items-center gap-2 text-orange-400 font-bold text-lg drop-shadow-md">
                 <MapPin size={20} />
                 <span>{currentArena.name}</span>
               </div>

               {/* Arena Modifiers HUD Removed */}
            </div>
         )}
       </div>

        {/* Battle Stage */}
      <div className={`flex flex-col md:flex-row items-center justify-center w-full mx-auto perspective-2000 ${isCompactLayout ? 'gap-2 md:gap-4 w-full px-2' : 'gap-8 md:gap-24 max-w-7xl'}`}>
         
         {/* Team 1 */}
          <div className="flex flex-col items-center gap-6 relative">
             {/* Global Flip Button for P1 (Poker Mode) */}
             {isPokerLayoutP1 && (
                <button
                  onClick={() => setGlobalFlipP1(!globalFlipP1)}
                  className={`absolute -top-12 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                    globalFlipP1 
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400' 
                      : 'bg-zinc-900/60 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <RefreshCw size={12} className={globalFlipP1 ? "animate-spin-once" : ""} />
                  {globalFlipP1 ? 'Show Fighters' : 'Flip Squad'}
                </button>
             )}

            <div 
              className={`${isPokerLayoutP1 
                ? 'flex justify-center flex-nowrap sm:-space-x-36 md:-space-x-56 lg:-space-x-72 hover:sm:-space-x-28 hover:md:-space-x-40 hover:lg:-space-x-56 transition-all duration-300 sm:py-6 md:py-8 lg:py-10 sm:px-2 md:px-4' 
                : `flex justify-center ${p1Count >= 3 ? 'flex-nowrap sm:-space-x-8 md:-space-x-12 lg:-space-x-16' : (isP1Compact ? 'flex-nowrap gap-4 md:gap-6' : 'flex-wrap gap-3 md:gap-4')}` } ${matchWinner && p1Team && matchWinner.id !== p1Team.id ? 'opacity-30 grayscale blur-sm' : ''} transition-all duration-500`}
              onMouseMove={isP1Compact && !isPokerLayoutP1 ? (e) => handleTeamMouseMove(e, p1TeamX, p1TeamY) : undefined}
              onMouseLeave={isP1Compact && !isPokerLayoutP1 ? () => handleTeamMouseLeave(p1TeamX, p1TeamY) : undefined}
            >
              {p1Team?.members?.map((char, index) => {
                const modifiers = modifiersMap.get(char.id) || calculateArenaModifiers(char, (stageIndexMap.get(char.id) ?? 0), currentArena, powerScale)
                return (
                  <CharacterCard 
                    key={char.id} 
                    character={char}
                    stageIndex={stageIndexMap.get(char.id) ?? 0}
                    modifiers={modifiers} 
                    maxStatValue={maxStatValue}
                    powerScale={powerScale}
                    isWinner={matchWinner?.id === p1Team?.id} 
                    onClick={() => p1Team && handleVote(p1Team)}
                    disabled={!!matchWinner}
                    compact={isP1Compact}
                    scale={isPokerLayoutP1 ? 0.95 : getTeamScale(p1Count)}
                    sharedX={isP1Compact && !isPokerLayoutP1 ? p1TeamX : undefined}
                    sharedY={isP1Compact && !isPokerLayoutP1 ? p1TeamY : undefined}
                    forceFlip={isPokerLayoutP1 ? globalFlipP1 : undefined}
                    hideFlipButton={isPokerLayoutP1}
                    hoverEffect={isPokerLayoutP1}
                  />
                )
              })}
            </div>
            
            {/* Stats Panel Removed */}
          </div>

          {/* VS / Timer Section */}
          <div className={`flex flex-col items-center justify-center z-10 ${isCompactLayout ? 'w-28 sm:w-32 md:w-40' : 'w-80 sm:w-88 md:w-96'} shrink-0`}>
             <AnimatePresence mode="wait">
               {matchWinner ? (
                 <motion.div 
                   initial={{ scale: 0, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="flex flex-col items-center gap-4"
                 >
                   <Trophy size={64} className="text-yellow-400" />
                   <div className="text-2xl font-black text-white text-center">
                     {matchWinner.name}<br/>WINS!
                   </div>
                   <button 
                    onClick={handleNextMatch}
                    className="mt-4 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-110 transition-transform flex items-center gap-3"
                  >
                    NEXT MATCH
                    {countdown !== null ? (
                      <div className="relative w-6 h-6 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle 
                            cx="50%" cy="50%" r="10" 
                            stroke="currentColor" strokeWidth="3" fill="none" 
                            className="opacity-20" 
                          />
                          <motion.circle
                            cx="50%" cy="50%" r="10"
                            stroke="currentColor" strokeWidth="3" fill="none"
                            initial={{ pathLength: 1 }}
                            animate={{ pathLength: 0 }}
                            transition={{ duration: 3, ease: "linear" }}
                          />
                        </svg>
                        <span className="text-[10px] font-bold relative z-10 leading-none">{countdown}</span>
                      </div>
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </button>
                 </motion.div>
               ) : (
                 <motion.div
                   initial={{ scale: 0, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   exit={{ scale: 0, opacity: 0 }}
                 >
                   <VsBadge compact={isP1Compact || isP2Compact} />
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-6 relative">
             {/* Global Flip Button for P2 (Poker Mode) */}
             {isPokerLayoutP2 && (
                <button
                  onClick={() => setGlobalFlipP2(!globalFlipP2)}
                  className={`absolute -top-12 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                    globalFlipP2 
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400' 
                      : 'bg-zinc-900/60 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <RefreshCw size={12} className={globalFlipP2 ? "animate-spin-once" : ""} />
                  {globalFlipP2 ? 'Show Fighters' : 'Flip Squad'}
                </button>
             )}

            <div 
              className={`${isPokerLayoutP2 
                ? 'flex justify-center flex-nowrap sm:-space-x-36 md:-space-x-56 lg:-space-x-72 hover:sm:-space-x-28 hover:md:-space-x-40 hover:lg:-space-x-56 transition-all duration-300 sm:py-6 md:py-8 lg:py-10 sm:px-2 md:px-4' 
                : `flex justify-center ${p2Count >= 3 ? 'flex-nowrap sm:-space-x-8 md:-space-x-12 lg:-space-x-16' : (isP2Compact ? 'flex-nowrap gap-4 md:gap-6' : 'flex-wrap gap-3 md:gap-4')}` } ${matchWinner && p2Team && matchWinner.id !== p2Team.id ? 'opacity-30 grayscale blur-sm' : ''} transition-all duration-500`}
              onMouseMove={isP2Compact && !isPokerLayoutP2 ? (e) => handleTeamMouseMove(e, p2TeamX, p2TeamY) : undefined}
              onMouseLeave={isP2Compact && !isPokerLayoutP2 ? () => handleTeamMouseLeave(p2TeamX, p2TeamY) : undefined}
            >
              {p2Team?.members?.map((char, index) => {
                const modifiers = modifiersMap.get(char.id) || calculateArenaModifiers(char, (stageIndexMap.get(char.id) ?? 0), currentArena, powerScale)
                return (
                  <CharacterCard 
                    key={char.id} 
                    character={char}
                    stageIndex={stageIndexMap.get(char.id) ?? 0}
                    modifiers={modifiers} 
                    maxStatValue={maxStatValue}
                    powerScale={powerScale}
                    isWinner={matchWinner?.id === p2Team?.id} 
                    onClick={() => p2Team && handleVote(p2Team)}
                    disabled={!!matchWinner}
                    compact={isP2Compact}
                    scale={isPokerLayoutP2 ? 0.95 : getTeamScale(p2Count)}
                    sharedX={isP2Compact && !isPokerLayoutP2 ? p2TeamX : undefined}
                    sharedY={isP2Compact && !isPokerLayoutP2 ? p2TeamY : undefined}
                    forceFlip={isPokerLayoutP2 ? globalFlipP2 : undefined}
                    hideFlipButton={isPokerLayoutP2}
                    hoverEffect={isPokerLayoutP2}
                  />
                )
              })}
            </div>
            
            {/* Stats Panel Removed */}
          </div>

        </div>

      </main>
    </div>
  )
}

export default function SoloFightPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <SoloFightContent />
    </Suspense>
  )
}
