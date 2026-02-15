'use client';

import Link from 'next/link';
import { User, Users, Shield, Brain, Swords, Settings2, ArrowRight } from 'lucide-react';

const BATTLE_MODES = [
  {
    id: '1v1',
    name: '1v1 Duel',
    description: 'Classic one-on-one combat. The foundation of all battles.',
    icon: User,
    color: 'text-blue-500',
    borderColor: 'hover:border-blue-500/50',
    shadowColor: 'hover:shadow-blue-900/20',
    bgIcon: 'bg-blue-500/10'
  },
  {
    id: '2v2',
    name: '2v2 Tag Team',
    description: 'Two teams of two. Shared health or individual elimination.',
    icon: Users,
    color: 'text-green-500',
    borderColor: 'hover:border-green-500/50',
    shadowColor: 'hover:shadow-green-900/20',
    bgIcon: 'bg-green-500/10'
  },
  {
    id: 'squad_4v4',
    name: 'Squad Out (4v4)',
    description: 'Large scale team battles. 4v4 chaos with strategic positioning.',
    icon: Swords,
    color: 'text-orange-500',
    borderColor: 'hover:border-orange-500/50',
    shadowColor: 'hover:shadow-orange-900/20',
    bgIcon: 'bg-orange-500/10'
  },
  {
    id: 'boss_raid',
    name: 'Boss Raid',
    description: 'Cooperative mode vs a powerful Boss Entity.',
    icon: Shield,
    color: 'text-red-500',
    borderColor: 'hover:border-red-500/50',
    shadowColor: 'hover:shadow-red-900/20',
    bgIcon: 'bg-red-500/10'
  },
  {
    id: 'stats_battle',
    name: 'Stats Battle',
    description: 'Data-driven simulation based purely on attributes.',
    icon: Brain,
    color: 'text-purple-500',
    borderColor: 'hover:border-purple-500/50',
    shadowColor: 'hover:shadow-purple-900/20',
    bgIcon: 'bg-purple-500/10'
  }
];

export default function BattleModesPage() {
  return (
    <div className="p-8 min-h-screen bg-black text-white">
      <header className="mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2 flex items-center gap-2">
          Battle <span className="text-orange-500">Modes</span>
        </h1>
        <p className="text-zinc-500 text-sm">
          Configure global defaults, layouts, and rules for each core game mode.
          Changes here affect all new matches of that type.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BATTLE_MODES.map((mode) => (
          <Link 
            key={mode.id}
            href={`/admin/battle-systems/modes/${mode.id}`}
            className={`group relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl ${mode.borderColor} ${mode.shadowColor}`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <mode.icon size={100} />
            </div>
            
            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-lg ${mode.bgIcon} flex items-center justify-center ${mode.color} mb-4 group-hover:scale-110 transition-transform`}>
                <mode.icon size={24} />
              </div>
              
              <h2 className={`text-xl font-bold mb-2 group-hover:text-white transition-colors`}>{mode.name}</h2>
              <p className="text-sm text-zinc-500 mb-6 min-h-[40px]">
                {mode.description}
              </p>
              
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">
                <Settings2 size={16} />
                Configure Defaults <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
