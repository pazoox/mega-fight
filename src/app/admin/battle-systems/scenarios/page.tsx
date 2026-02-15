'use client';

import { useState, useEffect } from 'react';
import { Challenge } from '@/types';
import { ChallengeFallbackCard } from '@/components/ChallengeFallbackCard';
import { Plus, Trophy, Trash2, Search, Filter, Swords } from 'lucide-react';
import Link from 'next/link';

export default function ScenariosPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState('');

  useEffect(() => {
    fetch('/api/challenges')
      .then(res => res.json())
      .then(data => {
        setChallenges(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load scenarios', err);
        setLoading(false);
      });
  }, []);

  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(search.toLowerCase());
    const matchesMode = selectedMode ? challenge.mode === selectedMode : true;
    return matchesSearch && matchesMode;
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this scenario?')) return;

    try {
      const res = await fetch(`/api/challenges?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setChallenges(prev => prev.filter(c => c.id !== id));
      } else {
        alert('Failed to delete scenario');
      }
    } catch (error) {
      console.error('Failed to delete scenario', error);
      alert('Error deleting scenario');
    }
  };

  return (
    <div className="p-8 min-h-screen bg-black text-white pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 flex items-center gap-2">
            SCENARIO <span className="text-red-600">MANAGEMENT</span>
          </h1>
          <p className="text-zinc-500 text-sm">Manage playable scenarios and boss raids.</p>
        </div>
        <Link 
          href="/admin/battle-systems/scenarios/new"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
        >
          <Plus size={18} />
          <span>New Scenario</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Search scenarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-red-600 outline-none transition-colors placeholder-zinc-600"
          />
        </div>
        <div className="w-full md:w-64 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-red-600 outline-none transition-colors appearance-none"
          >
            <option value="">All Modes</option>
            <option value="squad_4v4">Squad Out (4v4)</option>
            <option value="boss_raid">Boss Raid</option>
            <option value="stats_battle">Stats Battle</option>
            <option value="1v1">1v1 Duel</option>
            <option value="2v2">2v2 Tag Team</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map(challenge => (
            <Link key={challenge.id} href={`/admin/battle-systems/scenarios/${challenge.id}`} className="block h-full">
              <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden group hover:border-red-600/50 transition-all hover:shadow-xl hover:shadow-red-900/10 flex flex-col h-full cursor-pointer relative">
                
                {/* Delete Button */}
                <button 
                  onClick={(e) => handleDelete(e, challenge.id)}
                  className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-red-600 p-2 rounded-lg backdrop-blur-sm border border-white/10 text-white transition-all opacity-0 group-hover:opacity-100 transform translate-y-[-10px] group-hover:translate-y-0"
                >
                  <Trash2 size={16} />
                </button>
                
                <div className="h-48 bg-zinc-950 relative overflow-hidden">
                  {challenge.imageUrl ? (
                    <img src={challenge.imageUrl} alt={challenge.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  ) : (
                    <div className="w-full h-full relative">
                        <ChallengeFallbackCard challenge={challenge} />
                    </div>
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                  <div className="absolute top-2 left-2">
                    <div className="bg-red-600/20 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold uppercase border border-red-600/30 text-red-400">
                      {(challenge.config?.teamA?.count && challenge.config?.teamB?.count) 
                         ? `${challenge.config.teamA.count}v${challenge.config.teamB.count}`
                         : challenge.mode.replace('_', ' ')
                      }
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-4">
                    <h3 className="text-lg font-bold text-white leading-tight group-hover:text-red-400 transition-colors truncate">{challenge.title}</h3>
                  </div>
                </div>
                
                <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex-1 flex flex-col">
                  <p className="text-zinc-400 text-xs line-clamp-3 mb-4 flex-1">{challenge.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                     <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50 text-center">
                        <span className="block mb-0.5">Config</span>
                        <span className="text-zinc-300">
                            {(challenge.config?.teamA?.count && challenge.config?.teamB?.count) 
                               ? (challenge.config.teamA.count === challenge.config.teamB.count 
                                    ? `Team Size: ${challenge.config.teamA.count}` 
                                    : `${challenge.config.teamA.count} vs ${challenge.config.teamB.count}`)
                               : (challenge.mode === 'squad_4v4' ? 'Team Size: 4' : 
                                  challenge.mode === 'boss_raid' ? 'Boss Mode' : 
                                  'Deck: 12')}
                        </span>
                     </div>
                     <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50 text-center">
                        <span className="block mb-0.5">Status</span>
                        <span className={challenge.isActive ? "text-green-400" : "text-red-400"}>
                            {challenge.isActive ? 'Active' : 'Draft'}
                        </span>
                     </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
