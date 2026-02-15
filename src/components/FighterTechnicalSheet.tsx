'use client'

import React, { useState, useEffect } from 'react'
import { Character, CharacterStats, Group, Skill, SizeType } from '@/types'
import * as LucideIcons from 'lucide-react'
import { Plus, Info, Zap, Wind, Swords, Shield, Activity, Brain, Flame, ArrowLeft, Users, Mars, Venus, Ban, Trophy, Crosshair, ChevronDown, ChevronUp, Heart, Dumbbell, Eye, Sparkles, Sun, CircleDot, Ruler, Weight, Maximize2 } from 'lucide-react'
import { COMBAT_CLASSES_DATA, MOVEMENT_DATA, COMPOSITION_DATA, SOURCE_DATA, ELEMENT_DATA, SKILL_TAGS_DATA } from '@/constants'
import { getStatTier, calculateRank, getRankColor, RankType } from '@/utils/statTiers'
import { useRouter } from 'next/navigation'

interface FighterTechnicalSheetProps {
  character: Character
  groups: Group[]
}

const FighterTechnicalSheet = ({ character, groups }: FighterTechnicalSheetProps) => {
  const router = useRouter()
  const [rankDistribution, setRankDistribution] = useState<Record<RankType, number>>({} as any)
  const [totalFighters, setTotalFighters] = useState(0)
  const [expandedStats, setExpandedStats] = useState<Record<string, boolean>>({
    hp: true, str: true, def: true, sta: true, 
    sp_atk: true, int: true, spd: true, atk_spd: true
  })
  const [expandedSkills, setExpandedSkills] = useState<{ main: boolean; secondary: boolean }>({ 
    main: true, secondary: false 
  })

  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [systemVars, setSystemVars] = useState<any>(null)

  const processIcon = (iconName: any) => {
    if (!iconName) return CircleDot
    if (typeof iconName !== 'string') return iconName
    return (LucideIcons as any)[iconName] || CircleDot
  }

  // Derived options (Dynamic or Static Fallback)
  const combatClasses = systemVars?.combatClasses || COMBAT_CLASSES_DATA
  const movements = systemVars?.movements || MOVEMENT_DATA
  const compositions = systemVars?.compositions || COMPOSITION_DATA
  const sources = systemVars?.sources || SOURCE_DATA
  const elements = systemVars?.elements || ELEMENT_DATA
  const skillTags = systemVars?.skillTags || SKILL_TAGS_DATA
  
  // Fetch System Vars & Rank Distribution
  useEffect(() => {
    fetch('/api/system-vars').then(res => res.json()).then(data => {
        if (!data) return
        // Hydrate icons
        const hydrated: any = {}
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                hydrated[key] = data[key].map((item: any) => ({
                    ...item,
                    icon: processIcon(item.icon)
                }))
            }
        })
        setSystemVars(hydrated)
    }).catch(console.error)

    // Fetch all characters for Rank Distribution
    fetch('/api/characters').then(res => res.json()).then((data: any[]) => {
       const dist: Record<string, number> = {}
       let count = 0
       data.forEach(char => {
          if (char.stages && char.stages[0]?.stats) {
             const stats = char.stages[0].stats
             const total = (stats.hp || 0) + (stats.str || 0) + (stats.def || 0) + (stats.sta || 0) + 
                           (stats.sp_atk || 0) + (stats.int || 0) + (stats.spd || 0) + (stats.atk_spd || 0)
             const rank = calculateRank(total)
             dist[rank] = (dist[rank] || 0) + 1
             count++
          }
       })
       setRankDistribution(dist as any)
       setTotalFighters(count)
    })
  }, [])

  const STAT_FIELDS = [
    { key: 'hp', label: 'HP (Health)', icon: Heart },
    { key: 'str', label: 'STR (Strength)', icon: Dumbbell },
    { key: 'def', label: 'DEF (Defense)', icon: Shield },
    { key: 'sta', label: 'STA (Stamina)', icon: Zap },
    { key: 'sp_atk', label: 'SP. ATK (Power)', icon: Flame },
    { key: 'int', label: 'INT (Strategy)', icon: Brain },
    { key: 'spd', label: 'SPD (Travel Speed)', icon: Wind },
    { key: 'atk_spd', label: 'ATK. SPD (Reflexes)', icon: Eye },
  ]

  const currentStage = character.stages?.[currentStageIndex] || character.stages?.[0]
  if (!currentStage) return <div>No stage data available</div>

  // Helper to get group name
  const groupName = groups.find(g => g.id === character.groupId)?.name || 'Unknown'

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-6">
        <div className="max-w-[95vw] mx-auto space-y-8 pb-32">
        
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
            <div className="flex items-center gap-6">
            <button
                type="button"
                onClick={() => router.back()}
                className="group p-3 -ml-3 rounded-full hover:bg-zinc-800 transition-colors"
            >
                <ArrowLeft size={32} className="text-zinc-500 group-hover:text-white transition-colors" />
            </button>
            <div>
                <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 uppercase">
                   <span className="text-orange-500">{character.name}</span>
                </h1>
                <p className="text-zinc-500 font-medium">Technical Specification Sheet</p>
            </div>
            </div>
        </div>

        {/* Stage Tabs Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-30 pointer-events-none">
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto py-4 no-scrollbar flex-1 w-full sm:w-auto pointer-events-auto">
                {character.stages?.map((stage, idx) => (
                    <div 
                        key={idx}
                        onClick={() => setCurrentStageIndex(idx)}
                        className={`
                        relative px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 flex-shrink-0
                        ${currentStageIndex === idx 
                            ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                            : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}
                        `}
                    >
                        {stage.stage}
                    </div>
                ))}
            </div>
        </div>

        {/* --- DASHBOARD GRID --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-1 w-full relative z-20">
            
            {/* === LEFT COLUMN: IDENTITY (Span 2) === */}
            <div className="xl:col-span-2 flex flex-col gap-6 relative z-20">
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-6 relative z-20">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Info className="text-blue-400" /> Identity
                </h2>
                
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Image & Physical Attributes */}
                    <div className="w-full md:w-1/3 flex flex-col gap-4 relative z-10 overflow-visible">
                        <div className="flex flex-col gap-2">
                            <label className="block text-xs font-bold text-zinc-500 uppercase">Character Image</label>
                            <div className="aspect-square w-full rounded-xl overflow-hidden border border-zinc-800 bg-black">
                                {currentStage.thumbnail ? (
                                    <img src={currentStage.thumbnail} alt={character.name} className="w-full h-full object-cover" />
                                ) : currentStage.image ? (
                                    <img src={currentStage.image} alt={character.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold">NO IMAGE</div>
                                )}
                            </div>
                        </div>

                        {/* Fields under Image */}
                        <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-zinc-800/50">
                            {/* Gender */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Users size={12}/> Gender</label>
                                <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl p-1 flex items-center justify-center gap-4 text-zinc-400">
                                    {character.specs?.gender === 'Male' && <><Mars className="text-blue-400" /> Male</>}
                                    {character.specs?.gender === 'Female' && <><Venus className="text-pink-400" /> Female</>}
                                    {character.specs?.gender === 'Both' && <><Users className="text-purple-400" /> Both</>}
                                    {character.specs?.gender === 'None' && <><Ban className="text-zinc-500" /> None</>}
                                    {!character.specs?.gender && <span>Unknown</span>}
                                </div>
                            </div>

                            {/* Composition */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Composition</label>
                                <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 flex items-center text-white">
                                    {currentStage.tags.composition || 'Organic'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Fields */}
                    <div className="w-full md:w-2/3 flex flex-col gap-4 relative z-10 overflow-visible">
                        {/* Basic Info */}
                        <div className="flex gap-4">
                            <div className="flex-[2]">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Name</label>
                                <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 flex items-center text-white font-bold text-lg">
                                    {currentStage.name || character.name}
                                </div>
                            </div>
                            <div className="flex-[1]">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Form Name</label>
                                <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 flex items-center text-zinc-300">
                                    {currentStage.stage}
                                </div>
                            </div>
                        </div>
                    
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Alias</label>
                            <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 flex items-center text-zinc-300 italic">
                                {currentStage.alias || character.alias || "No Alias"}
                            </div>
                        </div>
                    
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Group</label>
                                <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 flex items-center text-white">
                                    {groupName}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Race</label>
                                <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 flex items-center text-white">
                                    {currentStage.race || character.specs?.race || "Unknown"}
                                </div>
                            </div>
                        </div>

                        {/* Specs */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Ruler size={12}/> Height (cm)</label>
                                <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 flex items-center text-white">
                                    {character.specs?.height || '???'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Weight size={12}/> Weight (kg)</label>
                                <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 flex items-center text-white">
                                    {character.specs?.weight || '???'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Maximize2 size={12}/> Size</label>
                                <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 flex items-center justify-center text-zinc-400 font-mono text-xs">
                                    {currentStage.tags.size}
                                </div>
                            </div>
                        </div>

                        {/* Lore */}
                        <div className="flex-1 flex flex-col">
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Lore</label>
                            <div className="w-full flex-1 min-h-[100px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {currentStage.description || character.description || "No description available."}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>

            {/* === NEW AREA: 2 STACKED CONTAINERS (Span 1) === */}
            <div className="xl:col-span-1 flex flex-col gap-6">
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 flex-1 min-h-[200px] flex flex-col">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2 mb-4">
                    <Trophy className="text-yellow-400" /> Rank Analysis
                </h2>
                
                <div className="flex-1 flex flex-row items-center gap-6">
                    {/* Left Side: Rank Letter */}
                    {(() => {
                        if (!currentStage?.stats) return null
                        const totalStats = Object.entries(currentStage.stats)
                            .filter(([key]) => STAT_FIELDS.some(f => f.key === key))
                            .reduce((sum, [_, val]) => sum + (val as number), 0)
                        
                        const currentRank = calculateRank(totalStats)
                        const rankCount = rankDistribution[currentRank] || 0
                        const displayCount = rankCount
                        const percentage = totalFighters > 0 ? (displayCount / totalFighters) * 100 : 100
                        const dashArray = 2 * Math.PI * 45 // radius 45
                        const dashOffset = dashArray - (dashArray * percentage) / 100
                        const color = getRankColor(currentRank)

                        return (
                            <>
                                <div className="flex-1 flex flex-col items-center justify-center border-r border-zinc-800 pr-6">
                                    <span className="text-7xl font-black italic" style={{ color }}>{currentRank}</span>
                                    <span className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-2 mb-4">RANK</span>
                                    
                                    <div className="bg-black/30 rounded-lg px-3 py-1.5 border border-zinc-800 flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Power</span>
                                        <span className="text-xl font-mono font-bold text-white">{totalStats}</span>
                                    </div>
                                </div>

                                {/* Right Side: Graph & Text */}
                                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                    {/* Small Donut Chart */}
                                    <div className="relative w-24 h-24">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                            {/* Background Circle */}
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="10" />
                                            {/* Progress Circle */}
                                            <circle 
                                                cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="10" 
                                                strokeDasharray={dashArray}
                                                strokeDashoffset={dashOffset}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                    </div>
                                    
                                    {/* Message */}
                                    <div className="text-left w-full">
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            <span className="text-white font-bold">{character.name || 'Unknown'}</span> is in the top tier of the roster, matching <span className="text-white font-bold">{displayCount}</span> other fighters in this category.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )
                    })()}
                </div>
                </div>
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 flex-1 min-h-[200px] flex flex-col">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2 mb-4">
                    <Crosshair className="text-cyan-400" /> Radar
                    </h2>
                    
                    <div className="flex-1 flex items-center justify-center p-2">
                    {(() => {
                        if (!currentStage?.stats) return null
                        const size = 180
                        const center = size / 2
                        const radius = (size / 2) - 10
                        const totalStats = Object.entries(currentStage.stats)
                            .filter(([key]) => STAT_FIELDS.some(f => f.key === key))
                            .reduce((sum, [_, val]) => sum + (val as number), 0)
                        const currentRank = calculateRank(totalStats)
                        const color = getRankColor(currentRank)

                        // 8 axes for 8 stats
                        const angleStep = (Math.PI * 2) / 8
                        const statsOrder = ['hp', 'str', 'def', 'sta', 'spd', 'atk_spd', 'int', 'sp_atk']
                        const statsLabels = {
                            hp: 'HP', str: 'STR', def: 'DEF', sta: 'STA',
                            spd: 'SPD', atk_spd: 'ASP', int: 'INT', sp_atk: 'SPA'
                        }
                        
                        const getPoint = (value: number, index: number, max: number = 2000) => {
                            const angle = index * angleStep - Math.PI / 2 // Start from top
                            const r = (value / max) * radius
                            return {
                                x: center + Math.cos(angle) * r,
                                y: center + Math.sin(angle) * r,
                                angle // Return angle for label positioning
                            }
                        }

                        // Calculate points for the polygon
                        const points = statsOrder.map((statKey, i) => {
                            const val = currentStage.stats[statKey as keyof CharacterStats] as number
                            const { x, y } = getPoint(val, i)
                            return `${x},${y}`
                        }).join(' ')

                        // Generate grid lines (25%, 50%, 75%, 100%)
                        const gridLevels = [0.25, 0.5, 0.75, 1]

                        return (
                            <div className="relative" style={{ width: size, height: size }}>
                                <svg width={size} height={size} className="overflow-visible">
                                    {/* Grid Background */}
                                    {gridLevels.map((level, lvlIdx) => (
                                        <polygon
                                            key={lvlIdx}
                                            points={statsOrder.map((_, i) => {
                                                const { x, y } = getPoint(2000 * level, i)
                                                return `${x},${y}`
                                            }).join(' ')}
                                            fill="none"
                                            stroke="#333"
                                            strokeWidth="1"
                                            className="opacity-50"
                                        />
                                    ))}

                                    {/* Axes Lines */}
                                    {statsOrder.map((_, i) => {
                                        const { x, y } = getPoint(2000, i)
                                        return (
                                            <line
                                                key={i}
                                                x1={center} y1={center}
                                                x2={x} y2={y}
                                                stroke="#333"
                                                strokeWidth="1"
                                                className="opacity-50"
                                            />
                                        )
                                    })}

                                    {/* Labels */}
                                    {statsOrder.map((statKey, i) => {
                                        // Position labels slightly outside the max radius
                                        const { x, y, angle } = getPoint(2350, i) // Push out further (2000 -> 2350)
                                        
                                        // Adjust text anchor based on horizontal position
                                        let textAnchor: 'start' | 'middle' | 'end' = 'middle'
                                        if (Math.cos(angle) > 0.1) textAnchor = 'start'
                                        else if (Math.cos(angle) < -0.1) textAnchor = 'end'
                                        
                                        // Adjust baseline based on vertical position
                                        let dominantBaseline: 'auto' | 'middle' | 'hanging' = 'middle'
                                        if (Math.sin(angle) > 0.1) dominantBaseline = 'hanging'
                                        else if (Math.sin(angle) < -0.1) dominantBaseline = 'auto'

                                        return (
                                            <text
                                                key={`label-${i}`}
                                                x={x} y={y}
                                                fill="#71717a" // zinc-500
                                                fontSize="10"
                                                fontWeight="bold"
                                                textAnchor={textAnchor}
                                                dominantBaseline={dominantBaseline}
                                                className="uppercase tracking-wider"
                                            >
                                                {statsLabels[statKey as keyof typeof statsLabels]}
                                            </text>
                                        )
                                    })}

                                    {/* Data Polygon */}
                                    <polygon
                                        points={points}
                                        fill={color}
                                        fillOpacity="0.2"
                                        stroke={color}
                                        strokeWidth="2"
                                        className="transition-all duration-500 ease-out"
                                    />
                                    
                                    {/* Data Points */}
                                    {statsOrder.map((statKey, i) => {
                                        const val = currentStage.stats[statKey as keyof CharacterStats] as number
                                        const { x, y } = getPoint(val, i)
                                        return (
                                            <circle
                                                key={i}
                                                cx={x} cy={y}
                                                r="3"
                                                fill={color}
                                                className="transition-all duration-500 ease-out"
                                            />
                                        )
                                    })}
                                </svg>
                            </div>
                        )
                    })()}
                    </div>
                </div>
            </div>

            {/* === CENTER COLUMN: STATS ENGINE === */}
            <div className="xl:col-span-3 flex flex-col gap-6">
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-6 h-full">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Activity className="text-yellow-400" /> Stats Engine
                </h2>
                
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-x-6 gap-y-6">
                {STAT_FIELDS.map(stat => {
                    const currentValue = currentStage.stats?.[stat.key as keyof CharacterStats] as number || 0;
                    const tierInfo = getStatTier(stat.key, currentValue);
                    const isExpanded = expandedStats[stat.key];
                    const accentColor = tierInfo.color.replace('text-', 'accent-')
                    const Icon = stat.icon

                    return (
                        <div key={stat.key} className={`bg-black/30 p-4 rounded-xl border ${tierInfo.border} border-opacity-60 hover:border-opacity-100 transition-all`}>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-zinc-300 uppercase flex items-center gap-2">
                                <Icon size={16} className={tierInfo.color} />
                                {stat.label}
                            </label>
                            <div className="flex items-center gap-3">
                                <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${tierInfo.color} border-current bg-black/50`}>
                                    {tierInfo.label}
                                </div>
                                <span className={`w-12 text-right font-mono font-bold text-lg ${tierInfo.color}`}>
                                    {currentValue}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setExpandedStats(prev => ({ ...prev, [stat.key]: !prev[stat.key] }))}
                                    className={`p-1 rounded-lg transition-colors ${isExpanded ? `bg-zinc-800 ${tierInfo.color}` : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                                >
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </div>
                        </div>
                        
                        {/* Read-only Progress Bar */}
                        <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden mb-2">
                            <div 
                                className={`h-full ${tierInfo.color.replace('text-', 'bg-')}`} 
                                style={{ width: `${(currentValue / 2000) * 100}%` }}
                            />
                        </div>
                        
                        <p className={`text-[10px] ${tierInfo.color} mb-3 font-medium opacity-80 h-4 overflow-hidden`}>
                            {tierInfo.description}
                        </p>
                        
                        {isExpanded && currentStage.stats?.justifications?.[stat.key as keyof typeof currentStage.stats.justifications] && (
                            <div className="w-full min-h-[60px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-zinc-300 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                <span className="text-zinc-500 text-[10px] font-bold uppercase block mb-1">Analysis / Justification</span>
                                {currentStage.stats.justifications[stat.key as keyof typeof currentStage.stats.justifications]}
                            </div>
                        )}
                        </div>
                    );
                })}
                </div>
            </div>
            </div>

            {/* === RIGHT COLUMN: COMBAT & TRAITS === */}
            <div className="xl:col-span-3 flex flex-col gap-6">
            
            {/* Combat Details */}
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Swords className="text-red-400" /> Combat Profile
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    {/* Combat Class */}
                    <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Combat Class</label>
                    <div className="flex flex-wrap gap-2">
                        {currentStage.tags.combatClass.map((cc, i) => (
                            <span key={i} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300">
                                {cc}
                            </span>
                        ))}
                    </div>
                    </div>

                    {/* Movement */}
                    <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Movement</label>
                    <div className="flex flex-wrap gap-2">
                        {currentStage.tags.movement.map((mv, i) => (
                            <span key={i} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300">
                                {mv}
                            </span>
                        ))}
                    </div>
                    </div>
                </div>

                {/* Skills */}
                <div className="space-y-4 pt-2">
                    {(['mainSkill', 'secondarySkill'] as const).map((skillKey) => {
                    const skill = currentStage.combat[skillKey] || { name: '', description: '', tags: [] };
                    const isMain = skillKey === 'mainSkill';
                    const label = isMain ? 'Main Skill' : 'Secondary Skill';
                    const defaultColor = isMain ? 'text-blue-400' : 'text-purple-400';
                    
                    // Scaling Logic
                    const scalingStat = skill.scalingStat;
                    const statValue = scalingStat ? (currentStage.stats[scalingStat as keyof CharacterStats] as number) : 0;
                    const tierInfo = scalingStat ? getStatTier(scalingStat, statValue) : null;
                    
                    const borderColor = tierInfo ? tierInfo.border : (isMain ? 'border-blue-500/30' : 'border-purple-500/30');
                    const titleColor = tierInfo ? tierInfo.color : defaultColor;
                    
                    const isExpanded = isMain ? expandedSkills.main : expandedSkills.secondary;
                    const toggleExpand = () => setExpandedSkills(prev => ({ 
                        ...prev, 
                        [isMain ? 'main' : 'secondary']: !prev[isMain ? 'main' : 'secondary'] 
                    }));
                
                    if (!skill.name) return null; // Don't show empty skills

                    return (
                        <div key={skillKey} className={`bg-black/30 p-4 rounded-xl border ${borderColor} border-opacity-60 hover:border-opacity-100 transition-all`}>
                            <div className="flex justify-between items-center cursor-pointer" onClick={toggleExpand}>
                                <h3 className={`text-xs font-bold ${titleColor} uppercase flex items-center gap-2`}>
                                {label}
                                {tierInfo && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] border ${tierInfo.color} border-current bg-black/50`}>
                                        {tierInfo.label}
                                    </span>
                                )}
                                </h3>
                                <div className="flex items-center gap-2">
                                {scalingStat && (
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1 bg-zinc-900/50 px-2 py-1 rounded">
                                        SCALES WITH {scalingStat}
                                    </div>
                                )}
                                <button type="button" className={`text-zinc-500 hover:text-white transition-colors`}>
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                </div>
                            </div>
                
                            {isExpanded && (
                                <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-3">
                                        <div>
                                            <div className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2 text-white font-bold text-lg">
                                                {skill.name}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="w-full min-h-[80px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-zinc-300 text-sm whitespace-pre-wrap">
                                                {skill.description}
                                            </div>
                                        </div>

                                        {skill.tags && skill.tags.length > 0 && (
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Combat Tags</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {skill.tags.map((tag, i) => (
                                                        <span key={i} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-bold text-zinc-400">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                    })}
                </div>
            </div>

            {/* Affinities (Source & Element) */}
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-6 flex-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Sparkles className="text-amber-400" /> Affinity
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Source</label>
                    <div className="flex flex-wrap gap-2">
                        {currentStage.tags.source.map((s, i) => (
                            <span key={i} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300">
                                {s}
                            </span>
                        ))}
                    </div>
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Element</label>
                    <div className="flex flex-wrap gap-2">
                        {currentStage.tags.element.map((e, i) => (
                            <span key={i} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300">
                                {e}
                            </span>
                        ))}
                    </div>
                    </div>
                </div>
            </div>
            
            </div>

        </div>
        </div>
    </div>
  )
}

export default FighterTechnicalSheet
