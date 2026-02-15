'use client';

import Link from 'next/link';
import { Settings2, Swords, Trophy, ArrowRight } from 'lucide-react';

export default function BattleSystemsPage() {
  return (
    <div className="p-8 min-h-screen bg-black text-white">
      <header className="mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">
          Battle <span className="text-orange-500">Systems</span>
        </h1>
        <p className="text-zinc-500 text-sm">
          Manage Game Modes and Scenarios from a unified command center.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenarios (Challenges) */}
        <Link 
          href="/admin/battle-systems/scenarios"
          className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-red-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-red-900/20"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Swords size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
              <Swords size={24} />
            </div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-red-400 transition-colors">Scenarios</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Create and manage specific playable challenges, boss raids, and story battles.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-300 group-hover:text-white">
              Manage Scenarios <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        
      </div>
    </div>
  );
}
