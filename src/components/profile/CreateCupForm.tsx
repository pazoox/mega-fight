"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Settings,
  Save,
  AlertTriangle,
  Users,
  Dumbbell
} from 'lucide-react';
import { ArenaSelector } from '@/components/admin/ArenaSelector';
import { TeamSelector } from '@/components/admin/TeamSelector';
import { DualRangeSlider } from '@/components/ui/DualRangeSlider';
import CustomSelect from '@/components/ui/CustomSelect';
import { Group, Arena, Character } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Helper Toggle Component
const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#333] rounded-xl cursor-pointer hover:border-gray-600 transition-colors" onClick={() => onChange(!checked)}>
        <span className="text-sm font-bold text-zinc-400">{label}</span>
        <div className={`w-10 h-5 rounded-full p-1 transition-colors relative ${checked ? 'bg-yellow-500' : 'bg-zinc-800'}`}>
            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform absolute top-1 ${checked ? 'left-6' : 'left-1'}`} />
        </div>
    </div>
);

interface CreateCupFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateCupForm({ onSuccess, onCancel }: CreateCupFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Config State
  const [config, setConfig] = useState({
    format: 'elimination', 
    participantCriteria: {
      powerScale: true,
      minRank: 'C',
      maxRank: 'S+',
      minPower: 0,
      maxPower: 16000,
      franchises: [] as string[], 
      specificCharacters: [] as string[],
      excludedCharacters: [] as string[],
      tags: [] as string[],
      minTagMatches: 1,
      bracketSize: 8,
      stageMode: 'random' as 'random' | 'weakest' | 'strongest'
    },
    teamSize: 1, 
    rules: {
      dailyMatches: 1, // Not used for cups but kept for compatibility
      enableModifiers: true,
      arenaPool: ['random'],
      thirdPlaceMatch: false
    }
  });

  // Data State
  const [characters, setCharacters] = useState<any[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Data
  useEffect(() => {
    Promise.all([
      fetch('/api/characters?onlyActive=true').then(res => res.json()),
      fetch('/api/groups').then(res => res.json()),
      fetch('/api/arenas').then(res => res.json())
    ]).then(([charsData, groupsData, arenasData]) => {
      setCharacters(charsData);
      setGroups(groupsData);
      setArenas(arenasData);
    }).catch(err => console.error("Failed to load data:", err));
  }, []);

  // Filter Logic (Same as Admin)
  const eligibleCharacters = useMemo(() => {
      return characters.filter(c => {
         const criteria = config.participantCriteria;
         
         if (criteria.excludedCharacters && criteria.excludedCharacters.includes(c.id)) return false;
         
         if (criteria.specificCharacters && criteria.specificCharacters.includes(c.id)) {
             return true;
         }
  
         if (criteria.franchises.length > 0 && !criteria.franchises.includes(c.group_id)) return false;
  
         const stages = c.stages || [];
         if (stages.length === 0) return false;
         
         const getStagePower = (s: any) => {
             return Object.values(s.stats || {}).reduce((a: any, b: any) => (Number(a)||0) + (Number(b)||0), 0) as number;
         };
  
         let powerToTest = 0;
         if (criteria.stageMode === 'weakest') {
             powerToTest = Math.min(...stages.map((s: any) => getStagePower(s)));
         } else if (criteria.stageMode === 'strongest') {
             powerToTest = Math.max(...stages.map((s: any) => getStagePower(s)));
         } else {
             // Random: we assume max potential for filtering purposes to be inclusive
             powerToTest = Math.max(...stages.map((s: any) => getStagePower(s)));
         }
        
        if (criteria.powerScale && (powerToTest < criteria.minPower || powerToTest > criteria.maxPower)) return false;

        if (criteria.tags.length > 0) {
             const allStageTags = new Set<string>(Array.isArray(c.tags) ? c.tags : []);
             stages.forEach((s: any) => {
                 if (s.tags) {
                     if (Array.isArray(s.tags.combatClass)) s.tags.combatClass.forEach((t: string) => allStageTags.add(t));
                     if (Array.isArray(s.tags.source)) s.tags.source.forEach((t: string) => allStageTags.add(t));
                     if (Array.isArray(s.tags.element)) s.tags.element.forEach((t: string) => allStageTags.add(t));
                     if (s.tags.composition) allStageTags.add(s.tags.composition);
                 }
             });
  
             const matchCount = criteria.tags.filter(t => allStageTags.has(t)).length;
             const minRequired = criteria.minTagMatches || 1;
             if (matchCount < minRequired) return false;
         }
  
         return true; 
      });
  }, [characters, config.participantCriteria]);

  const handleSave = async () => {
    if (!name) {
      alert("Please enter a cup name");
      return;
    }

    if (!user) {
        alert("You must be logged in to create a cup");
        return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/user/cups', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          userId: user.id,
          name,
          description,
          config: { ...config, meta: { ...(config as any).meta, origin: 'profile' } }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create cup');
      }
      
      onSuccess();
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "Error creating cup");
    } finally {
      setIsSaving(false);
    }
  };

  const requiredChars = (config.participantCriteria.bracketSize || 8) * (config.teamSize || 1);
  const available = eligibleCharacters.length;
  const isReady = available >= requiredChars;
  const missing = requiredChars - available;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-black italic uppercase text-white">Create New Cup</h2>
                <p className="text-zinc-400">Configure your custom tournament settings.</p>
            </div>
            <button onClick={onCancel} className="text-zinc-500 hover:text-white">Cancel</button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5" />
            <div>
              <div className="font-bold">Error creating cup</div>
              <div className="text-sm">{errorMsg}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
            <div className="space-y-8">
                {/* 1. Basic Info */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
                    <h3 className="font-bold text-lg text-yellow-500 border-b border-zinc-800 pb-2 flex items-center gap-2">
                        <Trophy size={20} /> Cup Details
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-400">Cup Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-yellow-500 outline-none hover:border-gray-600 transition-colors font-bold"
                                placeholder="e.g. My Awesome Cup"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-400">Description</label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-white focus:border-yellow-500 outline-none hover:border-gray-600 transition-colors min-h-[80px]"
                                placeholder="Describe your tournament rules or theme..."
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Format Settings (Extracted from Game Mode & Rules) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
                    <h3 className="font-bold text-lg text-yellow-500 border-b border-zinc-800 pb-2 flex items-center gap-2">
                        <Settings size={20} /> Format Settings
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-400">Team Size</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((size) => (
                                <button 
                                    key={size}
                                    onClick={() => setConfig({...config, teamSize: size})}
                                    className={`p-2 rounded-xl border text-sm font-black transition-all ${config.teamSize === size ? 'border-yellow-500 bg-yellow-500 text-black' : 'border-[#333] bg-[#1a1a1a] text-zinc-400 hover:border-gray-600'}`}
                                >
                                    {size}v{size}
                                </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-400">Bracket Size</label>
                            <CustomSelect
                                value={config.participantCriteria.bracketSize}
                                onChange={(val) => setConfig({
                                    ...config, 
                                    participantCriteria: { ...config.participantCriteria, bracketSize: Number(val) }
                                })}
                                options={[4, 8, 16, 32, 64].map((size) => ({
                                    label: `${size} Teams`,
                                    value: size
                                }))}
                                className="font-bold"
                                triggerClassName="bg-[#1a1a1a] border-[#333]"
                            />
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <Toggle 
                            label="3rd Place Match" 
                            checked={config.rules.thirdPlaceMatch} 
                            onChange={(val) => setConfig({
                                ...config,
                                rules: { ...config.rules, thirdPlaceMatch: val }
                            })}
                        />
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Criteria */}
            <div className="space-y-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
                    <h3 className="font-bold text-lg text-yellow-500 border-b border-zinc-800 pb-2 flex items-center gap-2">
                        <Users size={20} /> Participant Criteria
                    </h3>

                    {/* Franchises */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-400">Allowed Franchises & Fighters</label>
                        <TeamSelector 
                            groups={groups}
                            characters={characters}
                            config={{
                                type: 'player',
                                count: config.teamSize || 1,
                                groupIds: config.participantCriteria.franchises,
                                includedFighters: config.participantCriteria.specificCharacters,
                                excludedFighters: config.participantCriteria.excludedCharacters || []
                            }}
                            onChange={(updates) => {
                                setConfig(prev => ({
                                    ...prev,
                                    participantCriteria: {
                                        ...prev.participantCriteria,
                                        franchises: updates.groupIds || prev.participantCriteria.franchises,
                                        specificCharacters: updates.includedFighters || prev.participantCriteria.specificCharacters,
                                        excludedCharacters: updates.excludedFighters || prev.participantCriteria.excludedCharacters || []
                                    }
                                }));
                            }}
                            className="bg-[#1a1a1a] border-[#333]"
                        />
                    </div>

                    {/* Stage Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-400">Character Form Selection</label>
                        <CustomSelect
                            value={config.participantCriteria.stageMode}
                            onChange={(val) => setConfig({
                                ...config,
                                participantCriteria: { ...config.participantCriteria, stageMode: val }
                            })}
                            options={[
                                { label: 'Random', value: 'random', description: 'Fighters use a random form' },
                                { label: 'Weakest', value: 'weakest', description: 'Fighters use their weakest form' },
                                { label: 'Strongest', value: 'strongest', description: 'Fighters use their strongest form' }
                            ]}
                            className="font-bold"
                            triggerClassName="bg-[#1a1a1a] border-[#333]"
                        />
                    </div>

                    {/* Power Range */}
                    {config.participantCriteria.powerScale && (
                    <div className="space-y-4 p-4 bg-[#1a1a1a] rounded-xl border border-[#333]">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-zinc-400">Power Level Range</label>
                            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                                <span>{config.participantCriteria.minPower}</span>
                                <span>-</span>
                                <span>{config.participantCriteria.maxPower}</span>
                            </div>
                        </div>
                            <DualRangeSlider
                            min={0}
                            max={16000}
                            step={100}
                            value={[config.participantCriteria.minPower, config.participantCriteria.maxPower]}
                                onChange={([min, max]) => setConfig({
                                ...config,
                                participantCriteria: { ...config.participantCriteria, minPower: min, maxPower: max }
                            })}
                            className="py-4"
                        />
                    </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Toggle 
                            label="Power Scale" 
                            checked={config.participantCriteria.powerScale} 
                            onChange={(val) => setConfig({
                                ...config,
                                participantCriteria: { ...config.participantCriteria, powerScale: val }
                            })}
                        />
                        <Toggle 
                            label="Arena Modifiers" 
                            checked={config.rules.enableModifiers} 
                            onChange={(val) => setConfig({
                                ...config,
                                rules: { ...config.rules, enableModifiers: val }
                            })}
                        />
                    </div>
                </div>

                {/* 3. Arena Pool */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
                    <h3 className="font-bold text-lg text-yellow-500 border-b border-zinc-800 pb-2 flex items-center gap-2">
                        <Dumbbell size={20} /> Arena Pool
                    </h3>
                    <ArenaSelector 
                        arenas={arenas}
                        selectedArenaIds={config.rules.arenaPool.filter(id => id !== 'random')}
                        onChange={(ids) => setConfig({
                            ...config,
                            rules: { ...config.rules, arenaPool: ids.length > 0 ? ids : ['random'] }
                        })}
                        className="bg-[#1a1a1a] border-[#333] min-h-[60px]"
                    />
                    <p className="text-xs text-zinc-500 text-right">
                        Selected: <span className="text-white font-bold">{config.rules.arenaPool.includes('random') ? 'Random (All)' : config.rules.arenaPool.length}</span>
                    </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-zinc-400 text-sm font-bold">Eligible Fighters</span>
                        <span className={`text-xl font-black ${isReady ? 'text-green-500' : 'text-red-500'}`}>
                            {available} <span className="text-zinc-600 text-sm font-normal">/ {requiredChars} required</span>
                        </span>
                    </div>
                    
                    {!isReady && (
                        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-3 mb-4 flex items-start gap-3">
                            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                            <p className="text-xs text-red-400">
                                Not enough characters! Relax criteria or add more fighters.
                            </p>
                        </div>
                    )}

                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !isReady}
                        className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-900/20 flex items-center justify-center gap-2"
                    >
                        {isSaving ? 'Saving...' : (
                            <>
                            <Save size={20} /> Create Cup
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}
