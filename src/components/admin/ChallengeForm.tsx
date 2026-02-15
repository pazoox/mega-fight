'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Challenge, ChallengeMode, Arena, Group, TeamConfig, Character, CharacterStage } from '@/types';
import { Save, Loader2, ArrowLeft, Trophy, Swords, Shield, Users, Brain, Music, Settings, Tag, ChevronDown, Zap, Search, Plus, Trash2, LogOut, AlertTriangle, CheckCircle2, X, Upload } from 'lucide-react';
import Link from 'next/link';
import { GroupSelector } from './GroupSelector';
import { TeamSelector } from './TeamSelector';
import { ArenaSelector } from './ArenaSelector';

type TournamentType = 'classic' | 'last_standing' | 'tournament' | 'boss_fight' | 'hero_tale' | 'stat_attack';

const TOURNAMENT_TYPES: { id: TournamentType; label: string; formats: { label: string; a: number; b: number }[] }[] = [
  {
    id: 'classic',
    label: 'Classic (Standard)',
    formats: [
      { label: '1 vs 1', a: 1, b: 1 },
      { label: '2 vs 2', a: 2, b: 2 },
      { label: '3 vs 3', a: 3, b: 3 },
      { label: '4 vs 4', a: 4, b: 4 },
    ]
  },
  {
    id: 'last_standing',
    label: 'Survival (Gauntlet)',
    formats: [
      { label: '1 vs 1', a: 1, b: 1 },
      { label: '2 vs 2', a: 2, b: 2 },
      { label: '3 vs 3', a: 3, b: 3 },
      { label: '4 vs 4', a: 4, b: 4 },
    ]
  },
  {
    id: 'tournament',
    label: 'Tournament',
    formats: [
      { label: '1 vs 1', a: 1, b: 1 },
      { label: '2 vs 2', a: 2, b: 2 },
      { label: '3 vs 3', a: 3, b: 3 },
      { label: '4 vs 4', a: 4, b: 4 },
    ]
  },
  {
    id: 'boss_fight',
    label: 'Boss Fight',
    formats: [
      { label: '2 vs 1 (Boss)', a: 2, b: 1 },
      { label: '3 vs 1 (Boss)', a: 3, b: 1 },
      { label: '4 vs 1 (Boss)', a: 4, b: 1 },
    ]
  },
  {
    id: 'hero_tale',
    label: 'Hero Tale',
    formats: [
      { label: '1 (Hero) vs 2', a: 1, b: 2 },
      { label: '1 (Hero) vs 3', a: 1, b: 3 },
      { label: '1 (Hero) vs 4', a: 1, b: 4 },
    ]
  },
  {
    id: 'stat_attack',
    label: 'Stat Attack (Trunfo)',
    formats: [] // Placeholder
  }
];

// NEW STRUCTURE CONSTANTS
const GAME_TYPES = [
    { id: 'classic', label: 'Classic (Voting)' },
    { id: 'stat_attack', label: 'Stat Attack (Trunfo)' }
];

const BATTLE_FORMATS = [
    { id: '1v1', label: '1 vs 1', a: 1, b: 1 },
    { id: '2v2', label: '2 vs 2', a: 2, b: 2 },
    { id: '3v3', label: '3 vs 3', a: 3, b: 3 },
    { id: '4v4', label: '4 vs 4', a: 4, b: 4 },
    { id: 'boss', label: 'Boss Fight (2v1)', a: 2, b: 1 },
    { id: 'hero', label: 'Hero Tale (1v3)', a: 1, b: 3 },
];

const BRACKET_TYPES = [
    { id: 'classic', label: 'Elimination (Standard)' },
    { id: 'last_standing', label: 'Survival (Gauntlet)' }
];

const BRACKET_SIZES = {
    classic: [
        { value: 0, label: 'Max (Standard Bracket)' },
        { value: 4, label: '4 Participants (Semi-Finals)' },
        { value: 8, label: '8 Participants (Quarter-Finals)' },
        { value: 16, label: '16 Participants (Round of 16)' },
        { value: 32, label: '32 Participants (Round of 32)' },
        { value: 64, label: '64 Participants (Big Tournament)' },
    ],
    last_standing: [
        { value: 0, label: 'Max (Endless / All)' },
        { value: 5, label: '5 (Short Gauntlet)' },
        { value: 10, label: '10 (Medium Gauntlet)' },
        { value: 20, label: '20 (Long Gauntlet)' },
        { value: 50, label: '50 (Endurance)' },
    ]
};

