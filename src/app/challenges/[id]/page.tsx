'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Challenge, ChallengeMode } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ChallengeFallbackCard } from '@/components/ChallengeFallbackCard';
import { 
  Trophy, 
  Users, 
  Shield, 
  Brain, 
  Play, 
  Globe, 
  ArrowLeft, 
  Clock, 
  Zap, 
  Music, 
  AlertTriangle,
  Swords,
  Layers
} from 'lucide-react';

const getModeIcon = (mode: ChallengeMode) => {
  switch (mode) {
    case 'boss_raid': return Shield;
    case 'squad_4v4': return Users;
    case 'stats_battle': return Brain;
    default: return Trophy;
  }
};

export default function ChallengeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/challenges?id=${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Challenge not found');
        return res.json();
      })
      .then(data => {
        setChallenge(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center">
        <h1 className="text-4xl font-black italic text-zinc-800 mb-4">CHALLENGE NOT FOUND</h1>
        <button onClick={() => router.back()} className="text-orange-500 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const ModeIcon = getModeIcon(challenge.mode);

  const handlePlaySolo = () => {
    // Logic to start solo game with this challenge config
    // For now, redirect to fight page with query param
    router.push(`/fight/solo?challengeId=${challenge.id}`);
  };

  

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <Navbar active="explore" />

      {/* Hero Section */}
      <div className="relative h-[50vh] w-full overflow-hidden">
        {challenge.imageUrl ? (
          <img src={challenge.imageUrl} alt={challenge.title} className="w-full h-full object-cover" />
        ) : (
          <ChallengeFallbackCard challenge={challenge} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        
        <div className="absolute top-24 left-6 md:left-12">
           <button 
             onClick={() => router.back()}
             className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur border border-white/10 rounded-full hover:bg-white/10 transition-colors"
           >
             <ArrowLeft size={16} />
             <span className="text-sm font-bold uppercase">Back to Explore</span>
           </button>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-500 text-black px-3 py-1 rounded font-black uppercase text-xs tracking-widest flex items-center gap-2">
               <ModeIcon size={14} />
               {(challenge.config.teamA?.count && challenge.config.teamB?.count) 
                  ? `${challenge.config.teamA.count}v${challenge.config.teamB.count}`
                  : challenge.mode.replace('_', ' ')
               }
            </div>
            {challenge.config.modifiersEnabled && (
               <div className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded font-bold uppercase text-xs tracking-widest flex items-center gap-2 backdrop-blur">
                 <Zap size={14} /> Modifiers On
               </div>
            )}
          </div>
          
          <h1 className="text-4xl md:text-7xl font-black italic uppercase text-white mb-4 leading-none">
            {challenge.title}
          </h1>
          <p className="text-zinc-300 text-lg md:text-xl max-w-3xl line-clamp-3">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-6 py-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-12">
         
         {/* Left: Rules & Details */}
         <div className="lg:col-span-2 space-y-12">
            
            {/* Rules Section */}
            <section>
              <h2 className="text-2xl font-black italic text-white mb-6 flex items-center gap-2">
                 <Swords className="text-orange-500" /> CHALLENGE RULES
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase mb-4">Victory Conditions</h3>
                    <ul className="space-y-3 text-zinc-300">
                       <li className="flex items-start gap-3">
                          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                          <span>
                             {challenge.mode === 'squad_4v4' && 'Defeat the opposing team of 4 fighters.'}
                             {challenge.mode === 'boss_raid' && `Defeat the Boss (x${challenge.config.bossMultiplier} Stats) before your team is wiped out.`}
                             {challenge.mode === 'stats_battle' && `Win ${challenge.config.roundsToWin} rounds by selecting superior stats.`}
                          </span>
                       </li>
                       {challenge.config.roundsToWin && (
                          <li className="flex items-start gap-3">
                             <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                             <span>First to {challenge.config.roundsToWin} wins.</span>
                          </li>
                       )}
                    </ul>
                 </div>

                 <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase mb-4">Restrictions</h3>
                    <ul className="space-y-3 text-zinc-300">
                       <li className="flex items-center gap-3">
                          <Users size={16} className="text-zinc-500" />
                          <span>Team Size: <strong className="text-white">
                             {(challenge.config.teamA?.count && challenge.config.teamB?.count) 
                                ? (challenge.config.teamA.count === challenge.config.teamB.count 
                                     ? challenge.config.teamA.count 
                                     : `${challenge.config.teamA.count} vs ${challenge.config.teamB.count}`)
                                : (challenge.config.teamSize || 1)}
                          </strong></span>
                       </li>
                       {(challenge.config.minPowerScale || challenge.config.maxPowerScale) && (
                          <li className="flex items-center gap-3">
                             <AlertTriangle size={16} className="text-zinc-500" />
                             <span>
                                Power Scale: 
                                <strong className="text-white ml-1">
                                   {challenge.config.minPowerScale || 0} - {challenge.config.maxPowerScale || 'Any'}
                                </strong>
                             </span>
                          </li>
                       )}
                       {challenge.config.deckSize && (
                          <li className="flex items-center gap-3">
                             <Layers size={16} className="text-zinc-500" />
                             <span>Deck Size: <strong className="text-white">{challenge.config.deckSize} Cards</strong></span>
                          </li>
                       )}
                    </ul>
                 </div>
              </div>
            </section>

            {/* Config Details */}
            <section>
               <h2 className="text-2xl font-black italic text-white mb-6 flex items-center gap-2">
                  <Zap className="text-orange-500" /> CONFIGURATION
               </h2>
               <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                     <div className="p-6">
                        <span className="block text-xs font-bold text-zinc-500 uppercase mb-1">Environment</span>
                        <div className="flex items-center gap-2 text-lg font-bold">
                           {challenge.config.modifiersEnabled ? (
                              <span className="text-purple-400">Dynamic Physics</span>
                           ) : (
                              <span className="text-zinc-400">Standard</span>
                           )}
                        </div>
                     </div>
                     <div className="p-6">
                        <span className="block text-xs font-bold text-zinc-500 uppercase mb-1">Arena</span>
                        <div className="flex items-center gap-2 text-lg font-bold">
                           {challenge.config.fixedArenaId ? (
                              <span className="text-white">Fixed Map</span>
                           ) : (
                              <span className="text-zinc-400">Randomized</span>
                           )}
                        </div>
                     </div>
                     <div className="p-6">
                        <span className="block text-xs font-bold text-zinc-500 uppercase mb-1">Soundtrack</span>
                        <div className="flex items-center gap-2 text-lg font-bold">
                           {challenge.config.musicUrl ? (
                              <a href={challenge.config.musicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-orange-500 hover:underline">
                                 <Music size={16} /> Listen
                              </a>
                           ) : (
                              <span className="text-zinc-600">Default</span>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </section>
         </div>

         {/* Right: Actions */}
         <div className="lg:col-span-1">
            <div className="sticky top-24 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl shadow-orange-900/10">
               <h3 className="text-xl font-black italic text-white mb-6 text-center">READY TO FIGHT?</h3>
               
               <div className="space-y-4">
                  <button 
                    onClick={handlePlaySolo}
                    className="w-full group relative overflow-hidden bg-white text-black font-black italic uppercase text-xl py-4 rounded-xl hover:scale-105 transition-transform duration-300"
                  >
                     <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                     <span className="relative z-10 flex items-center justify-center gap-2">
                        <Play fill="currentColor" /> Play Solo
                     </span>
                  </button>

                  
               </div>

               <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Challenge ID</p>
                  <code className="bg-black px-3 py-1 rounded text-zinc-400 font-mono text-xs select-all">
                     {challenge.id}
                  </code>
               </div>
            </div>
         </div>

      </main>
    </div>
  );
}
