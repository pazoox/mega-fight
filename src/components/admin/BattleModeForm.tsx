'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChallengeConfig, ChallengeMode, SlotConfig } from '@/types';
import BattleLayoutEditor from '@/components/admin/BattleLayoutEditor';
import BracketVisualizer from '@/components/admin/BracketVisualizer';
import { Save, Loader2, ArrowLeft, Layout, Settings, Monitor, Clock, Swords, Shield, Users, Brain, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';

interface BattleModeData {
  id: string;
  mode: ChallengeMode;
  label: string;
  description: string;
  config: ChallengeConfig;
}

interface BattleModeFormProps {
  modeId: string;
}

export default function BattleModeForm({ modeId }: BattleModeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<'bracket' | 'engine' | 'endgame' | 'layout' | 'specifics' | 'ui'>('bracket');
  
  const [data, setData] = useState<BattleModeData | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/battle-modes?mode=${modeId}`);
        if (res.ok) {
          const modeData = await res.json();
          setData(modeData);
        } else {
          console.error('Failed to load mode data');
        }
      } catch (error) {
        console.error('Error loading mode data:', error);
      } finally {
        setFetching(false);
      }
    };
    loadData();
  }, [modeId]);

  const handleSave = async () => {
    if (!data) return;
    setLoading(true);
    try {
      const res = await fetch('/api/battle-modes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        alert('Battle Mode settings saved!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<ChallengeConfig>) => {
    if (!data) return;
    setData({
      ...data,
      config: { ...data.config, ...updates }
    });
  };

  const updateUiConfig = (updates: Partial<ChallengeConfig['ui']>) => {
    if (!data) return;
    setData({
      ...data,
      config: { 
        ...data.config, 
        ui: { ...data.config.ui, ...updates } 
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!data) {
    return <div className="text-white">Mode not found</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/battle-systems/modes" className="p-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white flex items-center gap-2">
              {data.label.toUpperCase()} <span className="text-orange-500">DEFAULTS</span>
            </h1>
            <p className="text-zinc-500 text-sm">{data.description}</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          <span>SAVE CHANGES</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-1 overflow-x-auto">
        {[
          { id: 'bracket', label: 'Bracket Structure', icon: Trophy },
          { id: 'engine', label: 'Battle Engine', icon: Swords },
          { id: 'endgame', label: 'End Game', icon: Zap },
          { id: 'layout', label: 'Battle Layout', icon: Layout },
          { id: 'specifics', label: 'Mode Specifics', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold text-sm transition-all relative top-[1px] whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-zinc-900 text-white border-t border-x border-zinc-800 border-b-black' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}
            `}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl rounded-tl-none p-6">
        
        {/* BRACKET STRUCTURE */}
        {activeTab === 'bracket' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               
               {/* Left Column: Type Selection & Configuration */}
               <div className="col-span-1 space-y-8">
                 {/* Type Selection */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                     <Trophy className="text-orange-500" size={20} />
                     Tournament Type
                   </h3>
                   
                   <div className="grid grid-cols-1 gap-3">
                     {[
                       { id: 'classic', label: 'Classic Elimination', desc: 'Standard Bracket (Quarter -> Semi -> Final)' },
                       { id: 'last_standing', label: 'Last One Standing', desc: 'Winner stays on. King of the Hill style.' },
                       { id: 'round_robin', label: 'Round Robin', desc: 'League format. Everyone fights everyone.' },
                     ].map(type => (
                        <div 
                          key={type.id}
                          onClick={() => {
                            const isLastStanding = type.id === 'last_standing';
                            updateConfig({ 
                              bracket: { 
                                ...data.config.bracket, 
                                type: type.id as any,
                                enableThirdPlace: isLastStanding ? false : data.config.bracket?.enableThirdPlace
                              } 
                            });
                          }}
                          className={`
                            cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-3
                            ${data.config.bracket?.type === type.id 
                              ? 'bg-orange-600/10 border-orange-500 text-white' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'}
                          `}
                        >
                          <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center ${data.config.bracket?.type === type.id ? 'border-orange-500' : 'border-zinc-600'}`}>
                            {data.config.bracket?.type === type.id && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{type.label}</div>
                            <div className="text-xs opacity-70">{type.desc}</div>
                          </div>
                        </div>
                     ))}
                   </div>
                 </div>

                 {/* Configuration */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                      <Shield className="text-orange-500" size={20} />
                      Configuration
                    </h3>

                    <div>
                       <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Default Bracket Size (Min Players)</label>
                       <select 
                         value={data.config.bracket?.defaultSize || 8}
                         onChange={(e) => updateConfig({ bracket: { ...data.config.bracket, defaultSize: parseInt(e.target.value) } })}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                       >
                         {[4, 8, 16, 32, 64].map(size => (
                           <option key={size} value={size}>{size} Fighters</option>
                         ))}
                       </select>
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${data.config.bracket?.type === 'last_standing' ? 'bg-zinc-950/50 border-zinc-800 opacity-50 cursor-not-allowed' : 'bg-zinc-950 border-zinc-800'}`}>
                        <div>
                          <h4 className={`font-bold text-sm ${data.config.bracket?.type === 'last_standing' ? 'text-zinc-500' : 'text-white'}`}>Third Place Match</h4>
                          <p className="text-xs text-zinc-500">Enable Bronze Medal fight.</p>
                        </div>
                        <input 
                          type="checkbox"
                          disabled={data.config.bracket?.type === 'last_standing'}
                          checked={data.config.bracket?.enableThirdPlace || false}
                          onChange={(e) => updateConfig({ bracket: { ...data.config.bracket, enableThirdPlace: e.target.checked } })}
                          className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-orange-600 focus:ring-orange-600/20 disabled:opacity-50"
                        />
                     </div>
                     {data.config.bracket?.type === 'last_standing' && (
                       <p className="text-xs text-orange-500/70 italic px-2">
                         * Third Place is not applicable in Last One Standing.
                       </p>
                     )}
                 </div>
               </div>

               {/* Right Column: Visualizer (Expanded) */}
               <div className="col-span-1 lg:col-span-2 space-y-4 flex flex-col h-full">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Monitor className="text-orange-500" size={20} />
                    Preview
                  </h3>
                  <div className="flex-1 min-h-[400px]">
                    <BracketVisualizer 
                      type={data.config.bracket?.type} 
                      hasThirdPlace={data.config.bracket?.enableThirdPlace} 
                    />
                  </div>
               </div>

            </div>
          </div>
        )}

        {/* BATTLE ENGINE */}
        {activeTab === 'engine' && (
          <div className="space-y-8 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Swords className="text-orange-500" size={20} />
                  Match Rules
                </h3>
                
                <div>
                  <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Match Format</label>
                  <select 
                    value={data.config.roundsToWin || 1}
                    onChange={(e) => updateConfig({ roundsToWin: parseInt(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                  >
                    <option value={1}>Single Match (Sudden Death)</option>
                    <option value={2}>Best of 3 (First to 2)</option>
                    <option value={3}>Best of 5 (First to 3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Time Limit</label>
                  <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-xl p-2">
                    <button
                      onClick={() => updateConfig({ timeLimit: (data.config.timeLimit || 0) > 0 ? 0 : 99 })}
                      className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                        (data.config.timeLimit || 0) > 0 ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {(data.config.timeLimit || 0) > 0 ? 'ON' : 'OFF'}
                    </button>
                    
                    {(data.config.timeLimit || 0) > 0 ? (
                      <input 
                        type="number" 
                        min="1"
                        value={data.config.timeLimit}
                        onChange={(e) => updateConfig({ timeLimit: parseInt(e.target.value) })}
                        className="flex-1 bg-transparent border-none text-white focus:ring-0 px-2 outline-none"
                        placeholder="Seconds..."
                      />
                    ) : (
                      <span className="text-zinc-500 text-sm italic px-2">No Time Limit (Infinite)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* END GAME */}
        {activeTab === 'endgame' && (
           <div className="space-y-8 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                      <Zap className="text-orange-500" size={20} />
                      Post-Tournament Experience
                    </h3>
                    
                    <div className="space-y-3">
                       {[
                         { key: 'showBracketPath', label: 'Bracket Animation', desc: 'Animate the path to victory on the bracket view.' },
                         { key: 'showChampionReveal', label: 'Champion Reveal', desc: 'Show full-screen celebration for the winner.' },
                         { key: 'showLeaderboard', label: 'Show Leaderboard', desc: 'Display final standings and stats table.' },
                       ].map(item => (
                          <div key={item.key} className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                            <div>
                              <h4 className="font-bold text-white text-sm">{item.label}</h4>
                              <p className="text-xs text-zinc-500">{item.desc}</p>
                            </div>
                            <input 
                              type="checkbox"
                              checked={(data.config.endGame as any)?.[item.key] || false}
                              onChange={(e) => updateConfig({ endGame: { ...data.config.endGame, [item.key]: e.target.checked } })}
                              className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-orange-600 focus:ring-orange-600/20"
                            />
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        )}



        {/* UI & EXPERIENCE */}
        {activeTab === 'ui' && (
          <div className="space-y-8 max-w-4xl">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'showTimer', label: 'Show Timer', desc: 'Display countdown timer during battle' },
                  { key: 'showStats', label: 'Show Stats Panel', desc: 'Allow players to view character stats' },
                  { key: 'showTrumpButton', label: 'Trump/Stat Button', desc: 'For Stats Battle mode mechanics' },
                  { key: 'showExitButton', label: 'Allow Exit', desc: 'Show button to leave match' },
                ].map((item) => (
                  <div key={item.key} className="flex items-start gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                    <div className="pt-1">
                      <input 
                        type="checkbox"
                        checked={(data.config.ui as any)?.[item.key] || false}
                        onChange={(e) => updateUiConfig({ [item.key]: e.target.checked })}
                        className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-orange-600 focus:ring-orange-600/20"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{item.label}</h4>
                      <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* LAYOUT EDITOR */}
        {activeTab === 'layout' && (
          <div>
            <div className="mb-6 p-4 bg-orange-900/20 border border-orange-900/50 rounded-xl text-orange-200 text-sm flex items-center gap-3">
              <Layout size={18} />
              <span>
                <strong>Layout Editor:</strong> Define where characters stand. 
                Use "Player" type for Team 1 (Left) and "Opponent" for Team 2 (Right/CPU).
              </span>
            </div>
            
            <BattleLayoutEditor 
              mode={data.mode}
              config={data.config}
              onChange={(newLayout) => updateConfig({ layout: newLayout })}
            />
          </div>
        )}

        {/* MODE SPECIFICS */}
        {activeTab === 'specifics' && (
          <div className="space-y-8 max-w-4xl">
            {data.mode === 'boss_raid' && (
              <div>
                <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Boss Stat Multiplier</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="1"
                  value={data.config.bossMultiplier || 1.5}
                  onChange={(e) => updateConfig({ bossMultiplier: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                />
                <p className="text-xs text-zinc-600 mt-1">Multiplier applied to the Boss character's stats.</p>
              </div>
            )}

            {data.mode === 'squad_4v4' && (
              <div>
                 <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Team Size</label>
                <input 
                  type="number" 
                  min="1"
                  max="10"
                  value={data.config.teamSize || 4}
                  onChange={(e) => updateConfig({ teamSize: parseInt(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                />
              </div>
            )}
            
            {data.mode === 'stats_battle' && (
              <div>
                 <label className="block text-xs uppercase font-bold text-zinc-500 mb-2">Deck Size</label>
                <input 
                  type="number" 
                  min="1"
                  value={data.config.deckSize || 10}
                  onChange={(e) => updateConfig({ deckSize: parseInt(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                />
              </div>
            )}

            {['1v1', '2v2'].includes(data.mode) && (
              <div className="p-8 text-center text-zinc-500 border border-zinc-800 border-dashed rounded-xl">
                No specific settings for {data.label} yet. Most configuration is done in General Rules and Layout.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
