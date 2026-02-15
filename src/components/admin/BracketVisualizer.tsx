
import React from 'react';
import { Trophy, Users, ArrowUp, Crown, Swords, Repeat } from 'lucide-react';

interface BracketVisualizerProps {
  type: 'classic' | 'last_standing' | 'round_robin' | undefined;
  hasThirdPlace?: boolean;
}

export default function BracketVisualizer({ type = 'classic', hasThirdPlace = false }: BracketVisualizerProps) {
  
  if (type === 'classic') {
    return (
      <div className="w-full h-full min-h-[350px] bg-zinc-950/50 rounded-xl border border-zinc-800 p-6 flex flex-col items-center justify-start pt-8 relative overflow-hidden">
        <div className="absolute top-2 right-2 text-zinc-700 text-[10px] uppercase font-bold tracking-wider">Visual Preview</div>
        
        {/* CHAMPION LEVEL */}
        <div className="flex flex-col items-center relative z-20">
            <div className="w-24 h-14 bg-orange-900/20 rounded-lg border border-orange-500/50 flex flex-col items-center justify-center relative shadow-[0_0_15px_rgba(249,115,22,0.1)] z-10">
               <Trophy size={18} className="text-orange-500 mb-1" />
               <span className="text-[9px] text-orange-200 font-bold uppercase tracking-wide">Champion</span>
            </div>
            {/* Line Down from Champ */}
            <div className="w-px h-6 bg-zinc-700"></div>
        </div>

        {/* CONNECTORS BLOCK (Robust Flex Layout) */}
        <div className="flex flex-col items-center z-10">
            {/* Horizontal Bar spanning the Semi Centers (11rem = 176px) */}
            <div className="w-[11rem] h-px bg-zinc-700"></div>
            
            {/* Vertical Drops to Semis */}
            <div className="flex justify-between w-[11rem]">
                <div className="w-px h-4 bg-zinc-700"></div>
                <div className="w-px h-4 bg-zinc-700"></div>
            </div>
        </div>

        {/* SEMI FINALS CONTAINER */}
        <div className="flex items-start gap-12 relative z-10">
            {/* LEFT BRANCH (SEMI 1) */}
            <div className="flex flex-col items-center w-32 relative">
                {/* Semi Card */}
                <div className="w-20 h-10 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center relative z-10 mb-4 group">
                   <Users size={14} className="text-zinc-500" />
                   {hasThirdPlace && (
                     <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-px border-t border-dashed border-amber-700/50 group-hover:border-amber-500 transition-colors"></div>
                   )}
                </div>

                {/* Connector Semi -> Quarters */}
                <div className="flex flex-col items-center w-full relative">
                   {/* Bridge to Quarters */}
                   <div className="w-20 h-3 border-t border-l border-r border-zinc-700 rounded-t-sm"></div>
                   
                   {/* Quarters */}
                   <div className="flex justify-between w-full px-1">
                      {[1, 2].map(i => (
                        <div key={i} className="w-10 h-6 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-center relative">
                           <div className="w-4 h-0.5 bg-zinc-700 rounded-full opacity-30" />
                        </div>
                      ))}
                   </div>
                </div>
            </div>

            {/* RIGHT BRANCH (SEMI 2) */}
            <div className="flex flex-col items-center w-32 relative">
                {/* Semi Card */}
                <div className="w-20 h-10 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center relative z-10 mb-4 group">
                   <Users size={14} className="text-zinc-500" />
                   {hasThirdPlace && (
                     <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-px border-t border-dashed border-amber-700/50 group-hover:border-amber-500 transition-colors"></div>
                   )}
                </div>

                {/* Connector Semi -> Quarters */}
                <div className="flex flex-col items-center w-full relative">
                   {/* Bridge to Quarters */}
                   <div className="w-20 h-3 border-t border-l border-r border-zinc-700 rounded-t-sm"></div>
                   
                   {/* Quarters */}
                   <div className="flex justify-between w-full px-1">
                      {[3, 4].map(i => (
                        <div key={i} className="w-10 h-6 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-center">
                           <div className="w-4 h-0.5 bg-zinc-700 rounded-full opacity-30" />
                        </div>
                      ))}
                   </div>
                </div>
            </div>

        </div>

        {/* 3RD PLACE VISUALIZATION */}
        {hasThirdPlace && (
          <div className="absolute top-[160px] left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
             {/* Dashed lines connecting Semis to 3rd Place */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-20 border-b border-l border-r border-dashed border-amber-900/30 rounded-b-xl"></div>
             
             {/* 3rd Place Box */}
             <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-px h-2 border-l border-dashed border-amber-900/30"></div>
                <div className="w-20 h-8 bg-zinc-900/90 border border-amber-700/40 rounded flex items-center justify-center shadow-lg backdrop-blur-sm">
                   <span className="text-[8px] text-amber-500 font-bold uppercase text-center leading-tight">3rd Place<br/>Match</span>
                </div>
             </div>
          </div>
        )}

      </div>
    );
  }

  if (type === 'last_standing') {
    return (
      <div className="w-full h-full min-h-[200px] bg-zinc-950/50 rounded-xl border border-zinc-800 p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-2 right-2 text-zinc-700 text-[10px] uppercase font-bold tracking-wider">Visual Preview</div>
        
        <div className="flex flex-col items-center gap-2 z-10">
           {/* King */}
           <div className="relative">
             <Crown size={24} className="text-yellow-500 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
             <div className="w-24 h-16 bg-yellow-900/20 rounded-xl border border-yellow-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                <span className="text-xs font-bold text-yellow-200">KING</span>
             </div>
           </div>

           {/* Arrow */}
           <ArrowUp size={20} className="text-zinc-600" />

           {/* Challenger */}
           <div className="w-20 h-12 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-center">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">Challenger</span>
           </div>

           {/* Queue */}
           <div className="flex items-center gap-1 mt-2 opacity-50">
              {[1, 2, 3].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
                    {i}
                 </div>
              ))}
              <span className="text-xs text-zinc-700 ml-1">...</span>
           </div>
        </div>

        {hasThirdPlace && (
           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-900/20 border border-red-900/50 text-red-400 text-[10px] px-2 py-1 rounded">
             Warning: 3rd Place not applicable
           </div>
        )}
      </div>
    );
  }

  if (type === 'round_robin') {
    return (
      <div className="w-full h-full min-h-[200px] bg-zinc-950/50 rounded-xl border border-zinc-800 p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-2 right-2 text-zinc-700 text-[10px] uppercase font-bold tracking-wider">Visual Preview</div>
        
        <div className="relative w-32 h-32 flex items-center justify-center">
           {/* Center */}
           <div className="absolute inset-0 m-auto w-16 h-16 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
              <Swords size={16} className="text-zinc-600" />
           </div>

          {/* Nodes */}
          {[0, 1, 2, 3, 4].map((i, _idx, arr) => {
              const angle = (i / arr.length) * 2 * Math.PI;
              const x = Math.cos(angle) * 50; // Radius 50
              const y = Math.sin(angle) * 50;
              return (
                 <div 
                   key={i}
                   className="absolute w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center z-10 shadow-lg"
                   style={{ transform: `translate(${x}px, ${y}px)` }}
                 >
                    <span className="text-[10px] font-bold text-zinc-400">{String.fromCharCode(65 + i)}</span>
                 </div>
              );
           })}

           {/* Connecting Lines (Decorative) */}
           <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <circle cx="50%" cy="50%" r="50" fill="none" stroke="currentColor" className="text-zinc-500" strokeWidth="1" />
           </svg>
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-zinc-500 text-xs">
           <Repeat size={12} />
           <span>All vs All</span>
        </div>

         {hasThirdPlace && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg opacity-80">
              <div className="w-2 h-2 rounded-full bg-amber-700" />
              <span className="text-[10px] text-zinc-400 font-bold uppercase">Rank Based 3rd</span>
            </div>
          )}
      </div>
    );
  }

  return null;
}
