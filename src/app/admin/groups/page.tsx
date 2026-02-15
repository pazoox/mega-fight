'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Group, Character, CharacterStats, CharacterStage } from '@/types'
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, BarChart2, Users, Swords, Globe, Shield, Zap, Activity, Brain, Wind, Dumbbell, Heart, Eye, X, Loader2, Power, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { calculateRank, getRankColor, getStatTier, RankType } from '@/utils/statTiers'

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedFighters, setExpandedFighters] = useState<Set<string>>(new Set())

  // Filter & Sort State
  const [filterStatus, setFilterStatus] = useState<'all' | 'on' | 'off'>('on')
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' })

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'group' | 'fighter' | 'form'
    data: any
  } | null>(null)

  // Create/Edit Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/groups').then(res => res.json()),
      fetch('/api/characters').then(res => res.json())
    ]).then(([groupsData, charsData]) => {
      setGroups(groupsData.reverse())
      setCharacters(charsData)
      setIsLoading(false)
    }).catch(err => {
      console.error("Failed to load data", err)
      setIsLoading(false)
    })
  }, [])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleFighter = (fighterId: string) => {
    const newExpanded = new Set(expandedFighters)
    if (newExpanded.has(fighterId)) {
      newExpanded.delete(fighterId)
    } else {
      newExpanded.add(fighterId)
    }
    setExpandedFighters(newExpanded)
  }

  // --- CONTEXT MENU HANDLERS ---

  const handleContextMenu = (e: React.MouseEvent, type: 'group' | 'fighter' | 'form', data: any) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      type,
      data
    })
  }

  const handleToggleStatus = async () => {
    if (!contextMenu) return

    const { type, data } = contextMenu
    const newStatus = !(data.isActive !== false) // Default to true if undefined, so toggle makes it false

    try {
      if (type === 'group') {
        const updatedGroup = { ...data, isActive: newStatus }
        const res = await fetch('/api/groups', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedGroup)
        })
        if (res.ok) {
            setGroups(groups.map(g => g.id === data.id ? updatedGroup : g))
        }
      } else if (type === 'fighter') {
        const updatedChar = { ...data, isActive: newStatus }
        const res = await fetch('/api/characters', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedChar)
        })
        if (res.ok) {
            setCharacters(characters.map(c => c.id === data.id ? updatedChar : c))
        }
      } else if (type === 'form') {
        const char = data.character
        const stageIndex = data.index
        const updatedStages = [...char.stages]
        updatedStages[stageIndex] = { ...updatedStages[stageIndex], isActive: newStatus }
        
        const updatedChar = { ...char, stages: updatedStages }
        const res = await fetch('/api/characters', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedChar)
        })
        if (res.ok) {
            setCharacters(characters.map(c => c.id === char.id ? updatedChar : c))
        }
      }
    } catch (err) {
      console.error('Failed to toggle status', err)
      alert('Failed to update status')
    }
    setContextMenu(null)
  }

  const handleEdit = () => {
    if (!contextMenu) return
    const { type, data } = contextMenu

    if (type === 'group') {
        setEditingGroup(data)
        setGroupName(data.name)
        setIsCreateModalOpen(true)
    } else if (type === 'fighter') {
        router.push(`/admin/characters/${data.id}`)
    } else if (type === 'form') {
        router.push(`/admin/characters/${data.character.id}`)
    }
    setContextMenu(null)
  }

  const handleRemove = async () => {
    if (!contextMenu) return
    const { type, data } = contextMenu

    if (!confirm(`Are you sure you want to remove this ${type}?`)) return

    try {
        if (type === 'group') {
            const res = await fetch(`/api/groups?id=${data.id}`, { method: 'DELETE' })
            if (res.ok) {
                setGroups(groups.filter(g => g.id !== data.id))
            }
        } else if (type === 'fighter') {
            const res = await fetch(`/api/characters?id=${data.id}`, { method: 'DELETE' })
            if (res.ok) {
                setCharacters(characters.filter(c => c.id !== data.id))
            }
        } else if (type === 'form') {
            const char = data.character
            const stageIndex = data.index
            const updatedStages = char.stages.filter((_: any, i: number) => i !== stageIndex)
            const updatedChar = { ...char, stages: updatedStages }
            
            const res = await fetch('/api/characters', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedChar)
            })
            if (res.ok) {
                setCharacters(characters.map(c => c.id === char.id ? updatedChar : c))
            }
        }
    } catch (err) {
        console.error('Failed to remove item', err)
        alert('Failed to remove item')
    }
    setContextMenu(null)
  }


  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return

    setIsCreating(true)
    try {
      const method = editingGroup ? 'PUT' : 'POST'
      const body = editingGroup 
        ? { ...editingGroup, name: groupName }
        : { name: groupName, type: 'Platform' }

      const res = await fetch('/api/groups', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (res.ok) {
        const savedGroup = await res.json()
        if (editingGroup) {
            setGroups(groups.map(g => g.id === savedGroup.id ? savedGroup : g))
        } else {
            setGroups([savedGroup, ...groups])
        }
        closeModal()
        router.refresh()
      } else {
        alert('Failed to save group')
      }
    } catch (error) {
      console.error('Failed to save group', error)
      alert('Error saving group')
    } finally {
      setIsCreating(false)
    }
  }

  const closeModal = () => {
      setIsCreateModalOpen(false)
      setEditingGroup(null)
      setGroupName('')
  }

  // --- STATS CALCULATION HELPERS ---

  const STAT_KEYS: (keyof CharacterStats)[] = ['hp', 'str', 'def', 'sta', 'sp_atk', 'int', 'spd', 'atk_spd']
  
  type GroupStats = {
    count: number
    avgStats: Record<string, number> | null
    avgPower: number
    rank: RankType
    tier: string
    fighters: any[]
  }

  const getFormStats = (stage: CharacterStage) => {
    const stats = stage.stats
    const totalPower = STAT_KEYS.reduce((sum, key) => sum + (Number(stats[key]) || 0), 0)
    const avgStatVal = totalPower / 8
    const rank = calculateRank(totalPower)
    const tier = getStatTier('hp', avgStatVal).label // Using 'hp' as generic tier lookup
    
    return {
      stats,
      totalPower,
      rank,
      tier
    }
  }

  const getFighterStats = (char: Character) => {
    const forms = char.stages || []
    if (forms.length === 0) return null

    const formStats = forms.map(getFormStats)
    
    // Calculate Averages for Fighter
    const avgStats = {} as Record<string, number>
    STAT_KEYS.forEach(key => {
      const sum = formStats.reduce((acc, curr) => acc + (Number(curr.stats[key]) || 0), 0)
      avgStats[key] = Math.round(sum / forms.length)
    })

    const avgTotalPower = Math.round(formStats.reduce((acc, curr) => acc + curr.totalPower, 0) / forms.length)
    const avgStatVal = avgTotalPower / 8
    const rank = calculateRank(avgTotalPower)
    const tier = getStatTier('hp', avgStatVal).label

    return {
      avgStats,
      avgTotalPower,
      rank,
      tier,
      formStats,
      formsCount: forms.length
    }
  }

  const getGroupStats = (group: Group): GroupStats => {
    const groupChars = characters.filter(c => c.groupId === group.id)
    if (groupChars.length === 0) return { count: 0, avgStats: null, avgPower: 0, rank: 'C', tier: 'Human', fighters: [] }

    const fighters = groupChars.map(char => ({ char, ...getFighterStats(char) })).filter(f => f.avgStats) // Filter out malformed

    if (fighters.length === 0) return { count: 0, avgStats: null, avgPower: 0, rank: 'C', tier: 'Human', fighters: [] }

    // Calculate Averages for Group
    const avgStats = {} as Record<string, number>
    STAT_KEYS.forEach(key => {
      const sum = fighters.reduce((acc, curr) => acc + (curr.avgStats?.[key] || 0), 0)
      avgStats[key] = Math.round(sum / fighters.length)
    })

    const avgPower = Math.round(fighters.reduce((acc, curr) => acc + (curr.avgTotalPower || 0), 0) / fighters.length)
    const avgStatVal = avgPower / 8
    const rank = calculateRank(avgPower)
    const tier = getStatTier('hp', avgStatVal).label // Using 'hp' as generic tier lookup

    return {
      count: groupChars.length,
      avgStats,
      avgPower,
      rank,
      tier,
      fighters
    }
  }

  // --- RENDER HELPERS ---

  const RenderStatCell = ({ value, label }: { value: number, label?: string }) => (
    <div className="flex flex-col items-center justify-center w-12">
      <span className="text-xs font-mono text-zinc-300">{value}</span>
    </div>
  )

  const RenderRankCell = ({ rank, tier }: { rank: RankType, tier: string }) => (
    <div className="flex flex-col items-center">
      <span className="font-black text-sm" style={{ color: getRankColor(rank) }}>{rank}</span>
    </div>
  )
  
  const RenderTierCell = ({ tier }: { tier: string }) => {
     let color = 'text-zinc-500'
     if (tier === 'Superhuman') color = 'text-emerald-400'
     if (tier === 'Urban') color = 'text-blue-400'
     if (tier === 'Catastrophic') color = 'text-orange-400'
     if (tier === 'Cosmic') color = 'text-purple-400'

     return <span className={`text-[10px] uppercase font-bold ${color}`}>{tier}</span>
  }

  const RenderStatusBadge = ({ isActive }: { isActive?: boolean }) => {
      // Default to true if undefined
      const active = isActive !== false
      return (
          <div className="text-center">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                active 
                ? 'text-green-500 bg-green-500/10 border-green-500/20' 
                : 'text-zinc-500 bg-zinc-800 border-zinc-700'
            }`}>
                {active ? 'On' : 'Off'}
            </span>
          </div>
      )
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const TableHeader = () => {
    const renderSortIcon = (key: string) => {
      if (sortConfig.key !== key) return <div className="w-3 h-3 ml-1 inline-block opacity-20"><ChevronDown size={12} /></div>
      return sortConfig.direction === 'asc' 
        ? <div className="w-3 h-3 ml-1 inline-block text-orange-500"><ChevronDown size={12} className="rotate-180" /></div>
        : <div className="w-3 h-3 ml-1 inline-block text-orange-500"><ChevronDown size={12} /></div>
    }

    const headers = [
      { key: 'name', label: 'Name', align: 'left' },
      { key: 'status', label: 'Status', align: 'center' },
      { key: 'count', label: 'Count', align: 'center' },
      { key: 'rank', label: 'Rank', align: 'center' },
      { key: 'scale', label: 'Scale', align: 'center' },
      { key: 'hp', label: 'HP', align: 'center', title: 'Health Points' },
      { key: 'str', label: 'STR', align: 'center', title: 'Strength' },
      { key: 'def', label: 'DEF', align: 'center', title: 'Defense' },
      { key: 'sta', label: 'STA', align: 'center', title: 'Stamina' },
      { key: 'sp_atk', label: 'SPA', align: 'center', title: 'Special Attack' },
      { key: 'int', label: 'INT', align: 'center', title: 'Intelligence' },
      { key: 'spd', label: 'SPD', align: 'center', title: 'Speed' },
      { key: 'atk_spd', label: 'ATS', align: 'center', title: 'Attack Speed' },
      { key: 'avgPower', label: 'Avg Power', align: 'right' }
    ]

    return (
      <div className="grid grid-cols-[2fr_0.8fr_1fr_1fr_1fr_repeat(8,0.5fr)_1fr] gap-2 p-3 bg-zinc-900/50 border-y border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
        {headers.map(header => (
          <div 
            key={header.key} 
            className={`cursor-pointer hover:text-zinc-300 transition-colors flex items-center ${
              header.align === 'center' ? 'justify-center' : header.align === 'right' ? 'justify-end' : 'justify-start'
            }`}
            onClick={() => handleSort(header.key)}
            title={header.title}
          >
            {header.label}
            {renderSortIcon(header.key)}
          </div>
        ))}
      </div>
    )
  }

  const GroupSection = ({ title, groupList }: { title: string, groupList: Group[] }) => {
    // 1. Filter Groups
    const filteredList = groupList.filter(group => {
      // Basic Status Filter
      if (filterStatus === 'on' && group.isActive === false) return false
      if (filterStatus === 'off' && group.isActive !== false) return false
      return true
    })

    if (filteredList.length === 0 && groupList.length > 0 && filterStatus !== 'all') {
        // Don't hide section if empty due to filter, show message maybe? 
        // Or just hide it as requested "ver apenas..."
    }
    
    if (groupList.length === 0) return null

    // 2. Sort Groups
    const sortedList = [...filteredList].sort((a, b) => {
      if (!sortConfig.key) return 0

      const statsA = getGroupStats(a)
      const statsB = getGroupStats(b)
      
      let valA: any = ''
      let valB: any = ''

      switch (sortConfig.key) {
        case 'name':
          valA = a.name
          valB = b.name
          break
        case 'status':
          valA = a.isActive !== false ? 1 : 0
          valB = b.isActive !== false ? 1 : 0
          break
        case 'count':
          valA = statsA.count
          valB = statsB.count
          break
        case 'rank': // Sort by Power for rank
        case 'avgPower':
          valA = statsA.avgPower
          valB = statsB.avgPower
          break
        case 'scale': // Not really applicable to Group, but maybe tier?
          valA = statsA.tier
          valB = statsB.tier
          break
        default:
          // Check if it's a stat key
          if (STAT_KEYS.includes(sortConfig.key as any)) {
             valA = statsA.avgStats?.[sortConfig.key] || 0
             valB = statsB.avgStats?.[sortConfig.key] || 0
          }
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return (
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-4 px-2">
            <h2 className="text-xl font-bold text-zinc-400 flex items-center gap-2">
                {title === 'Platform Groups' ? <Globe size={20} /> : <Users size={20} />}
                {title}
            </h2>
            
            {/* Filter Controls */}
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                <button 
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${filterStatus === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilterStatus('on')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${filterStatus === 'on' ? 'bg-green-900/30 text-green-400' : 'text-zinc-500 hover:text-green-400/70'}`}
                >
                    On
                </button>
                <button 
                    onClick={() => setFilterStatus('off')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${filterStatus === 'off' ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Off
                </button>
            </div>
        </div>

        <div className="bg-black/40 border border-zinc-800 rounded-xl overflow-hidden">
          <TableHeader />
          {sortedList.length === 0 ? (
             <div className="p-8 text-center text-zinc-500 italic">No groups match the filter.</div>
          ) : (
            sortedList.map(group => {
            const stats = getGroupStats(group)
            const isExpanded = expandedGroups.has(group.id)

            return (
              <div key={group.id} className="border-b border-zinc-800/50 last:border-0">
                {/* Level 1: Group Row */}
                <div 
                  className={`grid grid-cols-[2fr_0.8fr_1fr_1fr_1fr_repeat(8,0.5fr)_1fr] gap-2 p-3 items-center hover:bg-zinc-900/50 cursor-pointer transition-colors ${isExpanded ? 'bg-zinc-900/30' : ''}`}
                  onClick={() => toggleGroup(group.id)}
                  onContextMenu={(e) => handleContextMenu(e, 'group', group)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
                    <span className={`font-bold ${group.isActive === false ? 'text-zinc-500' : 'text-zinc-200'}`}>{group.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditingGroup(group); setGroupName(group.name); setIsCreateModalOpen(true); }} className="p-1 hover:text-orange-500 text-zinc-600">
                            <Edit size={12} />
                        </button>
                    </div>
                  </div>
                  <RenderStatusBadge isActive={group.isActive} />
                  <div className="text-center text-xs text-zinc-500">{stats.count} Fighters</div>
                  <RenderRankCell rank={stats.rank} tier={stats.tier} />
                  <div className="text-center"><RenderTierCell tier={stats.tier} /></div>
                  
                  {STAT_KEYS.map(key => (
                     <div key={key} className="flex justify-center">
                        <span className={`text-xs ${!stats.avgStats ? 'text-zinc-700' : 'text-zinc-400'}`}>
                           {stats.avgStats?.[key] || '-'}
                        </span>
                     </div>
                  ))}

                  <div className="text-right font-mono text-orange-400 font-bold">{stats.avgPower}</div>
                </div>

                {/* Level 2: Fighters Expansion */}
                {isExpanded && (
                  <div className="bg-zinc-900/20 border-t border-zinc-800/50">
                     {stats.fighters.length === 0 ? (
                        <div className="p-4 text-center text-zinc-600 text-xs italic">No fighters in this group yet.</div>
                     ) : (
                        stats.fighters
                        .filter((fighter: any) => {
                             if (filterStatus === 'on' && fighter.char.isActive === false) return false
                             if (filterStatus === 'off' && fighter.char.isActive !== false) return false
                             return true
                        })
                        .map((fighter: any) => {
                           const isFighterExpanded = expandedFighters.has(fighter.char.id)
                           return (
                              <div key={fighter.char.id}>
                                 <div 
                                    className={`grid grid-cols-[2fr_0.8fr_1fr_1fr_1fr_repeat(8,0.5fr)_1fr] gap-2 p-2 pl-8 items-center hover:bg-zinc-800/30 cursor-pointer border-t border-zinc-800/30 transition-colors ${isFighterExpanded ? 'bg-zinc-800/20' : ''}`}
                                    onClick={() => toggleFighter(fighter.char.id)}
                                    onContextMenu={(e) => handleContextMenu(e, 'fighter', fighter.char)}
                                 >
                                    <div className="flex items-center gap-3">
                                       {isFighterExpanded ? <ChevronDown size={12} className="text-zinc-600" /> : <ChevronRight size={12} className="text-zinc-600" />}
                                       <span className={`text-sm ${fighter.char.isActive === false ? 'text-zinc-500' : 'text-zinc-300'}`}>{fighter.char.name}</span>
                                    </div>
                                    <RenderStatusBadge isActive={fighter.char.isActive} />
                                    <div className="text-center text-xs text-zinc-600">{fighter.formsCount} Forms</div>
                                    <RenderRankCell rank={fighter.rank} tier={fighter.tier} />
                                    <div className="text-center"><RenderTierCell tier={fighter.tier} /></div>

                                    {STAT_KEYS.map(key => (
                                       <div key={key} className="flex justify-center">
                                          <span className="text-xs text-zinc-500">{fighter.avgStats[key]}</span>
                                       </div>
                                    ))}

                                    <div className="text-right font-mono text-zinc-400 text-xs">{fighter.avgTotalPower}</div>
                                 </div>

                                 {/* Level 3: Forms Expansion */}
                                 {isFighterExpanded && (
                                    <div className="bg-black/20 border-t border-zinc-800/30">
                                       {fighter.formStats.map((form: any, idx: number) => {
                                          const stage = fighter.char.stages[idx]
                                          if (filterStatus === 'on' && stage.isActive === false) return null
                                          if (filterStatus === 'off' && stage.isActive !== false) return null
                                          
                                          return (
                                          <div 
                                            key={idx} 
                                            className="grid grid-cols-[2fr_0.8fr_1fr_1fr_1fr_repeat(8,0.5fr)_1fr] gap-2 p-2 pl-16 items-center hover:bg-zinc-800/10 text-xs"
                                            onContextMenu={(e) => handleContextMenu(e, 'form', { character: fighter.char, index: idx, stage })}
                                          >
                                             <div className="text-zinc-500 italic flex items-center gap-2">
                                                <div className={`w-1 h-1 rounded-full ${stage.isActive === false ? 'bg-zinc-800' : 'bg-zinc-700'}`}></div>
                                                <span className={stage.isActive === false ? 'text-zinc-600' : ''}>
                                                    {stage.stage}
                                                </span>
                                             </div>
                                             <RenderStatusBadge isActive={stage.isActive} />
                                             <div className="text-center text-zinc-700">-</div>
                                             <RenderRankCell rank={form.rank} tier={form.tier} />
                                             <div className="text-center"><RenderTierCell tier={form.tier} /></div>

                                             {STAT_KEYS.map(key => (
                                                <div key={key} className="flex justify-center">
                                                   <span className="text-[10px] text-zinc-600">{form.stats[key]}</span>
                                                </div>
                                             ))}

                                             <div className="text-right font-mono text-zinc-600">{form.totalPower}</div>
                                          </div>
                                       )})}
                                    </div>
                                 )}
                              </div>
                           )
                        })
                     )}
                  </div>
                )}
              </div>
            )
          }))}
        </div>
      </div>
    )
  }

  const platformGroups = groups.filter(g => g.type !== 'Community' && g.type !== 'User')
  const communityGroups = groups.filter(g => g.type === 'Community' || g.type === 'User')

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2">
            GROUPS <span className="text-orange-500">MANAGEMENT</span>
          </h1>
          <p className="text-zinc-500 text-sm">Organize fighters by franchise or community groups.</p>
        </div>
        <button 
          onClick={() => {
              setEditingGroup(null)
              setGroupName('')
              setIsCreateModalOpen(true)
          }}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
        >
          <Plus size={18} />
          <span>New Group</span>
        </button>
      </div>

      {isLoading ? (
         <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
         </div>
      ) : (
         <>
            <GroupSection title="Platform Groups" groupList={platformGroups} />
            <GroupSection title="Community Groups" groupList={communityGroups} />
         </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
            className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            <div className="p-1">
                <button onClick={handleToggleStatus} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-md text-left transition-colors">
                    <Power size={14} />
                    {/* Logic to determine text based on current status */}
                    {(contextMenu.type === 'group' && contextMenu.data.isActive !== false) ||
                     (contextMenu.type === 'fighter' && contextMenu.data.isActive !== false) ||
                     (contextMenu.type === 'form' && contextMenu.data.stage.isActive !== false)
                        ? 'Turn Off' : 'Turn On'}
                </button>
                <button onClick={handleEdit} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-md text-left transition-colors">
                    <Edit size={14} />
                    Edit
                </button>
                <div className="h-px bg-zinc-800 my-1"></div>
                <button onClick={handleRemove} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md text-left transition-colors">
                    <Trash2 size={14} />
                    Remove
                </button>
            </div>
        </div>
      )}

      {/* Create/Edit Group Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black italic uppercase text-white">
                        {editingGroup ? 'Edit Group' : 'New Group'}
                    </h3>
                    <button 
                        onClick={closeModal}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSaveGroup}>
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Group Name</label>
                        <input 
                            type="text" 
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="e.g. Street Fighter"
                            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            type="button"
                            onClick={closeModal}
                            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={!groupName.trim() || isCreating}
                            className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isCreating ? <Loader2 size={18} className="animate-spin" /> : (editingGroup ? <Save size={18} /> : <Plus size={18} />)}
                            {editingGroup ? 'Save Changes' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
