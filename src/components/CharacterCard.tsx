"use client";

import { Character, CharacterStage } from "@/types";
import { ArenaModifiers, getFirstTag } from "@/utils/fightUtils";
import { calculateRank, TIER_RANGES, getStatTier, TierInfo, RANK_ORDER } from "@/utils/statTiers";
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";
import { Shield, Zap, Heart, Sword, Brain, Wind, Activity, RefreshCw, Gauge, CircleDot, ArrowUp, ArrowDown, Swords, Target } from "lucide-react";
import React, { useRef } from "react";
import { getVariableIcon, getRelationIcon } from "@/utils/iconUtils";
import { 
  ELEMENT_DATA, SOURCE_DATA, SKILL_TAGS_DATA, COMBAT_CLASSES_DATA, COMPOSITION_DATA
} from "@/constants";

// Helper to find icon for a trigger
// Removed getTriggerIcon as it is no longer used in the simplified tooltip design

interface CharacterCardProps {
  character: Character;
  stageIndex?: number;
  isWinner?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  modifiers?: ArenaModifiers;
  maxStatValue?: number; // New prop for scaling
  powerScale?: boolean;
  compact?: boolean; // New prop for compact layout (2v2)
  scale?: number; // New prop for custom scaling
  sharedX?: MotionValue<number>; // Optional shared motion value for team sync
  sharedY?: MotionValue<number>; // Optional shared motion value for team sync
  forceFlip?: boolean; // New prop for external flip control
  hideFlipButton?: boolean; // New prop to hide individual flip button
  hoverEffect?: boolean; // New prop for hover pop-out effect
}

const STAT_CONFIG = [
  { key: 'hp', label: 'HP', icon: Heart },
  { key: 'str', label: 'STR', icon: Sword },
  { key: 'def', label: 'DEF', icon: Shield },
  { key: 'sta', label: 'STA', icon: Activity },
  { key: 'sp_atk', label: 'SP. ATK', icon: Zap },
  { key: 'int', label: 'INT', icon: Brain },
  { key: 'spd', label: 'SPD', icon: Wind },
  { key: 'atk_spd', label: 'ATK. SPD', icon: Gauge },
];

const STAT_COLORS: Record<string, string> = {
  'HP': 'text-green-500',
  'STR': 'text-red-500',
  'DEF': 'text-blue-500',
  'STA': 'text-yellow-500',
  'SP. ATK': 'text-purple-500',
  'INT': 'text-cyan-500',
  'SPD': 'text-orange-500',
  'ATK. SPD': 'text-pink-500',
};