interface ChallengeFormProps {
  challengeId?: string;
  redirectPath?: string;
}

export default function ChallengeForm({ challengeId, redirectPath = '/admin/challenges' }: ChallengeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  
  // Data for Selectors
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewMatches, setPreviewMatches] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Challenge>>({
    title: '',
    description: '',
    mode: '1v1', // Default, but will be purely cosmetic or engine selector
    isActive: true,
    config: {
      teamSize: 1, // Default 1v1
      tournamentType: 'classic',
      arenaPool: [],
      powerScale: false,
      teamA: {
        name: 'Team A',
        type: 'player',
        count: 1,
        tags: { include: [], exclude: [] },
        modifiers: true
      },
      teamB: {
        name: 'Team B',
        type: 'cpu',
        count: 1,
        tags: { include: [], exclude: [] },
        modifiers: true
      }
    }
  });

  // Helper to find current format label
  const getCurrentFormatLabel = () => {
    const a = formData.config?.teamA?.count || 1;
    const b = formData.config?.teamB?.count || 1;
    
    // Find format matching counts
    const format = BATTLE_FORMATS.find(f => f.a === a && f.b === b);
    return format ? format.label : 'Custom';
  };

  // Fetch Initial Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [arenasRes, groupsRes, tagsRes, charsRes] = await Promise.all([
          fetch('/api/arenas'),
          fetch('/api/groups'),
          fetch('/api/tags'),
          fetch('/api/characters')
        ]);
        
        const arenasData = await arenasRes.json();
        const groupsData = await groupsRes.json();
        const tagsData = await tagsRes.json();
        const charsData = await charsRes.json();
        
        setArenas(arenasData);
        setGroups(groupsData);
        setAvailableTags(tagsData);
        setCharacters(charsData);

        if (challengeId) {
          const challengeRes = await fetch(`/api/challenges?id=${challengeId}`);
          if (challengeRes.ok) {
            const data = await challengeRes.json();
            // Ensure deep merge or defaults for new fields if editing old data
            setFormData({
                ...data,
                config: {
                    ...data.config,
                    tournamentType: data.config.tournamentType || 'classic',
                    teamA: data.config.teamA || { name: 'Team A', type: 'player', count: 1, minRank: 'C', maxRank: 'S+', tags: { include: [], exclude: [] }, modifiers: true },
                    teamB: data.config.teamB || { name: 'Team B', type: 'cpu', count: 1, minRank: 'C', maxRank: 'S+', tags: { include: [], exclude: [] }, modifiers: true }
                }
            });
          }
        }
      } catch (err) {
        console.error('Error loading data', err);
      } finally {
        setFetchingData(false);
      }
    };
    loadData();
  }, [challengeId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const json = await res.json();
      setFormData(prev => ({...prev, imageUrl: json.url}));
    } catch (e) {
      console.error(e);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };



  const updateTeamConfig = (team: 'teamA' | 'teamB', updates: Partial<TeamConfig>) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [team]: {
          ...prev.config?.[team],
          ...updates
        }
      }
    }));
  };

  // --- MATCH VALIDATION LOGIC ---
  const getEligibleCandidates = (config: TeamConfig): Character[] => {
    if (!characters.length) return [];
    
    return characters.filter(char => {
        // 1. Explicit Exclude (Top Priority)
        if (config.excludedFighters?.includes(char.id)) return false;

        // 2. Explicit Include (Bypasses Group Filter)
        const isExplicitlyIncluded = config.includedFighters?.includes(char.id);

        if (!isExplicitlyIncluded) {
            // 3. Group Filter
            const groups = config.groupIds || (config.groupId ? [config.groupId] : []);
            
            // If groups are selected, character MUST be in one of them
            if (groups.length > 0) {
                if (!groups.includes(char.groupId)) return false;
            } 
            // If NO groups selected, allow ALL (unless legacy characterId is set)
            else if (config.characterId && char.id !== config.characterId) {
                return false;
            }
        }

        // 4. Find Valid Stages
        const validStages = char.stages.filter(stage => {
             // Check Stage Exclusion
             const stageKey = `${char.id}:${stage.stage}`;
             if (config.excludedStages?.includes(stageKey)) return false;

             return isStageEligible(stage, config, char.canonScale);
        });

        return validStages.length > 0;
    });
  };

  const isStageEligible = (stage: CharacterStage, config: TeamConfig, charCanonScale: number = 0): boolean => {
      // 4. Stage Filter
      if (config.stageId && stage.stage !== config.stageId) return false;

      // Power Filter (Stage Level)
      const min = config.powerRange?.min ?? 0;
      const max = config.powerRange?.max ?? 16000;
      
      const statsSum = Object.values(stage.stats)
          .filter(val => typeof val === 'number')
          .reduce((a, b) => (a as number) + (b as number), 0) as number;
      const total = charCanonScale + statsSum;
      
      if (total < min || total > max) return false;

      // Tag Filter
      const stageTags = [
          ...(stage.tags.combatClass || []),
          ...(stage.tags.movement || []),
          ...(stage.tags.element || []),
          ...(stage.tags.source || []),
          stage.tags.composition,
          stage.tags.size
      ].filter(Boolean);

      const hasAllIncludes = (config.tags?.include || []).every(t => stageTags.includes(t as any));
      if (!hasAllIncludes) return false;

      const hasAnyExcludes = (config.tags?.exclude || []).some(t => stageTags.includes(t as any));
      if (hasAnyExcludes) return false;

      return true;
  };

  const candidatesA = formData.config?.teamA ? getEligibleCandidates(formData.config.teamA) : [];
  const candidatesB = formData.config?.teamB ? getEligibleCandidates(formData.config.teamB) : [];

  const poolA = candidatesA.length;
  const poolB = candidatesB.length;
  
  const countA = formData.config?.teamA?.count || 1;
  const countB = formData.config?.teamB?.count || 1;
  
  const isTeamAValid = poolA >= countA;
  const isTeamBValid = poolB >= countB;
  
  // --- TOURNAMENT CAPACITY LOGIC ---
  const isSinglePool = JSON.stringify(formData.config?.teamA) === JSON.stringify(formData.config?.teamB) || 
                       (formData.config?.teamA?.groupId === formData.config?.teamB?.groupId && !formData.config?.teamA?.groupId);

  const calculateTournamentCapacity = () => {
      // 0. Validation Check: If invalid pools, return 0 matches
      if (isSinglePool) {
          if (!isTeamAValid) return { totalFighters: 0, totalTeams: 0, bracketSize: 0, estimatedMatches: 0, type: formData.config?.tournamentType || 'classic' };
      } else {
          // In Faction/Split mode, BOTH teams must have at least enough for one squad
          if (!isTeamAValid || !isTeamBValid) return { totalFighters: 0, totalTeams: 0, bracketSize: 0, estimatedMatches: 0, type: formData.config?.tournamentType || 'classic' };
      }

      // 1. Get Unique Candidates
      const allCandidates = isSinglePool 
          ? candidatesA 
          : Array.from(new Set([...candidatesA, ...candidatesB].map(c => c.id)))
              .map(id => [...candidatesA, ...candidatesB].find(c => c.id === id)!);
      
      const totalFighters = allCandidates.length;
      
      // 2. Calculate Formable Teams
      // For 2v2, we need 2 people per team.
      // Assuming symmetric team sizes for tournament mode
      const teamSize = Math.max(countA, countB); 
      let totalTeams = Math.floor(totalFighters / teamSize);

      // Apply Bracket Limit
      const limit = formData.config?.limit || 0;
      if (limit > 0) {
          totalTeams = Math.min(totalTeams, limit);
      }
      
      // 3. Calculate Matches based on Mode
      let estimatedMatches = 0;
      let bracketSize = 0;
      const type = formData.config?.tournamentType || 'classic';

      if (type === 'last_standing') {
          // Last One Standing / King of the Hill
          // All teams play in a linear sequence (or queue).
          // N teams = N - 1 matches to find the sole survivor.
          estimatedMatches = Math.max(0, totalTeams - 1);
      } else {
          // Classic / Tournament (Elimination Bracket)
          // Must be Power of 2 to have a balanced bracket (Standard behavior)
          // Example: 5 teams -> floor to 4 -> 3 matches
          // Example: 2 teams -> floor to 2 -> 1 match
          bracketSize = Math.pow(2, Math.floor(Math.log2(Math.max(1, totalTeams))));
          estimatedMatches = Math.max(0, bracketSize - 1);
      }
      
      return { totalFighters, totalTeams, bracketSize, estimatedMatches, type };
  };

  const { totalFighters, totalTeams, bracketSize, estimatedMatches, type } = calculateTournamentCapacity();
  const isMatchPossible = estimatedMatches > 0;

  // --- AUTO-CORRECT LIMIT ---
  useEffect(() => {
    const limit = formData.config?.limit || 0;
    // If limit is set (not 0) and exceeds total available teams, reset to 0 (Max)
    if (limit > 0 && limit > totalTeams) {
        setFormData(p => ({
            ...p,
            config: {
                ...p.config!,
                limit: 0
            }
        }));
    }
  }, [totalTeams, formData.config?.limit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      alert('Title is required');
      return;
    }

    if (!isMatchPossible) {
       alert('Cannot save: Insufficient fighters to form a valid tournament based on current settings.');
       return;
    }

    setLoading(true);

    try {
      const method = challengeId ? 'PUT' : 'POST';
      const res = await fetch('/api/challenges', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        router.push(redirectPath); // Redirect to list
      } else {
        alert('Failed to save scenario');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving scenario');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
      const matches: string[] = [];
      
      if (isSinglePool) {
          const typeLabel = TOURNAMENT_TYPES.find(t => t.id === type)?.label || type;
          
          matches.push(`Mode: ${typeLabel}`);
          matches.push(`Total Fighters: ${totalFighters}`);
          matches.push(`Formable Teams (${Math.max(countA, countB)} per team): ${totalTeams} ${formData.config?.limit ? `(Limited to ${formData.config.limit})` : ''}`);
          
          if (type === 'last_standing') {
               matches.push(`Logic: King of the Hill (Winner Stays)`);
               matches.push(`Total Matches: ${estimatedMatches} (Teams - 1)`);
               matches.push(``);
               matches.push(`Structure:`);
               matches.push(`Match 1: Team 1 vs Team 2`);
               matches.push(`Match 2: Winner vs Team 3`);
               matches.push(`...`);
               matches.push(`Match ${estimatedMatches}: Winner vs Team ${totalTeams}`);
          } else {
              matches.push(`Logic: Elimination Bracket (Power of 2)`);
              matches.push(`Bracket Size: ${bracketSize}`);
              matches.push(`Total Matches: ${estimatedMatches}`);
              matches.push(``);
              matches.push(`Structure:`);
              matches.push(`Round of ${bracketSize} -> ... -> Final`);
          }
      } else {
          matches.push(`Faction Mode: Team A vs Team B`);
          matches.push(`Matches based on available squads.`);
      }
      
      setPreviewMatches(matches);
      setShowPreview(true);
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center min-h-screen text-orange-500">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const currentTypeConfig = TOURNAMENT_TYPES.find(t => t.id === (formData.config?.tournamentType || 'classic'));

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={redirectPath} className="p-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white flex items-center gap-2">
              {challengeId ? 'EDIT' : 'NEW'} <span className="text-orange-500">CHALLENGE</span>
            </h1>
            <p className="text-zinc-500 text-sm">Configure the scenario rules and teams.</p>
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={loading || !isMatchPossible}
          className={`
            flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${!isMatchPossible ? 'bg-red-900/50 text-red-500' : 'bg-orange-600 hover:bg-orange-500 text-white'}
          `}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : (isMatchPossible ? <Save size={18} /> : <AlertTriangle size={18} />)}
          <span>{isMatchPossible ? 'SAVE CHALLENGE' : 'INVALID CONFIG'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* TOP SECTION: General Info */}
        <div className="lg:col-span-12 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Trophy className="text-orange-500" size={20} />
                        Challenge Overview
                    </h3>
                    
                    {/* Real-time Match Counter */}
                    <div 
                        onClick={isMatchPossible ? generatePreview : undefined}
                        className={`px-4 py-2 rounded-lg border flex items-center gap-3 transition-all ${isMatchPossible ? 'bg-green-900/20 border-green-500/30 text-green-400 cursor-pointer hover:bg-green-900/30' : 'bg-red-900/20 border-red-500/30 text-red-400 cursor-not-allowed'}`}
                    >
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                                {isSinglePool ? 'Tournament Capacity' : 'Matches'}
                            </p>
                            <p className="text-xl font-mono font-black leading-none">
                                {isMatchPossible ? estimatedMatches.toLocaleString() : '0'}
                            </p>
                        </div>
                        {isMatchPossible ? <Swords size={24} /> : <AlertTriangle size={24} />}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Challenge Name</label>
                            <input 
                                type="text" 
                                value={formData.title} 
                                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                                placeholder="e.g. The Uchiha Massacre"
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Description</label>
                            <textarea 
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none h-24 resize-none"
                                placeholder="Brief lore description..."
                            />
                        </div>

                        {/* New Field: Image Upload (16:9) */}
                        <div>
                            <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Cover Image (16:9)</label>
                            
                            {formData.imageUrl ? (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 group">
                                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button 
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, imageUrl: '' }))}
                                            className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-full transform hover:scale-110 transition-all"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] text-zinc-300 pointer-events-none">
                                        16:9 Preview
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full aspect-video rounded-xl border border-zinc-800 border-dashed bg-zinc-950/50 hover:bg-zinc-900/50 transition-colors relative">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={uploading}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 pointer-events-none">
                                        {uploading ? (
                                            <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
                                        ) : (
                                            <Upload className="mb-2" size={32} />
                                        )}
                                        <span className="text-sm font-bold uppercase tracking-wider">
                                            {uploading ? 'Uploading...' : 'Click to Upload Image'}
                                        </span>
                                        <span className="text-[10px] opacity-60 mt-1">Supports JPG, PNG, WEBP</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Mode Config */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* 1. Game Type (Voting vs Stat) */}
                            <div>
                                <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Game Type</label>
                                <div className="relative">
                                    <select 
                                        value={formData.config?.tournamentType === 'stat_attack' ? 'stat_attack' : 'classic'}
                                        onChange={e => {
                                            const newType = e.target.value;
                                            setFormData(p => ({
                                                ...p,
                                                config: {
                                                    ...p.config!,
                                                    tournamentType: newType as any
                                                }
                                            }));
                                        }}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none appearance-none"
                                    >
                                        {GAME_TYPES.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* 2. Battle Format (Size) */}
                            <div>
                                <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Battle Format</label>
                                <div className="relative">
                                    <select
                                        value={getCurrentFormatLabel()}
                                        onChange={(e) => {
                                            const format = BATTLE_FORMATS.find(f => f.label === e.target.value);
                                            
                                            if (format) {
                                                setFormData(p => ({
                                                    ...p,
                                                    config: {
                                                        ...p.config!,
                                                        teamA: { ...p.config!.teamA!, count: format.a },
                                                        teamB: { ...p.config!.teamB!, count: format.b }
                                                    }
                                                }));
                                            }
                                        }}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none appearance-none"
                                    >
                                        {BATTLE_FORMATS.map(f => (
                                            <option key={f.label} value={f.label}>{f.label}</option>
                                        ))}
                                        {!BATTLE_FORMATS.some(f => f.a === formData.config?.teamA?.count && f.b === formData.config?.teamB?.count) && (
                                            <option>Custom</option>
                                        )}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* 3. Bracket Type */}
                            <div>
                                <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Bracket Type</label>
                                <div className="relative">
                                    <select
                                        value={formData.config?.tournamentType === 'last_standing' ? 'last_standing' : 'classic'}
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            // Don't override stat_attack if selected
                                            if (formData.config?.tournamentType !== 'stat_attack') {
                                                setFormData(p => ({
                                                    ...p,
                                                    config: {
                                                        ...p.config!,
                                                        tournamentType: newType as any,
                                                        limit: 0 // Reset limit when changing type
                                                    }
                                                }));
                                            }
                                        }}
                                        disabled={formData.config?.tournamentType === 'stat_attack'}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none appearance-none disabled:opacity-50"
                                    >
                                        {BRACKET_TYPES.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* 4. Bracket Size */}
                            <div>
                                <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Bracket Size</label>
                                <div className="relative">
                                    <select
                                        value={formData.config?.limit || 0}
                                        onChange={(e) => setFormData(p => ({ ...p, config: { ...p.config!, limit: Number(e.target.value) } }))}
                                        className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none appearance-none ${!isMatchPossible ? 'border-red-500/50 text-red-400' : 'border-zinc-800'}`}
                                    >
                                        {(formData.config?.tournamentType === 'last_standing' ? BRACKET_SIZES.last_standing : BRACKET_SIZES.classic)
                                            .filter(size => size.value === 0 || size.value <= totalTeams)
                                            .map(size => (
                                                <option key={size.value} value={size.value}>{size.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                                </div>
                                {!isMatchPossible && (
                                     <div className="mt-2 p-2 bg-red-950/30 border border-red-500/30 rounded-lg text-[10px] text-red-400 font-bold flex items-center gap-2 animate-pulse">
                                         <AlertTriangle size={14} />
                                         <span>INSUFFICIENT FIGHTERS ({totalTeams})</span>
                                     </div>
                                )}
                            </div>
                        </div>

                        {/* Global Modifiers & Power Scale Toggle */}
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Zap size={18} className="text-yellow-500" />
                                    <span className="font-bold text-sm">Global Power Scale</span>
                                </div>
                                <p className="text-xs text-zinc-500">Equalize stats based on Tiers to make battles fair.</p>
                            </div>
                            
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, config: { ...prev.config, powerScale: !prev.config?.powerScale } }))}
                                className={`
                                    w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out
                                    ${formData.config?.powerScale ? 'bg-orange-600' : 'bg-zinc-800'}
                                `}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${formData.config?.powerScale ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Arena Pool (Multi-select)</label>
                            <ArenaSelector 
                                arenas={arenas}
                                selectedArenaIds={formData.config?.arenaPool || []}
                                onChange={ids => setFormData(p => ({ ...p, config: { ...p.config!, arenaPool: ids } }))}
                            />
                            <p className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1">
                                <Zap size={10} /> Selected arenas will be chosen randomly or by vote.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* BOTTOM SECTION: Split View (Team A vs Team B) */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            
            {/* VS Badge */}
            <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black rounded-full border-2 border-orange-600 items-center justify-center z-10 shadow-xl shadow-orange-900/50">
                <span className="font-black italic text-orange-500 text-sm">VS</span>
            </div>

            {/* Team A Config */}
            <TeamConfigPanel 
                teamLabel="Team A (Challengers)" 
                config={formData.config?.teamA!} 
                onChange={(updates) => updateTeamConfig('teamA', updates)}
                groups={groups}
                characters={characters}
                availableTags={availableTags}
                color="blue"
                poolSize={poolA}
                requiredCount={countA}
            />

            {/* Team B Config */}
            <TeamConfigPanel 
                teamLabel="Team B (The Threat)" 
                config={formData.config?.teamB!} 
                onChange={(updates) => updateTeamConfig('teamB', updates)}
                groups={groups}
                characters={characters}
                availableTags={availableTags}
                color="red"
                poolSize={poolB}
                requiredCount={countB}
            />

        </div>



      </div>

      {/* Match Preview Modal */}
      {showPreview && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Swords className="text-orange-500" size={18} />
                          Possible Matchups
                      </h3>
                      <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-2 flex-1">
                      {previewMatches.map((match, idx) => (
                          <div key={idx} className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50 text-sm font-mono text-zinc-300 flex items-center gap-3">
                              {match}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

// Sub-component for Team Configuration Panel
function TeamConfigPanel({ 
    teamLabel, 
    config, 
    onChange, 
    groups, 
    characters,
    availableTags,
    color,
    poolSize,
    requiredCount
}: { 
    teamLabel: string, 
    config: TeamConfig, 
    onChange: (updates: Partial<TeamConfig>) => void,
    groups: Group[],
    characters: Character[],
    availableTags: string[],
    color: 'blue' | 'red',
    poolSize: number,
    requiredCount: number
}) {
    const borderColor = color === 'blue' ? 'border-blue-500/30' : 'border-red-500/30';
    const headerColor = color === 'blue' ? 'text-blue-400' : 'text-red-400';
    const isValid = poolSize >= requiredCount;

    // Calculate Power Bounds based on selected groups AND included/excluded fighters
    const powerBounds = React.useMemo(() => {
        let chars = characters;
        
        const selectedGroupIds = config.groupIds || (config.groupId ? [config.groupId] : []);
        const includedIds = config.includedFighters || (config.characterId ? [config.characterId] : []);
        const excludedIds = config.excludedFighters || [];
        
        // Filter chars that are EITHER in selected groups OR explicitly included
        // AND not explicitly excluded
        if (selectedGroupIds.length > 0 || includedIds.length > 0) {
            chars = chars.filter(c => {
                const isExcluded = excludedIds.includes(c.id);
                if (isExcluded) return false;

                const isInGroup = selectedGroupIds.includes(c.groupId);
                const isIncluded = includedIds.includes(c.id);

                return isInGroup || isIncluded;
            });
        }
        
        if (!chars.length) return { min: 0, max: 16000 };

        let min = Infinity;
        let max = -Infinity;
        
        const excludedStageKeys = config.excludedStages || [];

        chars.forEach(char => {
            const scale = char.canonScale || 0;
            char.stages.forEach(stage => {
                 const stageKey = `${char.id}:${stage.stage}`;
                 if (excludedStageKeys.includes(stageKey)) return;

                 const statsSum = Object.values(stage.stats)
                    .filter(val => typeof val === 'number')
                    .reduce((a, b) => (a as number) + (b as number), 0) as number;
                 const total = scale + statsSum;
                 if (total < min) min = total;
                 if (total > max) max = total;
            });
        });

        if (min === Infinity) return { min: 0, max: 16000 };

        // Round to nice numbers
        return { 
            min: Math.floor(min / 100) * 100, 
            max: Math.ceil(max / 100) * 100 
        };
    }, [characters, config.groupIds, config.groupId, config.includedFighters, config.characterId, config.excludedFighters]);

    return (
        <div className={`bg-zinc-900/50 border ${borderColor} rounded-xl p-6 space-y-6 relative overflow-hidden transition-all ${!isValid ? 'opacity-80' : ''}`}>
            <div className={`absolute top-0 left-0 w-full h-1 ${color === 'blue' ? 'bg-blue-500' : 'bg-red-500'}`} />
            
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-lg font-black italic uppercase ${headerColor}`}>{teamLabel}</h3>
                    <div className={`flex items-center gap-1.5 mt-1 text-xs font-mono font-bold ${isValid ? 'text-zinc-400' : 'text-red-500'}`}>
                        {isValid ? <CheckCircle2 size={12} className="text-green-500" /> : <AlertTriangle size={12} />}
                        <span>REQ: {requiredCount}</span>
                    </div>
                </div>

                <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-3 transition-all ${isValid ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                     <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Available</p>
                        <p className="text-lg font-mono font-black leading-none">{poolSize}</p>
                     </div>
                     <Users size={18} className="opacity-80" />
                </div>
            </div>

            {/* Team Selection (Groups/Fighters/Stages) */}
            <div>
                <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Team Composition</label>
                <TeamSelector 
                    config={config}
                    onChange={onChange}
                    groups={groups}
                    characters={characters}
                    teamLabel={teamLabel}
                />
                <p className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1">
                    <Zap size={10} /> Select groups, specific fighters, or exclude unwanted stages.
                </p>
            </div>

            {/* Rank/Power Configuration */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs uppercase font-bold text-zinc-500">Power Level Range</label>
                </div>

                {/* POWER SLIDER UI */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between text-xs font-mono text-zinc-400">
                        <span>MIN: {config.powerRange?.min ?? powerBounds.min}</span>
                        <span>MAX: {config.powerRange?.max ?? powerBounds.max}</span>
                    </div>
                    
                    {/* Simple Dual Range Slider Simulation */}
                    <div className="relative h-6 flex items-center select-none">
                        <div className="absolute left-0 right-0 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className="absolute h-full bg-orange-600"
                                style={{
                                    left: `${((config.powerRange?.min ?? powerBounds.min) / 16000) * 100}%`,
                                    right: `${100 - ((config.powerRange?.max ?? powerBounds.max) / 16000) * 100}%`
                                }}
                            />
                        </div>
                        
                        {/* Inputs for precise control (acting as handles) */}
                        <input 
                            type="range" min="0" max="16000" step="100"
                            value={config.powerRange?.min ?? powerBounds.min}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                const max = config.powerRange?.max ?? powerBounds.max;
                                if(val < max) onChange({ powerRange: { min: val, max } });
                            }}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto"
                            style={{ zIndex: 10 }}
                        />
                            <input 
                            type="range" min="0" max="16000" step="100"
                            value={config.powerRange?.max ?? powerBounds.max}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                const min = config.powerRange?.min ?? powerBounds.min;
                                if(val > min) onChange({ powerRange: { min, max: val } });
                            }}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto"
                            style={{ zIndex: 11 }}
                        />
                        
                        {/* Visual Thumbs */}
                        <div 
                            className="absolute w-4 h-4 bg-white border-2 border-orange-500 rounded-full shadow cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                            style={{ left: `calc(${((config.powerRange?.min ?? powerBounds.min) / 16000) * 100}% - 8px)` }}
                        />
                        <div 
                            className="absolute w-4 h-4 bg-white border-2 border-orange-500 rounded-full shadow cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                            style={{ left: `calc(${((config.powerRange?.max ?? powerBounds.max) / 16000) * 100}% - 8px)` }}
                        />
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>Roster Range: {powerBounds.min.toLocaleString()} - {powerBounds.max.toLocaleString()}</span>
                        <span>Global Limit: 0 - 16,000</span>
                    </div>
                </div>
            </div>

            {/* Stage/Form Mode Selection */}
            <div>
                <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Stage Selection Mode</label>
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    {(['random', 'weakest', 'strongest'] as const).map(mode => {
                        const isActive = (config.stageMode || 'random') === mode;
                        return (
                            <button
                                key={mode}
                                onClick={() => onChange({ stageMode: mode })}
                                className={`
                                    flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize
                                    ${isActive 
                                        ? (color === 'blue' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-red-600 text-white shadow-lg shadow-red-900/50') 
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}
                                `}
                            >
                                {mode}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modifiers Toggle */}
            <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold uppercase text-zinc-500">Enable Modifiers</span>
                <button
                    onClick={() => onChange({ modifiers: !config.modifiers })}
                    className={`
                        w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out
                        ${config.modifiers ? (color === 'blue' ? 'bg-blue-600' : 'bg-red-600') : 'bg-zinc-800'}
                    `}
                >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${config.modifiers ? 'left-6' : 'left-1'}`} />
                </button>
            </div>

            {/* Tags Configuration */}
            <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                 <label className="block text-xs uppercase font-bold text-zinc-500">Tag Rules</label>
                 
                 {/* Must Have */}
                 <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Plus size={14} className="text-green-500" />
                        <span className="text-xs font-bold text-zinc-400">MUST HAVE (Include)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {config.tags?.include?.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-green-900/30 text-green-400 border border-green-900 rounded text-[10px] flex items-center gap-1">
                                {tag}
                                <button onClick={() => {
                                    const newInclude = config.tags?.include?.filter(t => t !== tag) || [];
                                    onChange({ tags: { ...config.tags!, include: newInclude } });
                                }}><Trash2 size={10} /></button>
                            </span>
                        ))}
                         <select 
                            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-400 outline-none"
                            onChange={(e) => {
                                if(e.target.value) {
                                    const newInclude = [...(config.tags?.include || []), e.target.value];
                                    onChange({ tags: { ...config.tags!, include: newInclude } });
                                    e.target.value = '';
                                }
                            }}
                        >
                            <option value="">+ Add Tag</option>
                            {availableTags.filter(t => !config.tags?.include?.includes(t)).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                 </div>

                 {/* Must NOT Have */}
                 <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                        <LogOut size={14} className="text-red-500" />
                        <span className="text-xs font-bold text-zinc-400">FORBIDDEN (Exclude)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                         {config.tags?.exclude?.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-red-900/30 text-red-400 border border-red-900 rounded text-[10px] flex items-center gap-1">
                                {tag}
                                <button onClick={() => {
                                    const newExclude = config.tags?.exclude?.filter(t => t !== tag) || [];
                                    onChange({ tags: { ...config.tags!, exclude: newExclude } });
                                }}><Trash2 size={10} /></button>
                            </span>
                        ))}
                         <select 
                            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-400 outline-none"
                            onChange={(e) => {
                                if(e.target.value) {
                                    const newExclude = [...(config.tags?.exclude || []), e.target.value];
                                    onChange({ tags: { ...config.tags!, exclude: newExclude } });
                                    e.target.value = '';
                                }
                            }}
                        >
                            <option value="">+ Ban Tag</option>
                            {availableTags.filter(t => !config.tags?.exclude?.includes(t)).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                 </div>
            </div>

        </div>
    );
}
