import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Activity, Brain, Shield, Wind, Flame, Droplets, Mountain, CloudLightning, Sword, Gauge, Timer, Heart, Swords, ArrowUp, ArrowDown } from 'lucide-react'
import { CharacterStats } from '@/types'
import { ArenaModifiers } from '@/utils/fightUtils'

interface BattleSimulationProps {
  p1Name: string;
  p2Name: string;
  p1Stats: CharacterStats;
  p2Stats: CharacterStats;
  p1Modifiers?: ArenaModifiers;
  p2Modifiers?: ArenaModifiers;
  compact?: boolean;
  maxStatValue?: number;
}

export function BattleSimulation({ p1Name, p2Name, p1Stats, p2Stats, p1Modifiers, p2Modifiers, compact = false, maxStatValue = 1200 }: BattleSimulationProps) {
  
  // Normalize stats for display (0-1000 scale usually)
  const getPct = (val: number) => Math.min(100, Math.max(0, val / 10));

  // Calculate Total Power (Sum of 8 Stats)
  const getPower = (s: CharacterStats) => (
    (s.hp || 0) + (s.str || 0) + (s.def || 0) + (s.sta || 0) + 
    (s.sp_atk || 0) + (s.int || 0) + (s.spd || 0) + (s.atk_spd || 0)
  );
  
  const p1Power = getPower(p1Stats);
  const p2Power = getPower(p2Stats);
  const totalCombinedPower = (p1Power + p2Power) || 1;
  const p1PowerPct = (p1Power / totalCombinedPower) * 100;
  const p2PowerPct = (p2Power / totalCombinedPower) * 100;

  // Initiative Calculation
  const totalSpeed = (p1Stats.atk_spd || 0) + (p2Stats.atk_spd || 0);
  const p1InitPct = totalSpeed > 0 ? ((p1Stats.atk_spd || 0) / totalSpeed) * 100 : 50;
  
  return (
    <div className={`w-full flex flex-col gap-6 ${compact ? 'max-w-md' : 'w-full'} mx-auto bg-black/40 backdrop-blur-md rounded-xl p-6 border border-white/10`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center text-xs font-mono text-zinc-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-4">
        <div className="flex flex-col">
          <span className="text-white font-bold text-sm">Combat Simulation</span>
          <span className="text-[10px] text-zinc-500">Comparative Analysis</span>
        </div>
        <span className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>
          <span className="text-green-400 font-bold">Live</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: RADAR CHART */}
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/30 rounded-xl border border-white/5 h-full">
           <RadarChart p1Stats={p1Stats} p2Stats={p2Stats} maxStatValue={maxStatValue} />
           
           {/* Legend */}
           <div className="flex gap-6 mt-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500/50 border border-blue-500 rounded-sm"></div>
                <span className="text-zinc-300">{p1Name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500/50 border border-red-500 rounded-sm"></div>
                <span className="text-zinc-300">{p2Name}</span>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: DETAILED STATS (8 STATS) */}
        <div className="flex flex-col gap-6 w-full">

          {/* TOTAL POWER COMPARISON */}
          <div className="flex flex-col gap-2 p-4 bg-zinc-900/50 rounded-xl border border-white/10 shadow-inner">
            <div className="flex justify-between text-xs font-bold text-zinc-300">
               <span className="flex items-center gap-1 text-blue-400"><Swords size={16} /> {p1Name} (PWR)</span>
               <span className="flex items-center gap-1 text-red-400">{p2Name} (PWR) <Swords size={16} /></span>
            </div>
            <div className="flex flex-col gap-1">
                {/* Single Bar Container */}
                <div className="flex w-full h-6 bg-zinc-900 rounded-full overflow-hidden relative border border-white/10">
                    {/* P1 Share (Blue) */}
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${p1PowerPct}%` }}
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 relative group"
                    >
                        {/* Hover/Tooltip could go here, but simple label is better */}
                    </motion.div>

                    {/* Separator / VS Line (Visual) */}
                    <div className="w-0.5 h-full bg-white/20 z-10" />

                    {/* P2 Share (Red) */}
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${p2PowerPct}%` }}
                        className="h-full bg-gradient-to-l from-red-600 to-red-400 relative group"
                    >
                    </motion.div>

                    {/* Text Overlays (Absolute to ensure visibility) */}
                    <div className="absolute inset-0 flex justify-between items-center px-3 pointer-events-none">
                        <span className="text-xs font-bold text-white drop-shadow-md">
                            {p1Power.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-white drop-shadow-md">
                            {p2Power.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
          </div>
          
          {/* STAT COMPARISON ROWS */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
             {/* HP */}
             <StatComparison label="HP" p1Val={p1Stats.hp} p2Val={p2Stats.hp} icon={<Heart size={12} />} color="text-green-400" />
             {/* STA */}
             <StatComparison label="STA" p1Val={p1Stats.sta || 0} p2Val={p2Stats.sta || 0} icon={<Activity size={12} />} color="text-orange-400" />
             
             {/* STR */}
             <StatComparison label="STR" p1Val={p1Stats.str} p2Val={p2Stats.str} icon={<Sword size={12} />} color="text-red-400" />
             {/* SP.ATK */}
             <StatComparison label="SP.ATK" p1Val={p1Stats.sp_atk || 0} p2Val={p2Stats.sp_atk || 0} icon={<Zap size={12} />} color="text-purple-400" />
             
             {/* DEF */}
             <StatComparison label="DEF" p1Val={p1Stats.def} p2Val={p2Stats.def} icon={<Shield size={12} />} color="text-yellow-400" />
             {/* INT */}
             <StatComparison label="INT" p1Val={p1Stats.int} p2Val={p2Stats.int} icon={<Brain size={12} />} color="text-cyan-400" />

             {/* SPD (Travel) */}
             <StatComparison label="SPD" p1Val={p1Stats.spd || 0} p2Val={p2Stats.spd || 0} icon={<Wind size={12} />} color="text-teal-400" />
             {/* ATK.SPD (Reflex) */}
             <StatComparison label="ATK.SPD" p1Val={p1Stats.atk_spd || 0} p2Val={p2Stats.atk_spd || 0} icon={<Gauge size={12} />} color="text-indigo-400" />
          </div>

        </div>

      </div>

      {/* MODIFIERS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
        <ModifiersPanel name={p1Name} modifiers={p1Modifiers} color="blue" />
        <ModifiersPanel name={p2Name} modifiers={p2Modifiers} color="red" />
      </div>

    </div>
  )
}

// --- SUBCOMPONENTS ---

function ModifiersPanel({ name, modifiers, color }: { name: string, modifiers?: ArenaModifiers, color: 'blue' | 'red' }) {
    if (!modifiers) return null;
    
    const hasBuffs = modifiers.buffs.length > 0;
    const hasNerfs = modifiers.nerfs.length > 0;

    if (!hasBuffs && !hasNerfs) {
        return (
            <div className="flex flex-col gap-2 opacity-50">
                <h3 className={`text-xs font-bold uppercase tracking-wider text-${color}-400`}>{name} Modifiers</h3>
                <div className="text-[10px] text-zinc-500 italic">No active modifiers</div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
             <h3 className={`text-xs font-bold uppercase tracking-wider text-${color}-400 flex items-center gap-2`}>
                {name} Modifiers
                <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 rounded-full border border-zinc-800">
                    {modifiers.buffs.length + modifiers.nerfs.length}
                </span>
             </h3>
             
             <div className="flex flex-col gap-2">
                {modifiers.buffs.map((buff, i) => (
                    <div key={i} className="flex items-center justify-between bg-green-900/10 border border-green-500/20 px-3 py-1.5 rounded-md">
                        <div className="flex items-center gap-2">
                            <ArrowUp size={12} className="text-green-400" />
                            <span className="text-[10px] text-green-300 font-bold uppercase">{buff.label}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{buff.category}</span>
                    </div>
                ))}
                {modifiers.nerfs.map((nerf, i) => (
                    <div key={i} className="flex items-center justify-between bg-red-900/10 border border-red-500/20 px-3 py-1.5 rounded-md">
                         <div className="flex items-center gap-2">
                            <ArrowDown size={12} className="text-red-400" />
                            <span className="text-[10px] text-red-300 font-bold uppercase">{nerf.label}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{nerf.category}</span>
                    </div>
                ))}
             </div>
        </div>
    )
}

function RadarChart({ p1Stats, p2Stats, maxStatValue }: { p1Stats: CharacterStats, p2Stats: CharacterStats, maxStatValue: number }) {
  const size = 300;
  const center = size / 2;
  const radius = 100; // max radius
  
  // Axes Configuration (8 Axes)
  const axes = [
    { key: 'hp', label: 'HP' },
    { key: 'str', label: 'STR' },
    { key: 'def', label: 'DEF' },
    { key: 'sta', label: 'STA' },
    { key: 'spd', label: 'SPD' },
    { key: 'atk_spd', label: 'ASP' },
    { key: 'int', label: 'INT' },
    { key: 'sp_atk', label: 'SPA' },
  ];

  const angleStep = (Math.PI * 2) / axes.length;

  // Helper to calculate coordinates
  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2; // -90deg to start at top
    // Normalize value based on maxStatValue
    const normalized = Math.min(value, maxStatValue) / maxStatValue; 
    const r = normalized * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Generate Path Points
  const getPath = (stats: CharacterStats) => {
    return axes.map((axis, i) => {
      const raw = stats[axis.key as keyof CharacterStats] as unknown;
      const val = typeof raw === 'number' ? raw : Number(raw) || 0;
      const coords = getCoordinates(val, i);
      return `${coords.x},${coords.y}`;
    }).join(' ');
  };

  const p1Path = getPath(p1Stats);
  const p2Path = getPath(p2Stats);

  // Background Webs
  const webs = [0.2, 0.4, 0.6, 0.8, 1.0].map(scale => {
    return axes.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = radius * scale;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  });

  return (
    <div className="relative w-[300px] h-[300px]">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Circles/Polygons */}
        {webs.map((points, i) => (
          <polygon 
            key={i} 
            points={points} 
            fill="none" 
            stroke="rgba(255,255,255,0.1)" 
            strokeWidth="1" 
          />
        ))}

        {/* Axis Lines */}
        {axes.map((axis, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          
          // Label Position (slightly outside)
          const lx = center + (radius + 20) * Math.cos(angle);
          const ly = center + (radius + 20) * Math.sin(angle);

          return (
            <g key={i}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <text 
                x={lx} 
                y={ly} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fill="#71717a" 
                fontSize="10" 
                fontWeight="bold"
                className="font-mono"
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        {/* P1 Data (Blue) */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          points={p1Path}
          fill="rgba(59, 130, 246, 0.3)"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* P2 Data (Red) */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          points={p2Path}
          fill="rgba(239, 68, 68, 0.3)"
          stroke="#ef4444"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

function StatComparison({ label, p1Val, p2Val, icon, color }: { label: string, p1Val: number, p2Val: number, icon: React.ReactNode, color: string }) {
  const max = Math.max(p1Val, p2Val, 100); // prevent div by zero, baseline
  const p1Pct = (p1Val / max) * 100;
  const p2Pct = (p2Val / max) * 100;

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
         <span className={p1Val >= p2Val ? color : 'text-zinc-600'}>{p1Val}</span>
         <span className={`flex items-center gap-1 ${color}`}>{icon} {label}</span>
         <span className={p2Val >= p1Val ? color : 'text-zinc-600'}>{p2Val}</span>
      </div>
      
      <div className="flex items-center gap-1 h-1.5 w-full">
        {/* P1 Bar (Right Aligned) */}
        <div className="flex-1 flex justify-end bg-zinc-800 rounded-l-full overflow-hidden h-full">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${p1Pct}%` }}
             className={`h-full ${p1Val >= p2Val ? 'bg-blue-500' : 'bg-blue-900/50'}`}
           />
        </div>
        
        {/* Divider */}
        <div className="w-px h-full bg-white/10" />

        {/* P2 Bar (Left Aligned) */}
        <div className="flex-1 flex justify-start bg-zinc-800 rounded-r-full overflow-hidden h-full">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${p2Pct}%` }}
             className={`h-full ${p2Val >= p1Val ? 'bg-red-500' : 'bg-red-900/50'}`}
           />
        </div>
      </div>
    </div>
  )
}
