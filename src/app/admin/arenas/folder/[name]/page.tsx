'use client'

import React, { useState, useEffect } from 'react'
import { Arena } from '@/types'
import { ArrowLeft, Plus, Edit, Trash2, MapPin, Globe, Sun, Cloud, Zap, Video as VideoIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

export default function ArenaFolderPage() {
  const router = useRouter()
  const params = useParams()
  const folderName = decodeURIComponent(params.name as string)

  const [arenas, setArenas] = useState<Arena[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchArenas()
  }, [])

  const fetchArenas = async () => {
    try {
      const res = await fetch('/api/arenas')
      const data = await res.json()
      // Filter by folder name
      const folderArenas = data.filter((a: Arena) => a.folder === folderName)
      setArenas(folderArenas)
    } catch (error) {
      console.error('Failed to fetch arenas', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!window.confirm('Are you sure you want to delete this arena? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/arenas/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setArenas(prev => prev.filter(arena => arena.id !== id))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete arena')
      }
    } catch (error) {
      console.error('Error deleting arena:', error)
      alert('An error occurred while deleting the arena')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <button
                onClick={() => router.back()}
                className="p-2 -ml-2 rounded-full hover:bg-zinc-800 transition-colors group"
            >
                <ArrowLeft size={28} className="text-zinc-500 group-hover:text-white transition-colors" />
            </button>
            <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white mb-1 uppercase">
                FOLDER <span className="text-orange-500">{folderName}</span>
            </h1>
            <p className="text-zinc-500 text-sm">Managing {arenas.length} arenas in this folder.</p>
            </div>
        </div>
        
        <Link 
          href="/admin/arenas/new"
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
        >
          <Plus size={18} />
          <span>New Arena</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
            {arenas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                    <p className="text-zinc-500 font-medium mb-4">No arenas found in this folder.</p>
                    <Link 
                        href="/admin/arenas/new"
                        className="text-orange-500 hover:text-orange-400 font-bold uppercase text-sm tracking-wide"
                    >
                        Create your first Arena
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {arenas.map(arena => (
                    <Link 
                        href={`/admin/arenas/${arena.id}`}
                        key={arena.id}
                        className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all flex flex-col"
                    >
                        {/* Image Area */}
                        <div className="relative h-48 bg-zinc-950 overflow-hidden">
                            {arena.image ? (
                                <img 
                                    src={arena.image} 
                                    alt={arena.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                    <MapPin size={48} />
                                </div>
                            )}
                            
                            {/* Overlay Badges */}
                            <div className="absolute top-2 right-2 flex gap-1">
                                {arena.video && (
                                    <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-md text-white">
                                        <VideoIcon size={14} />
                                    </div>
                                )}
                            </div>
                            
                            {/* Environment Tags */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex gap-1">
                                {arena.environment?.slice(0, 3).map((env, i) => (
                                    <span key={i} className="text-[10px] font-bold uppercase px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-white border border-white/10">
                                        {env}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors mb-1 truncate">{arena.name}</h3>
                            <p className="text-xs text-zinc-500 line-clamp-2 mb-4 flex-1">{arena.description}</p>
                            
                            {/* Footer Stats */}
                            <div className="flex items-center justify-between border-t border-zinc-800 pt-3 mt-auto">
                                <div className="flex gap-3 text-xs text-zinc-500 font-medium">
                                    <div className="flex items-center gap-1" title="Difficulty">
                                        <Zap size={12} className="text-yellow-500" />
                                        <span>{(arena.difficulty?.space + arena.difficulty?.magic + arena.difficulty?.complexity) / 3 | 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1" title="Daytime">
                                        <Sun size={12} className="text-orange-400" />
                                        <span>{arena.daytime || 'Neutral'}</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-1">
                                    <button
                                        onClick={(e) => handleDelete(e, arena.id)}
                                        className="p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
                </div>
            )}
        </>
      )}
    </div>
  )
}
