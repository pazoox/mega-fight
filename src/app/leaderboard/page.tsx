'use client'

import React, { useState, useEffect } from 'react'
import { Character, Group, CharacterStage } from '@/types'
import { Navbar } from '@/components/Navbar'
import { Trophy, Medal, TrendingUp, Users, Folder, Zap, Edit2, Save, X } from 'lucide-react'
import { getPowerScaleLabel } from '@/lib/utils'

interface LeaderboardEntry {
  id: string
  character: Character
  stage: CharacterStage
  stageIndex: number
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCharId, setEditingCharId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ wins: number; matches: number }>({ wins: 0, matches: 0 })

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [])

  const fetchData = (signal?: AbortSignal) => {
    setLoading(true)
    Promise.all([
      fetch('/api/characters?onlyActive=true', { signal, cache: 'no-store' }).then(res => {
        if (!res.ok) throw new Error('Failed to fetch characters')
        return res.json()
      }),
      fetch('/api/groups', { signal, cache: 'no-store' }).then(res => {
        if (!res.ok) throw new Error('Failed to fetch groups')
        return res.json()
      })
    ]).then(([charsData, groupsData]) => {
      
      const allEntries: LeaderboardEntry[] = [];
      
      // Flatten characters into stages
      if (Array.isArray(charsData)) {
        (charsData as Character[]).forEach(char => {
        if (!char.stages || char.stages.length === 0) return
        
        // Filter: Only include characters from 'Platform' groups
        const group = (groupsData as Group[]).find(g => g.id === char.groupId)
        
        // Strict Filter: Must belong to a valid Group AND be of type 'Platform' or 'Franchise'
        // This excludes:
        // 1. Orphans (group not found)
        // 2. User groups (type === 'User')
        // 3. Community groups (type === 'Community')
        // 4. Legacy groups with missing type (safety first, though migration defaults to Platform)
        if (!group) return
        if (group.type !== 'Platform' && group.type !== 'Franchise') return

        char.stages.forEach((stage, idx) => {
          // Filter out inactive stages if needed? Assuming all are active for now or checking stage.isActive
          if (stage.isActive === false) return

          allEntries.push({
            id: `${char.id}_${idx}`,
            character: char,
            stage: stage,
            stageIndex: idx
          })
        })
      })
      }

      // Sort entries by Character Stats (Global)
      // Since stats are global, all stages of same char will be tied.
      // We can secondary sort by Stage Index to keep them ordered "Base -> SSJ"
      const sorted = allEntries.sort((a, b) => {
         const winsA = a.character.wins || 0
         const matchesA = a.character.matches || 0
         const rateA = matchesA > 0 ? (winsA / matchesA) : 0
         
         const winsB = b.character.wins || 0
         const matchesB = b.character.matches || 0
         const rateB = matchesB > 0 ? (winsB / matchesB) : 0
         
         if (winsB !== winsA) return winsB - winsA // More wins first
         if (rateB !== rateA) return rateB - rateA // Higher rate tie-breaker
         
         // If same character (or exact same stats), order by stage index
         if (a.character.id === b.character.id) {
            return a.stageIndex - b.stageIndex
         }
         
         return 0
      })

      setEntries(sorted)
      setGroups(groupsData)
      setLoading(false)
    }).catch(err => {
      if (err.name === 'AbortError') return
      console.error('Failed to fetch leaderboard data:', err)
      setLoading(false)
    })
  }

  const handleEdit = (char: Character) => {
    setEditingCharId(char.id)
    setEditValues({ wins: char.wins || 0, matches: char.matches || 0 })
  }

  const handleCancelEdit = () => {
    setEditingCharId(null)
  }

  const handleSave = async (char: Character) => {
    try {
      const updatedChar = { ...char, wins: editValues.wins, matches: editValues.matches }
      
      const res = await fetch('/api/characters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedChar)
      })

      if (!res.ok) throw new Error('Failed to update stats')
      
      // Refresh data
      fetchData()
      setEditingCharId(null)
    } catch (error) {
      console.error('Error saving stats:', error)
      alert('Failed to save stats')
    }
  }

  const getGroupName = (groupId: string) => {
    return groups.find(g => g.id === groupId)?.name || 'Unknown Group'
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <Navbar active="ranking" />

      <main className="flex-1 pt-24 pb-12 px-6 max-w-5xl mx-auto w-full">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 mb-4 drop-shadow-lg">
            Global Ranking
          </h1>
          <p className="text-zinc-500 font-mono tracking-widest flex items-center justify-center gap-2">
            <Trophy className="text-yellow-500" size={16} /> Hall of Fame
          </p>
        </div>

        {loading ? (
           <div className="flex justify-center py-20">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
           </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => {
              const { character: char, stage } = entry
              
              return (
              <div 
                key={entry.id}
                className={`
                  relative flex items-center gap-6 p-4 rounded-2xl border transition-all hover:scale-[1.02]
                  ${index === 0 ? 'bg-gradient-to-r from-yellow-900/20 to-black border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 
                    index === 1 ? 'bg-gradient-to-r from-zinc-800/20 to-black border-zinc-500/50' :
                    index === 2 ? 'bg-gradient-to-r from-orange-900/20 to-black border-orange-700/50' :
                    'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900'
                  }
                `}
              >
                {/* Rank Number */}
                <div className={`
                  text-4xl font-black italic w-16 text-center
                  ${index === 0 ? 'text-yellow-500' : 
                    index === 1 ? 'text-zinc-400' :
                    index === 2 ? 'text-orange-700' :
                    'text-zinc-700'
                  }
                `}>
                  #{index + 1}
                </div>

                {/* Avatar */}
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                  {stage.image && stage.image.trim() !== "" ? (
                    <img src={stage.image} alt={char.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">N/A</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-bold text-xl uppercase text-white">
                    {stage.name || char.name} 
                    {/* If stage name is different from char name, maybe show both? But stage.name usually overrides if set. 
                        If not set, we should append the stage label if not Base? */}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Folder size={12} /> {getGroupName(char.groupId)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={12} /> {stage.stage || 'Base'}
                    </span>
                    <span className="flex items-center gap-1 text-green-500">
                      <TrendingUp size={12} /> Win Rate: {((char.matches && char.matches > 0) ? ((char.wins || 0) / char.matches * 100) : 0).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="hidden sm:flex items-center gap-6">
                  {editingCharId === char.id ? (
                    <div className="flex items-center gap-3 bg-zinc-900/90 p-2 rounded-lg border border-zinc-700 z-10">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold">Wins</label>
                        <input 
                          type="number" 
                          value={editValues.wins}
                          onChange={(e) => setEditValues(prev => ({ ...prev, wins: parseInt(e.target.value) || 0 }))}
                          className="w-16 bg-black border border-zinc-700 rounded px-2 py-1 text-sm font-mono text-white focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase text-zinc-500 font-bold">Matches</label>
                         <input 
                          type="number" 
                          value={editValues.matches}
                          onChange={(e) => setEditValues(prev => ({ ...prev, matches: parseInt(e.target.value) || 0 }))}
                          className="w-16 bg-black border border-zinc-700 rounded px-2 py-1 text-sm font-mono text-white focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <button onClick={() => handleSave(char)} className="p-1 hover:text-green-500 text-zinc-400 transition-colors">
                          <Save size={16} />
                        </button>
                        <button onClick={handleCancelEdit} className="p-1 hover:text-red-500 text-zinc-400 transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 group/stats">
                       <div className="flex flex-col items-end gap-1">
                        <div className="text-sm font-bold text-zinc-400">Wins</div>
                        <div className="text-lg font-mono text-white flex items-center gap-2">
                           <span className="text-yellow-500">{char.wins || 0}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleEdit(char)}
                        className="opacity-0 group-hover:opacity-100 group-hover/stats:opacity-100 transition-opacity p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white"
                        title="Edit Stats"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </main>
    </div>
  )
}
