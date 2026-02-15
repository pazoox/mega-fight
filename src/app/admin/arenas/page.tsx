'use client'

import React, { useState, useEffect } from 'react'
import { Arena, Group } from '@/types'
import { Plus, Target, Zap, MapPin, Video as VideoIcon, Trash2, Folder, ChevronRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface PlatformFolder {
  id: string;
  name: string;
}

export default function ArenasPage() {
  const [arenas, setArenas] = useState<Arena[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [platformFolders, setPlatformFolders] = useState<PlatformFolder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hideEmptyGroups, setHideEmptyGroups] = useState(true)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      const [arenasRes, groupsRes, foldersRes] = await Promise.all([
        fetch('/api/arenas'),
        fetch('/api/groups'),
        fetch('/api/platform-folders')
      ])
      
      const arenasData = await arenasRes.json()
      const groupsData = await groupsRes.json()
      const foldersData = await foldersRes.json()
      
      setArenas(arenasData)
      setGroups(groupsData)
      setPlatformFolders(foldersData)
    } catch (error) {
      console.error('Failed to fetch data', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/platform-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName })
      })
      
      if (res.ok) {
        const newFolder = await res.json()
        setPlatformFolders([...platformFolders, newFolder])
        setNewFolderName('')
        setIsModalOpen(false)
      } else {
        alert('Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    } finally {
      setIsSubmitting(false)
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

  const getArenaCountForFolder = (folderName: string) => {
    return arenas.filter(a => a.folder === folderName).length
  }

  const FolderCard = ({ name, count, type }: { name: string, count: number, type: 'platform' | 'group' }) => (
    <Link href={`/admin/arenas/folder/${encodeURIComponent(name)}`} className="block h-full">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between group hover:border-orange-500/50 hover:bg-zinc-900 transition-all cursor-pointer h-full">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${type === 'platform' ? 'bg-orange-900/20 text-orange-500' : 'bg-zinc-800 text-zinc-400'} group-hover:scale-110 transition-transform`}>
            <Folder size={24} fill={type === 'platform' ? "currentColor" : "none"} />
          </div>
          <div>
            <h3 className="font-bold text-white group-hover:text-orange-400 transition-colors">{name}</h3>
            <p className="text-xs text-zinc-500">{count} Arenas</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
      </div>
    </Link>
  )

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2">
            ARENA <span className="text-orange-500">MANAGEMENT</span>
          </h1>
          <p className="text-zinc-500 text-sm">Manage battlegrounds, environmental effects, and global tags.</p>
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
        <div className="space-y-12">
          {/* Platform Folders Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                Platform Folders
              </h2>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="p-1 rounded bg-zinc-800 hover:bg-orange-600 text-zinc-400 hover:text-white transition-colors"
                title="Add Platform Folder"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {platformFolders.map(folder => (
                <FolderCard 
                  key={folder.id} 
                  name={folder.name} 
                  count={getArenaCountForFolder(folder.name)} 
                  type="platform"
                />
              ))}
              {platformFolders.length === 0 && (
                 <div className="col-span-full py-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                   No platform folders created yet. Click + to add one.
                 </div>
              )}
            </div>
          </section>

          {/* Group Folders Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-6 bg-zinc-700 rounded-full"></span>
                Group Folders
              </h2>
              <button 
                onClick={() => setHideEmptyGroups(!hideEmptyGroups)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold transition-colors ${hideEmptyGroups ? 'bg-orange-900/30 text-orange-400 border border-orange-900/50' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
              >
                {hideEmptyGroups ? <EyeOff size={14} /> : <Eye size={14} />}
                {hideEmptyGroups ? 'Hidden Empty' : 'Hide Empty'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groups
                .filter(group => !hideEmptyGroups || getArenaCountForFolder(group.name) > 0)
                .map(group => (
                  <FolderCard 
                    key={group.id} 
                    name={group.name} 
                    count={getArenaCountForFolder(group.name)} 
                    type="group"
                  />
                ))
              }
              {groups.length === 0 && (
                 <div className="col-span-full py-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                   No groups found.
                 </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Create Folder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">New Platform Folder</h3>
            <form onSubmit={handleCreateFolder}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Folder Name</label>
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="e.g. Special Events"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newFolderName.trim() || isSubmitting}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