export function CharacterCard({ character, stageIndex = 0, isWinner, onClick, disabled, modifiers, maxStatValue = 2000, powerScale = false, compact = false, scale: customScale, sharedX, sharedY, forceFlip, hideFlipButton = false, hoverEffect = false }: CharacterCardProps) {
  const [internalFlipped, setInternalFlipped] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Use forceFlip if provided, otherwise fallback to internal state
  const isFlipped = forceFlip !== undefined ? forceFlip : internalFlipped;
  
  // Handler to safely update flipped state
  const setIsFlipped = (value: boolean) => {
    if (forceFlip === undefined) {
      setInternalFlipped(value);
    }
  };
  
  // Safety check placeholder data if character is invalid
  // We can't return early here because it breaks React Hooks rules (hooks must be called in same order)
  const isInvalid = !character || !character.stages || character.stages.length === 0;
  
  const stage: CharacterStage = isInvalid 
    ? { 
        stage: 'Invalid', 
        image: '', 
        tags: { combatClass: [], movement: [], source: [], element: [], composition: 'Organic', size: 'Medium' }, 
        combat: { mainSkill: { name: '', description: '', tags: [] } },
        stats: { hp: 0, str: 0, def: 0, sta: 0, sp_atk: 0, int: 0, spd: 0, atk_spd: 0 } 
      }
    : (character.stages[stageIndex] || character.stages[0]);
  
  // Calculate Rank based on strongest stage
  const { rank, totalStats } = React.useMemo(() => {
    if (isInvalid) return { rank: 'D', totalStats: 0 };
    
    // Find strongest stage (simplistic max total stats)
    const strongestStage = character.stages.reduce((prev, current) => {
        const prevTotal = Object.values(prev.stats).reduce((a, b) => typeof a === 'number' ? (a as number) + (b as number) : a as number, 0) as number
        const currTotal = Object.values(current.stats).reduce((a, b) => typeof a === 'number' ? (a as number) + (b as number) : a as number, 0) as number
        return currTotal > prevTotal ? current : prev
    }, character.stages[0]);

    // Calculate total stats
    const total = Object.values(strongestStage.stats).reduce((sum, val) => 
        typeof val === 'number' ? (sum as number) + (val as number) : sum as number, 0) as number;
    
    return { rank: calculateRank(total), totalStats: total };
  }, [character?.stages, isInvalid]); // Added dependencies

  // Calculate effective base stats (considering power scale) for correct comparison
  const effectiveBaseStats = React.useMemo(() => {
    if (!powerScale || isInvalid) return stage.stats;
    const rawScale = character.canonScale || 100;
    const scaleFactor = rawScale / 100;
    const flags = (character as any).scaledStats || { hp: true, str: true, def: true, sta: true, sp_atk: true, int: true, spd: true, atk_spd: true };
    
    return {
      hp: flags.hp ? Math.round(stage.stats.hp * scaleFactor) : stage.stats.hp,
      str: flags.str ? Math.round(stage.stats.str * scaleFactor) : stage.stats.str,
      def: flags.def ? Math.round(stage.stats.def * scaleFactor) : stage.stats.def,
      sta: flags.sta ? Math.round((stage.stats.sta || 0) * scaleFactor) : (stage.stats.sta || 0),
      sp_atk: flags.sp_atk ? Math.round((stage.stats.sp_atk || 0) * scaleFactor) : (stage.stats.sp_atk || 0),
      int: flags.int ? Math.round(stage.stats.int * scaleFactor) : stage.stats.int,
      spd: flags.spd ? Math.round(stage.stats.spd * scaleFactor) : stage.stats.spd,
      atk_spd: flags.atk_spd ? Math.round((stage.stats.atk_spd || 0) * scaleFactor) : (stage.stats.atk_spd || 0),
    };
  }, [stage.stats, powerScale, character?.canonScale, (character as any)?.scaledStats, isInvalid]);

  // Use modified stats if available, otherwise effective base stats
  const currentStats = modifiers ? modifiers.stats : effectiveBaseStats;
  const baseStats = effectiveBaseStats;

  const specs = character?.specs || { height: 0, weight: 0 }; // Fallback

  // Stage Overrides
  const stageName = stage.name || character?.name;
  const stageAlias = stage.alias || character?.alias;
  const stageRace = stage.race || character?.specs?.race || 'Unknown Race';
  const stageDescription = stage.description || character?.description;
  
  // Default scaled stats if not defined
  const scaledStatsFlags = (character as any)?.scaledStats || { hp: true, str: true, def: true, sta: true, sp_atk: true, int: true, spd: true, atk_spd: true };

  // Image validation
  const imageUrl = (stage.image && stage.image.trim() !== "") ? stage.image : null;

  // 3D Tilt Logic
  const ref = useRef<HTMLDivElement>(null);
  
  const internalX = useMotionValue(0);
  const internalY = useMotionValue(0);

  const x = sharedX || internalX;
  const y = sharedY || internalY;

  const mouseX = useSpring(x, { stiffness: 600, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 600, damping: 30 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["12deg", "-12deg"]); // Reduced angle for subtlety
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-12deg", "12deg"]); // Reduced angle for subtlety

  // Motion Parallax for content (opposite direction to card rotation for "pop out" feel)
  const contentX = useTransform(mouseX, [-0.5, 0.5], ["-15px", "15px"]); // Reduced from 25px
  const contentY = useTransform(mouseY, [-0.5, 0.5], ["-15px", "15px"]); // Reduced from 25px

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || sharedX || isFlipped || isInvalid) return; // Disable internal handling if shared motion provided or flipped
    
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const width = rect.width;
      const height = rect.height;
      
      const mouseXVal = e.clientX - rect.left;
      const mouseYVal = e.clientY - rect.top;
      
      const xPct = mouseXVal / width - 0.5;
      const yPct = mouseYVal / height - 0.5;
      
      x.set(xPct);
      y.set(yPct);
    }
  };

  const handleMouseLeave = () => {
    if (sharedX) return; // Disable internal handling if shared motion provided
    x.set(0);
    y.set(0);
  };

  // Reset tilt when flipped
  React.useEffect(() => {
    if (isFlipped) {
      x.set(0);
      y.set(0);
    }
  }, [isFlipped, x, y]);

  // Scroll Lock Logic to prevent body scroll when hovering card
  React.useEffect(() => {
    return () => {
      // Ensure scroll is restored when component unmounts
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  const handleMouseEnterContainer = () => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
  };

  const handleMouseLeaveContainer = () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  };

  // Early return for invalid character AFTER all hooks have been called
  if (isInvalid) {
    return (
      <div 
        className="flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-3xl text-zinc-500"
        style={{ width: compact ? 500 * 0.85 : 500, height: compact ? 800 * 0.85 : 800 }}
      >
        Invalid Character Data
      </div>
    );
  }

  // Scaling Factor for Compact Mode
  const scale = customScale ?? (compact ? 0.92 : 1);
  const width = 500 * scale;
  const height = 800 * scale;

  // Extract primary tags for display
  const primaryClass = getFirstTag(stage.tags.combatClass);
  const primaryElement = getFirstTag(stage.tags.element);
  const primarySource = getFirstTag(stage.tags.source);

  // Get Icons/Data for Element and Source
  const elementData = ELEMENT_DATA.find(e => e.value === primaryElement);
  const ElementIcon = elementData?.icon || CircleDot;
  
  const sourceData = SOURCE_DATA.find(s => s.value === primarySource);
  const SourceIcon = sourceData?.icon || CircleDot;

  // Calculate Total Power change based on stats
  const totalBaseStats = Object.values(baseStats).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  const totalCurrentStats = Object.values(currentStats).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  
  const effectivePower = totalCurrentStats;
  const powerDiff = totalCurrentStats - totalBaseStats;

  // Calculate dynamic rank based on current stats
  const currentRank = calculateRank(totalCurrentStats);
  const baseRank = calculateRank(totalBaseStats);
  
  const currentRankIndex = RANK_ORDER.indexOf(currentRank);
  const baseRankIndex = RANK_ORDER.indexOf(baseRank);
  
  const rankTrend = currentRankIndex > baseRankIndex ? 'up' : currentRankIndex < baseRankIndex ? 'down' : undefined;
  
  // Determine skill color based on scaling stat
  const mainSkill = stage.combat.mainSkill;
  const scalingStat = (typeof mainSkill !== 'string' && mainSkill.scalingStat) ? mainSkill.scalingStat : 'str';
  const skillStatValue = (currentStats as any)[scalingStat] || 0;
  const baseSkillStatValue = (baseStats as any)[scalingStat] || 0;
  
  const skillTierInfo = getStatTier(scalingStat, skillStatValue);
  const baseSkillTierInfo = getStatTier(scalingStat, baseSkillStatValue);
  
  const currentSkillTierIndex = TIER_RANGES.findIndex(r => r.label === skillTierInfo.label);
  const baseSkillTierIndex = TIER_RANGES.findIndex(r => r.label === baseSkillTierInfo.label);
  
  const skillTrend = currentSkillTierIndex > baseSkillTierIndex ? 'up' : currentSkillTierIndex < baseSkillTierIndex ? 'down' : undefined;
  
  const skillColor = skillTierInfo.color;
  const skillBorder = skillTierInfo.border;

  // Determine secondary skill color based on scaling stat
  const secondarySkill = stage.combat.secondarySkill;
  const secScalingStat = (secondarySkill && typeof secondarySkill !== 'string' && secondarySkill.scalingStat) ? secondarySkill.scalingStat : 'str';
  const secSkillStatValue = (currentStats as any)[secScalingStat] || 0;
  const baseSecSkillStatValue = (baseStats as any)[secScalingStat] || 0;
  
  const secSkillTierInfo = getStatTier(secScalingStat, secSkillStatValue);
  const baseSecSkillTierInfo = getStatTier(secScalingStat, baseSecSkillStatValue);
  
  const currentSecSkillTierIndex = TIER_RANGES.findIndex(r => r.label === secSkillTierInfo.label);
  const baseSecSkillTierIndex = TIER_RANGES.findIndex(r => r.label === baseSecSkillTierInfo.label);
  
  const secSkillTrend = currentSecSkillTierIndex > baseSecSkillTierIndex ? 'up' : currentSecSkillTierIndex < baseSecSkillTierIndex ? 'down' : undefined;
  
  const secSkillColor = secSkillTierInfo.color;
  const secSkillBorder = secSkillTierInfo.border;

  return (
    <div 
      onMouseEnter={() => {
        handleMouseEnterContainer();
        if (hoverEffect) setIsHovered(true);
      }}
      onMouseLeave={() => {
        handleMouseLeaveContainer();
        if (hoverEffect) setIsHovered(false);
      }}
      className={`transition-all duration-300 ${hoverEffect ? 'hover:z-50' : ''}`}
      style={{ 
      perspective: "1200px", 
      width: `${width}px`, 
      height: `${height}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      position: "relative", // Added relative for absolute positioning of dots
      transform: hoverEffect && isHovered ? `translateY(-40px) scale(1.1)` : 'none',
      zIndex: hoverEffect && isHovered ? 50 : undefined
    }}>
      {/* Scaled Wrapper for Content Consistency */}
      <div style={{
        width: "500px",
        height: "800px",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        position: "relative"
      }}>
        {/* Active Modifiers (Dots) & Actions - Positioned Outside/Above Hover Effect */}
        <div className="absolute top-0 left-0 w-full -translate-y-full pb-1 flex justify-between items-center px-2 z-[100] pointer-events-auto">
          
          {/* Left: Modifiers */}
          <div className="flex gap-2 items-center h-8">
            {modifiers?.buffs.map((buff, i) => {
               const TriggerIcon = getVariableIcon(buff.triggerType || buff.category, buff.trigger);
               const RelationIcon = getRelationIcon(buff.relationType);
               const TargetIcon = getVariableIcon(buff.targetType || 'Combat Class', buff.targetValue || '');
               const value = buff.value;
               const isFlat = buff.type === 'flat';
               
               const firstStatKey = buff.stats && buff.stats.length > 0 ? buff.stats[0].toLowerCase() : 'overall';
               const statConfig = STAT_CONFIG.find(s => s.key === firstStatKey) || { label: 'OVERALL', icon: Activity };
               const statLabel = statConfig.label;
               const StatIcon = statConfig.icon;
               const statColor = STAT_COLORS[statLabel] || 'text-white';

               return (
              <div key={`buff-${i}`} className="relative group/tooltip">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] cursor-help hover:scale-150 transition-transform border border-white/20" />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max min-w-[160px] bg-zinc-950/95 border border-green-500/30 rounded-2xl p-3 text-[10px] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl backdrop-blur-md flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 pb-2 border-b border-white/10 text-zinc-300">
                     <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2 py-0.5 rounded-full border border-white/5">
                        <TriggerIcon size={12} className="text-zinc-400" />
                        <span className="font-medium">{buff.trigger}</span>
                     </div>
                     <RelationIcon size={12} className="text-zinc-500 shrink-0" />
                     <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2 py-0.5 rounded-full border border-white/5">
                        <TargetIcon size={12} className="text-zinc-400" />
                        <span className="font-medium">{buff.targetValue}</span>
                     </div>
                  </div>
                  <div className="text-white text-center font-medium leading-tight px-1">
                    {buff.label}
                  </div>
                  <div className={`font-mono font-bold flex items-center justify-center gap-2 text-green-400`}>
                    <span className="text-lg tracking-tighter">
                      {isFlat ? (value > 0 ? `+${value}` : value) : `+${Math.round((value - 1) * 100)}%`}
                    </span>
                    <div className={`flex items-center gap-1.5 ${statColor}`}>
                       <StatIcon size={12} />
                       <span className="uppercase text-[10px] tracking-wide">{statLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            )})}
            {modifiers?.nerfs.map((nerf, i) => {
               const TriggerIcon = getVariableIcon(nerf.triggerType || nerf.category, nerf.trigger);
               const RelationIcon = getRelationIcon(nerf.relationType);
               const TargetIcon = getVariableIcon(nerf.targetType || 'Combat Class', nerf.targetValue || '');
               const value = nerf.value;
               const isFlat = nerf.type === 'flat';
               
               const firstStatKey = nerf.stats && nerf.stats.length > 0 ? nerf.stats[0].toLowerCase() : 'overall';
               const statConfig = STAT_CONFIG.find(s => s.key === firstStatKey) || { label: 'OVERALL', icon: Activity };
               const statLabel = statConfig.label;
               const StatIcon = statConfig.icon;
               const statColor = STAT_COLORS[statLabel] || 'text-white';

               return (
              <div key={`nerf-${i}`} className="relative group/tooltip">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] cursor-help hover:scale-150 transition-transform border border-white/20" />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max min-w-[160px] bg-zinc-950/95 border border-red-500/30 rounded-2xl p-3 text-[10px] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl backdrop-blur-md flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 pb-2 border-b border-white/10 text-zinc-300">
                     <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2 py-0.5 rounded-full border border-white/5">
                        <TriggerIcon size={12} className="text-zinc-400" />
                        <span className="font-medium">{nerf.trigger}</span>
                     </div>
                     <RelationIcon size={12} className="text-zinc-500 shrink-0" />
                     <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2 py-0.5 rounded-full border border-white/5">
                        <TargetIcon size={12} className="text-zinc-400" />
                        <span className="font-medium">{nerf.targetValue}</span>
                     </div>
                  </div>
                  <div className="text-white text-center font-medium leading-tight px-1">
                    {nerf.label}
                  </div>
                  <div className={`font-mono font-bold flex items-center justify-center gap-2 text-red-400`}>
                    <span className="text-lg tracking-tighter">
                      {isFlat ? `${value}` : `${Math.round((value - 1) * 100)}%`}
                    </span>
                    <div className={`flex items-center gap-1.5 ${statColor}`}>
                       <StatIcon size={12} />
                       <span className="uppercase text-[10px] tracking-wide">{statLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>

          {/* Right: Actions (Flip Button) */}
          {!hideFlipButton && (
            <div className="group relative">
              <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(!isFlipped);
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-lg backdrop-blur-sm
                    ${isFlipped 
                      ? 'bg-orange-500 text-white border-orange-400 hover:bg-orange-600' 
                      : 'bg-zinc-900/80 text-zinc-500 border-white/10 hover:bg-zinc-800 hover:text-white hover:border-white/30'}
                  `}
              >
                  <RefreshCw size={20} className={`transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>
        <motion.div
          ref={ref}
          style={{
            rotateX: (disabled || isFlipped) ? 0 : rotateX,
            rotateY: (disabled || isFlipped) ? 0 : rotateY,
            scale: isWinner ? 1.05 : 1,
            transformStyle: "preserve-3d",
            width: "100%", 
            height: "100%",
            position: "relative",
            transformOrigin: "center center",
            cursor: disabled ? "default" : "pointer"
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={onClick}
          className="group"
        >
        <motion.div
          style={{ 
            width: "100%", 
            height: "100%", 
            transformStyle: "preserve-3d",
            position: "relative" 
          }}
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* Front Face */}
          <div 
            style={{ 
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              zIndex: 2,
              position: "absolute",
              inset: 0,
              pointerEvents: isFlipped ? 'none' : 'auto' // Disable events when flipped to prevent blocking back face
            }}
            className={`
            rounded-3xl border-2 bg-zinc-900 shadow-2xl
            ${isWinner 
              ? "border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.6)]" 
              : "border-zinc-800 hover:border-zinc-500 shadow-black"}
            transition-colors duration-300
          `}>
          
          {/* Background Image */}
          <div className="absolute inset-0 z-0 bg-zinc-900 rounded-3xl overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
            {imageUrl ? (
              <img 
                src={imageUrl} 
                crossOrigin="anonymous"
                alt={stageName}
                className="w-full h-full object-cover transition-transform duration-700 ease-out"
                style={{ backfaceVisibility: "hidden" }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold text-4xl">
                NO IMAGE
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/95 pointer-events-none" />
          </div>

          {/* Content Layer */}
          <motion.div 
            className={`absolute inset-0 z-10 flex flex-col justify-between px-6 pb-4 pt-6`}
            style={{ 
              z: 40,
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              x: contentX,
              y: contentY,
            }}
          >
            
            {/* Header Info - Conditional Rendering */}
            {(!character.cardLayout || character.cardLayout === 'classic') && (
                <div style={{ transform: "translateZ(60px)" }}> 
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg leading-none mb-1" style={{ textShadow: "0 10px 30px rgba(0,0,0,0.8)" }}>
                    {stageName}
                  </h2>
                  
                  {/* Alias */}
                  {stageAlias && (
                    <div className="text-sm text-zinc-300 font-medium tracking-wide mb-3 drop-shadow-md">
                      {stageAlias}
                    </div>
                  )}

                  {/* Details Line: [Race] [Main Combat Class] [Mode/Form] */}
                  <div className="flex items-center gap-2 text-xs font-bold text-white/90 uppercase tracking-wider drop-shadow-md flex-wrap">
                    <span className="text-zinc-200">{stageRace}</span>
                    
                    {primaryClass && (
                      <>
                        <span className="text-zinc-500">|</span>
                        <span className="text-blue-300 drop-shadow-md">{primaryClass}</span>
                      </>
                    )}

                    {stage.stage && (
                      <>
                        <span className="text-zinc-500">|</span>
                        <span className="text-orange-300 drop-shadow-md">{stage.stage}</span>
                      </>
                    )}
                  </div>
                </div>
            )}
            
            {/* Spacer for Bottom Focused Layout */}
            {character.cardLayout === 'bottom_focused' && <div className="flex-1" />}

            <div className="flex flex-col justify-end relative" style={{ transformStyle: "preserve-3d" }}>
            
            {/* Header Info - Bottom Focused Version */}
            {character.cardLayout === 'bottom_focused' && (
                <div className="mb-4 relative z-20" style={{ transform: "translateZ(60px)" }}> 
                   {/* Gradient Shadow for Readability */}
                   <div className="absolute -inset-4 bg-gradient-to-t from-black via-black/80 to-transparent -z-10 blur-xl opacity-90" />

                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg leading-none mb-1" style={{ textShadow: "0 10px 30px rgba(0,0,0,0.8)" }}>
                    {stageName}
                  </h2>
                  
                  {/* Alias */}
                  {stageAlias && (
                    <div className="text-sm text-zinc-300 font-medium tracking-wide mb-3 drop-shadow-md">
                      {stageAlias}
                    </div>
                  )}

                  {/* Details Line: [Race] [Main Combat Class] [Mode/Form] */}
                  <div className="flex items-center gap-2 text-xs font-bold text-white/90 uppercase tracking-wider drop-shadow-md flex-wrap">
                    <span className="text-zinc-200">{stageRace}</span>
                    
                    {primaryClass && (
                      <>
                        <span className="text-zinc-500">|</span>
                        <span className="text-blue-300 drop-shadow-md">{primaryClass}</span>
                      </>
                    )}

                    {stage.stage && (
                      <>
                        <span className="text-zinc-500">|</span>
                        <span className="text-orange-300 drop-shadow-md">{stage.stage}</span>
                      </>
                    )}
                  </div>
                </div>
            )}

            {/* Element & Source Specs */}
            <div className="flex gap-4 mb-2 text-sm font-bold text-zinc-300 bg-black/80 p-3 rounded-lg border border-white/10 shadow-2xl" style={{ transform: "translateZ(50px)" }}> {/* Reduced from 80px */}
              {/* Source */}
              <div className="flex items-center gap-2 text-purple-400">
                <SourceIcon size={16} />
                <span>{primarySource || 'None'}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-4 bg-white/10" />

              {/* Element */}
              <div className="flex items-center gap-2 text-cyan-400">
                <ElementIcon size={16} />
                <span>{primaryElement || 'None'}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-4 bg-white/10" />

              {/* Power Only */}
               <div className="flex items-center gap-1 text-yellow-400 font-black ml-auto">
                <span>{effectivePower}</span>
                <span className="text-[10px]">PWR</span>
                {powerDiff > 0 && <ArrowUp size={14} className="text-green-500 animate-pulse ml-1" />}
                {powerDiff < 0 && <ArrowDown size={14} className="text-red-500 ml-1" />}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 bg-black/80 rounded-xl border border-white/10 shadow-2xl" style={{ transform: "translateZ(30px)" }}> {/* Reduced from 50px */}
              
              {/* HP */}
              <StatRow icon={<Heart size={14} />} color="text-green-400" bg="bg-green-500" baseValue={baseStats.hp} currentValue={currentStats.hp} originalValue={stage.stats.hp} label="HP" maxStatValue={maxStatValue} powerScale={powerScale} isScaled={scaledStatsFlags.hp} />
              
              {/* STR */}
              <StatRow icon={<Sword size={14} />} color="text-red-400" bg="bg-red-500" baseValue={baseStats.str} currentValue={currentStats.str} originalValue={stage.stats.str} label="STR" maxStatValue={maxStatValue} powerScale={powerScale} isScaled={scaledStatsFlags.str} />
              
              {/* DEF */}
              <StatRow icon={<Shield size={14} />} color="text-yellow-400" bg="bg-yellow-500" baseValue={baseStats.def} currentValue={currentStats.def} originalValue={stage.stats.def} label="DEF" maxStatValue={maxStatValue} powerScale={powerScale} isScaled={scaledStatsFlags.def} />
              
              {/* STA (Stamina) */}
              <StatRow icon={<Activity size={14} />} color="text-orange-400" bg="bg-orange-500" baseValue={baseStats.sta || 0} currentValue={currentStats.sta || 0} originalValue={stage.stats.sta || 0} label="STA" maxStatValue={maxStatValue} powerScale={powerScale} isScaled={scaledStatsFlags.sta || false} />
              
              {/* SP. ATK (Special Attack) */}
              <StatRow icon={<Zap size={14} />} color="text-purple-400" bg="bg-purple-500" baseValue={baseStats.sp_atk || 0} currentValue={currentStats.sp_atk || 0} originalValue={stage.stats.sp_atk || 0} label="SP. ATK" maxStatValue={maxStatValue} powerScale={powerScale} isScaled={scaledStatsFlags.sp_atk || false} />
              
              {/* INT */}
              <StatRow icon={<Brain size={14} />} color="text-blue-400" bg="bg-blue-500" baseValue={baseStats.int} currentValue={currentStats.int} originalValue={stage.stats.int} label="INT" maxStatValue={maxStatValue} powerScale={powerScale} isScaled={scaledStatsFlags.int} />
              
              {/* SPD */}
              <StatRow icon={<Wind size={14} />} color="text-cyan-400" bg="bg-cyan-500" baseValue={baseStats.spd} currentValue={currentStats.spd} originalValue={stage.stats.spd} label="SPD" maxStatValue={maxStatValue} powerScale={powerScale} isScaled={scaledStatsFlags.spd} />

              {/* ATK. SPD (Attack Speed) */}
              <StatRow icon={<Swords size={14} />} color="text-teal-400" bg="bg-teal-500" baseValue={baseStats.atk_spd || 0} currentValue={currentStats.atk_spd || 0} originalValue={stage.stats.atk_spd || 0} label="ATK. SPD" maxStatValue={maxStatValue} powerScale={powerScale} isScaled={scaledStatsFlags.atk_spd || false} />

            </div>

            {/* Main Skill */}
            <div className="mt-2 pt-2 border-t border-white/10" style={{ transform: "translateZ(20px)" }}> {/* Reduced from 30px */}
              <div className="flex items-center gap-2 text-orange-400 text-sm font-bold mb-1">
                <Target size={16} />
                <span>MAIN SKILL</span>
              </div>
              <p className="text-xs text-zinc-300 line-clamp-2">
                {typeof stage.combat.mainSkill === 'string' ? stage.combat.mainSkill : stage.combat.mainSkill?.name}
              </p>
            </div>
            </div>
            
          </motion.div>
          
          {/* Shine Effect */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay"
            style={{
              background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 55%, transparent 60%)",
              filter: "blur(5px)"
            }}
          />
        </div>

        {/* Back Face */}
        <div 
          style={{ 
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: isFlipped ? 'auto' : 'none' // Only enable events when flipped
          }}
          className="rounded-3xl border-2 border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden p-6 flex flex-col"
        >
          {/* Header - Fixed */}
            <div className="flex justify-between items-start border-b border-white/10 pb-2 mb-4 flex-shrink-0">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">{stageName}</h3>
                    <div className="flex gap-4 text-xs text-zinc-400 mt-2 font-mono uppercase">
                        <span>{specs.height || '?'} cm</span>
                        <span>{specs.weight ? formatWeight(specs.weight) : '?'}</span>
                        <span>{specs.gender || 'Unknown'}</span>
                    </div>

                </div>
                
                {/* Rank Badge */}
                <RankBadge rank={currentRank} trend={rankTrend} />
            </div>

            {/* Scrollable Content Wrapper */}
            <div className="relative flex-1 min-h-0 flex flex-col">
                {/* Top Fade */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-zinc-950 to-transparent z-10 pointer-events-none" />

            {/* Scrollable Content */}
            <div 
              className="flex flex-col flex-1 text-zinc-300 overlay-scrollbar overflow-x-hidden pr-2 custom-scrollbar overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
            >
                <div className="py-4">
                
                {/* Composition */}
                {stage.tags.composition && (
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Composition</h4>
                        <div className="flex flex-wrap gap-2">
                            {(() => {
                                const comp = stage.tags.composition;
                                const compData = COMPOSITION_DATA.find(c => c.value === comp);
                                const Icon = compData?.icon || CircleDot;
                                
                                return (
                                    <div className="flex items-center gap-1.5 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                                        <Icon size={12} className="text-indigo-400" />
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{comp}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Description */}
                {stageDescription && (
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Biography</h4>
                        <p className="text-sm leading-relaxed text-zinc-300">
                            {stageDescription}
                        </p>
                    </div>
                )}

                {/* Combat Style */}
                {Array.isArray(stage.tags.combatClass) && stage.tags.combatClass.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Combat Style</h4>
                        <div className="flex flex-wrap gap-2">
                            {stage.tags.combatClass.map(style => {
                                const styleData = COMBAT_CLASSES_DATA.find(c => c.value === style);
                                const Icon = styleData?.icon || Swords;
                                
                                return (
                                    <div key={style} className="flex items-center gap-1.5 bg-red-500/20 px-3 py-1 rounded-full border border-red-500/30">
                                        <Icon size={12} className="text-red-400" />
                                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">{style}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Full Skills */}
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Combat Skills</h4>
                    <div className="space-y-3">
                        {/* Main Skill */}
                         <div className={`bg-zinc-900/50 p-3 rounded-xl border ${skillBorder} relative`}>
                            <div className="flex items-center justify-between mb-1">
                                <div className={`flex items-center gap-2 ${skillColor} text-xs font-bold`}>
                                    <Target size={12} />
                                    <span>MAIN SKILL</span>
                                </div>
                                {/* Skill Power Scale Badge */}
                                <div className="flex items-center gap-1">
                                    {skillTrend === 'up' && <ArrowUp size={10} className="text-green-500 animate-pulse" />}
                                    {skillTrend === 'down' && <ArrowDown size={10} className="text-red-500" />}
                                    <SkillScaleBadge tierInfo={skillTierInfo} />
                                </div>
                            </div>
                            <div className="text-sm font-bold text-white mb-1">
                                {typeof stage.combat.mainSkill === 'string' ? stage.combat.mainSkill : stage.combat.mainSkill?.name}
                            </div>
                            {typeof stage.combat.mainSkill !== 'string' && stage.combat.mainSkill?.description && (
                <>
                    <p className="text-xs text-zinc-400 leading-snug mb-2">
                        {stage.combat.mainSkill.description}
                    </p>
                    
                    {/* Skill Tags */}
                    {Array.isArray(stage.combat.mainSkill.tags) && stage.combat.mainSkill.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {stage.combat.mainSkill.tags.map(tag => {
                                const tagData = SKILL_TAGS_DATA.find(t => t.value === tag);
                                const Icon = tagData?.icon || CircleDot;
                                
                                return (
                                    <div key={tag} className={`flex items-center gap-1.5 ${skillTierInfo.bg} bg-opacity-20 px-2.5 py-1 rounded-full transition-colors`}>
                                        <Icon size={12} className={skillTierInfo.color} />
                                        <span className={`text-[10px] font-bold ${skillTierInfo.color}`}>{tag}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
                        </div>

                        {/* Secondary Skill */}
                        {stage.combat.secondarySkill && (
                            <div className={`bg-zinc-900/50 p-3 rounded-xl border ${secSkillBorder} relative mt-2`}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className={`flex items-center gap-2 ${secSkillColor} text-xs font-bold`}>
                                        <Target size={12} />
                                        <span>SECONDARY SKILL</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {secSkillTrend === 'up' && <ArrowUp size={10} className="text-green-500 animate-pulse" />}
                                        {secSkillTrend === 'down' && <ArrowDown size={10} className="text-red-500" />}
                                        <SkillScaleBadge tierInfo={secSkillTierInfo} />
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-white mb-1">
                                    {typeof stage.combat.secondarySkill === 'string' ? stage.combat.secondarySkill : stage.combat.secondarySkill.name}
                                </div>
                                {typeof stage.combat.secondarySkill !== 'string' && stage.combat.secondarySkill.description && (
                                    <>
                                        <p className="text-xs text-zinc-400 leading-snug mb-2">
                                            {stage.combat.secondarySkill.description}
                                        </p>
                                        
                                        {/* Skill Tags */}
                                        {Array.isArray(stage.combat.secondarySkill.tags) && stage.combat.secondarySkill.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {stage.combat.secondarySkill.tags.map(tag => {
                                                    const tagData = SKILL_TAGS_DATA.find(t => t.value === tag);
                                                    const Icon = tagData?.icon || CircleDot;
                                                    
                                                    return (
                                                        <div key={tag} className={`flex items-center gap-1.5 ${secSkillTierInfo.bg} bg-opacity-20 px-2.5 py-1 rounded-full transition-colors`}>
                                                            <Icon size={12} className={secSkillTierInfo.color} />
                                                            <span className={`text-[10px] font-bold ${secSkillTierInfo.color}`}>{tag}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Analysis */}
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Stats Analysis</h4>
                    <div className="space-y-3">
                        {STAT_CONFIG.map(({ key, label, icon: Icon }) => {
                            const value = (stage.stats as any)[key] || 0;
                            const tierInfo = getStatTier(key, value);
                            const justification = (stage.stats as any).justifications?.[key];

                            return (
                                <div key={key} className={`bg-zinc-900/50 p-3 rounded-xl border ${tierInfo.border} relative`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className={`flex items-center gap-2 ${tierInfo.color} text-xs font-bold`}>
                                            <Icon size={12} />
                                            <span>{label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-black ${tierInfo.color}`}>{value}</span>
                                            <SkillScaleBadge tierInfo={tierInfo} />
                                        </div>
                                    </div>
                                    
                                    <div className="text-xs text-zinc-400 leading-snug">
                                        {justification && (
                                            <p className="mb-1 text-zinc-300 italic">"{justification}"</p>
                                        )}
                                        <p className="opacity-70">{tierInfo.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                </div>
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-zinc-950 to-transparent z-10 pointer-events-none" />
            </div>
        </div>
        </motion.div>
      </motion.div>
      </div>
    </div>
  );
}

function SkillScaleBadge({ tierInfo }: { tierInfo: TierInfo }) {
  return (
      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${tierInfo.color} ${tierInfo.border} bg-opacity-10 ${tierInfo.bg}`}>
          {tierInfo.label}
      </span>
  );
}

function formatWeight(weight: number) {
  if (weight >= 1000) {
    return `${parseFloat((weight / 1000).toFixed(2))}t`;
  }
  return `${weight}kg`;
}

// Helper for stats
function StatRow({ icon, color, bg, baseValue, currentValue, originalValue, label, maxStatValue, powerScale, isScaled = true }: { icon: React.ReactNode, color: string, bg: string, baseValue: number, currentValue: number, originalValue: number, label: string, maxStatValue: number, powerScale?: boolean, isScaled?: boolean }) {
  const isBuff = currentValue > baseValue;
  const isNerf = currentValue < baseValue;
  
  // Calculate width as percentage (using maxStatValue)
  const basePct = Math.min((baseValue / maxStatValue) * 100, 100);
  const currentPct = Math.min((currentValue / maxStatValue) * 100, 100);
  
  // Determine value color class based on Buff/Nerf status
  const valueClass = isBuff 
    ? "text-zinc-100 font-normal drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
    : isNerf
    ? "text-red-400 font-normal"
    : "text-zinc-200 font-normal";

  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes buff-pulse {
          0%, 100% { opacity: 1; filter: brightness(1); }
          50% { opacity: 0.6; filter: brightness(0.6); }
        }
        .buff-anim {
          animation: buff-pulse 1.5s ease-in-out infinite;
        }
      `}} />
      {icon}
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-bold text-zinc-400 leading-none tracking-wider">{label}</span>
          <span className={`text-sm leading-none ${valueClass}`}>
            {currentValue}
          </span>
        </div>
        
        {/* Progress Bar Background */}
        <div className="h-1 w-full bg-zinc-700/50 rounded-full overflow-hidden relative">
           
           {/* Case 1: Buff (Breathing Stat Color) */}
           {isBuff && (
             <>
               {/* Base Part (Stat Color) */}
               <div className={`absolute top-0 left-0 h-full ${bg}`} style={{ width: `${basePct}%` }} />
               {/* Buff Part (Stat Color + Breathing) */}
               <div 
                 className={`absolute top-0 h-full ${bg} buff-anim`} 
                 style={{ left: `${basePct}%`, width: `${currentPct - basePct}%` }} 
               />
             </>
           )}

           {/* Case 2: Nerf (Red Segment) */}
           {isNerf && (
             <>
               {/* Current Part (Stat Color) */}
               <div className={`absolute top-0 left-0 h-full ${bg}`} style={{ width: `${currentPct}%` }} />
               {/* Nerf Part (Red) - showing lost potential */}
               <div 
                 className="absolute top-0 h-full bg-red-500/50" 
                 style={{ left: `${currentPct}%`, width: `${basePct - currentPct}%` }} 
               />
             </>
           )}

           {/* Case 3: No Change */}
           {!isBuff && !isNerf && (
              <div className={`absolute top-0 left-0 h-full ${bg}`} style={{ width: `${currentPct}%` }} />
           )}
        </div>
      </div>
      
      {/* Trend Arrow */}
      <div className="w-3 flex justify-center">
        {isBuff && <ArrowUp size={10} className="text-green-500 animate-pulse" />}
        {isNerf && <ArrowDown size={10} className="text-red-500" />}
      </div>
    </div>
  );
}

