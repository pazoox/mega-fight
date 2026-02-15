import React from 'react';
import { Challenge } from '@/types';
import { Swords, Users, Skull, BookOpen, Shield, Crown, Zap } from 'lucide-react';

interface ChallengeFallbackCardProps {
  challenge: Challenge;
}

export const ChallengeFallbackCard: React.FC<ChallengeFallbackCardProps> = ({ challenge }) => {
  const { mode, config } = challenge;
  const teamA = config?.teamA?.count || 1;
  const teamB = config?.teamB?.count || 1;

  let type: 'boss' | 'trios' | 'squads' | 'hero' = 'hero';
  
  // Logic to determine type
  if (config?.tournamentType === 'boss_fight' || mode === 'boss_raid' || (teamA !== teamB && (teamA === 1 || teamB === 1) && (teamA > 1 || teamB > 1))) {
    type = 'boss';
  } else if (teamA === 4 && teamB === 4) {
    type = 'squads';
  } else if (mode === 'squad_4v4') {
    type = 'squads';
  } else if (teamA === 3 && teamB === 3) {
    type = 'trios';
  } else if (config?.tournamentType === 'hero_tale') {
    type = 'hero';
  } else {
    type = 'hero';
  }

  // Config for each type
  const styles = {
    boss: {
      gradient: 'from-red-900 via-red-950 to-black',
      accent: 'text-red-500',
      border: 'border-red-900/50',
      icon: Skull,
      label: 'BOSS FIGHT',
      sublabel: 'Asymmetric Warfare',
      image: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2070&auto=format&fit=crop'
    },
    trios: {
      gradient: 'from-violet-900 via-zinc-950 to-black',
      accent: 'text-violet-500',
      border: 'border-violet-900/50',
      icon: Users,
      label: 'TRIOS',
      sublabel: '3v3 Team Battle',
      image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=2000&auto=format&fit=crop'
    },
    squads: {
      gradient: 'from-orange-900 via-zinc-950 to-black',
      accent: 'text-orange-500',
      border: 'border-orange-900/50',
      icon: Shield,
      label: 'SQUADS',
      sublabel: '4v4 Tactical Combat',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2000&auto=format&fit=crop'
    },
    hero: {
      gradient: 'from-yellow-900 via-zinc-950 to-black',
      accent: 'text-yellow-500',
      border: 'border-yellow-900/50',
      icon: Crown,
      label: 'HERO TALE',
      sublabel: 'Legendary Duel',
      image: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?q=80&w=2000&auto=format&fit=crop'
    }
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center text-center p-6 overflow-hidden`}>
        {/* Background Image with Grand Tournament Style */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-all duration-700 grayscale mix-blend-overlay"
          style={{ backgroundImage: `url('${style.image}')` }}
        ></div>
        
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none"></div>
        <div className={`absolute inset-0 border-4 border-double ${style.border} opacity-50 m-2 rounded-xl pointer-events-none`}></div>
        
        {/* Content */}
        <div className="relative z-10 transform transition-transform group-hover:scale-105 duration-500">
            <div className={`w-16 h-16 rounded-2xl bg-black/50 backdrop-blur-sm border ${style.border} flex items-center justify-center mb-4 mx-auto shadow-xl`}>
                <Icon size={32} className={style.accent} />
            </div>
            
            <h3 className={`text-2xl font-black italic tracking-tighter uppercase text-white mb-1 drop-shadow-lg`}>
                {style.label}
            </h3>
            
            <div className={`inline-block px-3 py-1 rounded-full bg-black/40 border ${style.border} backdrop-blur-md`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${style.accent}`}>
                    {style.sublabel}
                </span>
            </div>
        </div>

        {/* Dynamic VS Badge if it's a versus match */}
        <div className="absolute bottom-4 right-4 opacity-20">
             <Swords size={64} className="text-white" />
        </div>
    </div>
  );
};
