'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Character, Group } from '@/types'
import { Plus, Search, Trash2 } from 'lucide-react'

export default function GroupFightersPage() {
  const params = useParams()
  const groupId = params?.groupId as string

  const [group, setGroup] = useState<Group | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!groupId) return

    const load = async () => {
      try {
        setIsLoading(true)

        const [groupsRes, charsRes] = await Promise.all([
          fetch('/api/groups'),
          fetch(`/api/characters?groupId=${groupId}`)
        ])

        const groupsData = await groupsRes.json()
        const charsData = await charsRes.json()

        if (Array.isArray(groupsData)) {
          const foundGroup = groupsData.find((g: Group) => g.id === groupId) || null
          setGroup(foundGroup)
        } else {
          setGroup(null)
        }

        setCharacters(Array.isArray(charsData) ? charsData : [])
      } catch (error) {
        console.error('Failed to load group fighters', error)
        setCharacters([])
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [groupId])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this fighter?')) return

    try {
      const res = await fetch(`/api/characters?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCharacters(prev => prev.filter(c => c.id !== id))
      } else {
        alert('Failed to delete fighter')
      }
    } catch (error) {
      console.error('Failed to delete fighter', error)
    }
  }

  const calculateRank = (total: number) => {
    if (total < 2000) return 'C'
    if (total < 4000) return 'C+'
    if (total < 6000) return 'B'
    if (total < 8000) return 'B+'
    if (total < 10000) return 'A'
    if (total < 15000) return 'S'
    return 'S+'
  }

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S+': return '#FFD700'
      case 'S': return '#FFD700'
      case 'A': return '#ff4d4d'
      case 'B+': return '#3b82f6'
      case 'B': return '#3b82f6'
      case 'C+': return '#22c55e'
      case 'C': return '#22c55e'
      default: return '#71717a'
    }
  }

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(search.toLowerCase())
  )

  const visibleCharacters = filteredCharacters
  const groupName = group?.name || 'Unknown Group'

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2">
            {groupName} <span className="text-orange-500">FIGHTERS</span>
          </h1>
          <p className="text-zinc-500 text-sm">Manage fighters inside this group.</p>
        </div>
        <Link
          href={`/admin/characters/new?groupId=${groupId}`}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
        >
          <Plus size={18} />
          <span>New Fighter</span>
        </Link>
      </div>

      <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Search fighter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-orange-500 outline-none transition-colors placeholder-zinc-600"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
          {visibleCharacters.map(char => {
            const strongestStage = char.stages.reduce((prev, current) => {
              const prevTotal = Object.values(prev.stats).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0) as number
              const currTotal = Object.values(current.stats).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0) as number
              return currTotal > prevTotal ? current : prev
            }, char.stages[0])

            const mainImage = strongestStage?.thumbnail || strongestStage?.image || char.stages[0]?.thumbnail || char.stages[0]?.image

            const totalStats = Object.values(strongestStage.stats).reduce((sum, val) =>
              typeof val === 'number' ? sum + val : sum, 0) as number
            const rank = calculateRank(totalStats)
            const rankColor = getRankColor(rank)

            return (
              <Link key={char.id} href={`/admin/characters/${char.id}`} className="block h-full">
                <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden group hover:border-orange-500/50 transition-all hover:shadow-xl hover:shadow-orange-900/10 flex flex-col h-full cursor-pointer relative">
                  <button
                    onClick={(e) => handleDelete(e, char.id)}
                    className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-red-600 p-2 rounded-lg backdrop-blur-sm border border-white/10 text-white transition-all opacity-0 group-hover:opacity-100 transform translate-y-[-10px] group-hover:translate-y-0"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="aspect-square bg-zinc-950 relative overflow-hidden">
                    {mainImage ? (
                      <img src={mainImage} alt={char.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">No Image</div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                    <div className="absolute bottom-0 left-0 w-full p-2">
                      <h3 className="text-sm font-bold text-white leading-tight group-hover:text-orange-400 transition-colors truncate">{char.name}</h3>
                      <p className="text-zinc-400 text-[9px] font-medium uppercase tracking-wider mt-0.5 truncate">{groupName}</p>
                    </div>
                  </div>

                  <div className="p-2 bg-zinc-900/50 border-t border-zinc-800 grid grid-cols-2 gap-1 text-[9px]">
                    <div className="bg-zinc-950/50 p-1 rounded text-center border border-zinc-800/50">
                      <span className="block text-zinc-500 uppercase text-[9px] tracking-wider mb-0.5">Race</span>
                      <span className="text-zinc-300 font-medium truncate px-1">{char.specs.race}</span>
                    </div>
                    <div className="bg-zinc-950/50 p-1 rounded text-center border border-zinc-800/50">
                      <span className="block text-zinc-500 uppercase text-[9px] tracking-wider mb-0.5">Modes</span>
                      <span className="text-zinc-300 font-medium">{char.stages.length} Forms</span>
                    </div>
                    <div className="bg-zinc-950/50 p-1 rounded text-center border border-zinc-800/50">
                      <span className="block text-zinc-500 uppercase text-[9px] tracking-wider mb-0.5">Power</span>
                      <span className="text-orange-400 font-bold">{totalStats}</span>
                    </div>
                    <div className="bg-zinc-950/50 p-1 rounded text-center border border-zinc-800/50 relative overflow-hidden">
                      <span className="block text-zinc-500 uppercase text-[9px] tracking-wider mb-0.5">Rank</span>
                      <span className="font-black text-sm relative z-10" style={{ color: rankColor }}>{rank}</span>
                      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: rankColor }}></div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