function RankBadge({ rank, trend }: { rank: string, trend?: 'up' | 'down' }) {
  let color = 'from-zinc-400 to-zinc-600';
  let glow = 'shadow-zinc-500/50';
  
  if (rank.startsWith('S')) { color = 'from-yellow-300 via-amber-400 to-yellow-500'; glow = 'shadow-yellow-500/80'; }
  else if (rank.startsWith('A')) { color = 'from-red-500 via-rose-500 to-red-600'; glow = 'shadow-red-500/80'; }
  else if (rank.startsWith('B')) { color = 'from-blue-400 via-cyan-400 to-blue-500'; glow = 'shadow-blue-500/60'; }
  else if (rank.startsWith('C')) { color = 'from-emerald-400 via-green-400 to-emerald-500'; glow = 'shadow-emerald-400/60'; }
  else { color = 'from-zinc-400 via-zinc-300 to-zinc-500'; glow = 'shadow-zinc-400/60'; }

  return (
    <div 
      className="flex flex-col items-center justify-center min-w-[5rem] h-full relative overflow-hidden"
      style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}
    >
        {/* Holographic/Glitch Styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes glitch-anim {
            0% { transform: translate(0); text-shadow: 2px 2px 0px rgba(0,0,0,0.2); }
            20% { transform: translate(-2px, 2px); text-shadow: -2px -2px 0px rgba(255,0,0,0.3), 2px 2px 0px rgba(0,0,255,0.3); }
            40% { transform: translate(2px, -2px); text-shadow: 2px -2px 0px rgba(0,255,0,0.3), -2px 2px 0px rgba(255,0,255,0.3); }
            60% { transform: translate(0); text-shadow: 2px 2px 0px rgba(0,0,0,0.2); }
            80% { transform: translate(-1px, -1px); text-shadow: -1px 1px 0px rgba(255,255,0,0.3); }
            100% { transform: translate(0); text-shadow: 2px 2px 0px rgba(0,0,0,0.2); }
          }
          .glitch-text {
            animation: glitch-anim 2s infinite steps(2) alternate;
          }
        `}} />

        {/* Rank Letter */}
        <div className="relative z-10 flex items-center justify-center min-h-[60px] w-full">
            <h1 className={`text-6xl font-black italic bg-gradient-to-br ${color} bg-clip-text text-transparent glitch-text -mt-3`}
                style={{ 
                    filter: "drop-shadow(0 0 4px rgba(255,255,255,0.3))",
                    lineHeight: 1,
                    padding: '0.1em' // Prevent italic clipping
                }}
            >
                {rank}
            </h1>
        </div>
        
        {/* Trend Arrow */}
        {trend && (
            <div className="absolute top-0 left-0 flex items-center justify-center">
                {trend === 'up' && <ArrowUp size={16} className="text-green-500 animate-pulse drop-shadow-md" />}
                {trend === 'down' && <ArrowDown size={16} className="text-red-500 drop-shadow-md" />}
            </div>
        )}
    </div>
  );
}
