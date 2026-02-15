'use client'

import React, { useState, useEffect } from 'react'
import { Arena } from '@/types'
import { Plus, Save, X, Image as ImageIcon, Video as VideoIcon, Upload, Loader2, ChevronDown, ChevronUp, Copy, Clipboard, Check, Globe, CircleDot, Sliders, ArrowLeft, Search, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ENVIRONMENTS, WEATHERS, ARENA_DAYTIME_DATA, WEATHERS_DATA, ENVIRONMENTS_DATA } from '@/constants'
import { generateArenaPrompt } from '@/utils/aiPrompt'
import * as LucideIcons from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const INITIAL_ARENA: Partial<Arena> = {
  name: '',
  description: '',
  image: '',
  video: '',
  folder: 'Canon',
  daytime: 'Neutral',
  weather: 'Neutral',
  environment: ['Neutral'],
  difficulty: {
    space: 50,
    magic: 50,
    complexity: 50
  }
}

const FOLDER_OPTIONS = ['Canon', 'Custom', 'Tournament', 'Draft']

interface ArenaFormProps {
  initialData?: Arena
}

export default function ArenaForm({ initialData }: ArenaFormProps) {
  const router = useRouter()
  // Ensure environment is an array if loading old data
  // Also handle legacy daytime (number) -> string
  const normalizedInitialData = initialData ? {
    ...initialData,
    environment: Array.isArray(initialData.environment) 
      ? initialData.environment 
      : [initialData.environment || 'Neutral'],
    daytime: typeof initialData.daytime === 'number' ? 'Neutral' : (initialData.daytime || 'Neutral')
  } : undefined

  const [formData, setFormData] = useState<Partial<Arena>>(normalizedInitialData || INITIAL_ARENA)
  const [uploading, setUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // System Vars State
  const [systemVars, setSystemVars] = useState<any>(null)
  
  // Folder State
  const [platformFolders, setPlatformFolders] = useState<{id: string, name: string}[]>([])
  const [groupFolders, setGroupFolders] = useState<{id: string, name: string}[]>([])
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false)
  const [folderSearchQuery, setFolderSearchQuery] = useState('')

  const processIcon = (iconName: any) => {
    if (!iconName) return CircleDot
    if (typeof iconName !== 'string') return iconName
    return (LucideIcons as any)[iconName] || CircleDot
  }

  useEffect(() => {
    const fetchSystemVars = async () => {
      try {
        const res = await fetch('/api/system-vars')
        const data = await res.json()
        setSystemVars(data)
      } catch (error) {
        console.error('Failed to fetch system vars:', error)
      }
    }
    
    const fetchFolders = async () => {
        try {
            const [platformRes, groupsRes] = await Promise.all([
                fetch('/api/platform-folders'),
                fetch('/api/groups')
            ])
            
            const platformData = await platformRes.json()
            const groupsData = await groupsRes.json()
            
            setPlatformFolders(Array.isArray(platformData) ? platformData : [])
            setGroupFolders(Array.isArray(groupsData) ? groupsData.map((g: any) => ({ id: g.id, name: g.name })) : [])
        } catch (error) {
            console.error('Failed to fetch folders:', error)
        }
    }

    fetchSystemVars()
    fetchFolders()
  }, [])

  // Computed Options (Merge System Vars with Constants or override)
  const availableDaytimes = systemVars?.arenaDaytimes 
    ? systemVars.arenaDaytimes.map((d: any) => ({ ...d, icon: processIcon(d.icon) }))
    : ARENA_DAYTIME_DATA

  const availableWeathers = systemVars?.weathers
    ? systemVars.weathers.map((w: any) => ({ ...w, icon: processIcon(w.icon) }))
    : WEATHERS_DATA

  const availableEnvironments = systemVars?.environments
    ? systemVars.environments.map((e: any) => ({ ...e, icon: processIcon(e.icon) }))
    : ENVIRONMENTS_DATA


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'video') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const data = new FormData()
    data.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data
      })
      
      if (!res.ok) throw new Error('Upload failed')
      
      const json = await res.json()
      setFormData(prev => ({...prev, [type]: json.url}))
    } catch (e) {
      console.error(e)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const filteredPlatformFolders = platformFolders.filter(f => f.name.toLowerCase().includes(folderSearchQuery.toLowerCase()))
  const filteredGroupFolders = groupFolders.filter(f => f.name.toLowerCase().includes(folderSearchQuery.toLowerCase()))

  // Prompt State
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [pasteStatus, setPasteStatus] = useState<'idle' | 'validating' | 'ready_to_apply' | 'error'>('idle')
  const [pendingJson, setPendingJson] = useState<Partial<Arena> | null>(null)

  const handleCopyPrompt = async () => {
    // Prepare systemVars for prompt generation (extract values)
    const promptVars = {
        environments: availableEnvironments.map((e: any) => e.value),
        weathers: availableWeathers.map((w: any) => w.value),
        daytimes: availableDaytimes.map((d: any) => d.value)
    }

    const prompt = generateArenaPrompt(promptVars) 
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(prompt)
        setCopyFeedback(true)
        setTimeout(() => setCopyFeedback(false), 2000)
      } else {
        throw new Error('Clipboard API not available')
      }
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback', err)
      // Fallback
      const textArea = document.createElement("textarea")
      textArea.value = prompt
      textArea.style.position = 'fixed' // Avoid scrolling to bottom
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          setCopyFeedback(true)
          setTimeout(() => setCopyFeedback(false), 2000)
        } else {
          throw new Error('execCommand failed')
        }
      } catch (err2) {
        console.error('Fallback copy failed', err2)
        alert('Could not copy prompt to clipboard. Please copy manually from console or check permissions.')
        console.log('PROMPT:', prompt)
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }

  const handlePasteJson = async () => {
    if (pasteStatus === 'idle' || pasteStatus === 'error') {
       try {
           setPasteStatus('validating')
           const text = await navigator.clipboard.readText()
           const json = JSON.parse(text)
           
           // Basic Validation
           if (!json.name) {
               throw new Error("Invalid structure: Name is required")
           }
           
           setPendingJson(json)
           
           setTimeout(() => {
             setPasteStatus('ready_to_apply')
           }, 500)
           
       } catch (e) {
           console.error(e)
           setPasteStatus('error')
       }
    } else if (pasteStatus === 'ready_to_apply') {
        if (pendingJson) {
            setFormData(prev => ({
                ...prev,
                name: pendingJson.name || prev.name,
                description: pendingJson.description || prev.description,
                folder: pendingJson.folder || prev.folder || 'Canon',
                daytime: pendingJson.daytime || prev.daytime || 'Neutral',
                weather: pendingJson.weather || prev.weather,
                environment: Array.isArray(pendingJson.environment) ? pendingJson.environment : (pendingJson.environment ? [pendingJson.environment] : prev.environment),
                difficulty: pendingJson.difficulty ? {
                    space: pendingJson.difficulty.space ?? prev.difficulty?.space ?? 50,
                    magic: pendingJson.difficulty.magic ?? prev.difficulty?.magic ?? 50,
                    complexity: pendingJson.difficulty.complexity ?? prev.difficulty?.complexity ?? 50
                } : prev.difficulty
            }))
            
            setPasteStatus('idle')
            setPendingJson(null)
        }
    }
  }
  
  const handleSave = async () => {
    const finalData = {
      ...formData,
      // Ensure strict types
      daytime: formData.daytime, // Now string
      environment: formData.environment || ['Neutral'],
      difficulty: {
        space: Number(formData.difficulty?.space ?? 50),
        magic: Number(formData.difficulty?.magic ?? 50),
        complexity: Number(formData.difficulty?.complexity ?? 50)
      }
    };

    setIsSaving(true);

    try {
      const url = initialData 
        ? `/api/arenas/${initialData.id}` 
        : '/api/arenas'
      
      const method = initialData ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      })
      
      if (res.ok) {
        router.push('/admin/arenas')
        router.refresh()
      } else {
        const errorData = await res.json();
        setError(`Failed to save arena: ${errorData.error || 'Unknown error'}`);
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Failed to save arena', error)
      setError('Failed to save arena. Check console for details.');
      setIsSaving(false);
    }
  }

  const toggleEnvironment = (env: string) => {
    const current = formData.environment || []
    if (current.includes(env as any)) {
      setFormData({...formData, environment: current.filter(e => e !== env) as any})
    } else {
      if (current.length >= 2) return // Max 2
      setFormData({...formData, environment: [...current, env] as any})
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push('/admin/arenas')}
            className="group p-3 -ml-3 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={32} className="text-zinc-500 group-hover:text-white transition-colors" />
          </button>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 uppercase">
              {initialData ? (
                <>EDIT <span className="text-orange-500">{initialData.name}</span></>
              ) : (
                <>NEW <span className="text-orange-500">ARENA</span></>
              )}
            </h1>
            <p className="text-zinc-500 font-medium">Configure arena visuals, environment rules and physics modifiers.</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-all text-sm font-bold uppercase tracking-wide"
          >
            {copyFeedback ? <Check size={16} /> : <Copy size={16} />}
            {copyFeedback ? 'Copied!' : 'Prompt'}
          </button>
          
          <button
            type="button"
            onClick={handlePasteJson}
            className={`
              flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all
              ${pasteStatus === 'idle' && 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}
              ${pasteStatus === 'validating' && 'bg-blue-500/20 text-blue-400 border border-blue-500/50 cursor-wait'}
              ${pasteStatus === 'ready_to_apply' && 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:bg-green-400'}
              ${pasteStatus === 'error' && 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'}
            `}
          >
             {pasteStatus === 'idle' && (
                 <>
                    <Clipboard size={16} />
                    Paste JSON
                 </>
             )}
             {pasteStatus === 'validating' && (
                 <>
                    <Loader2 size={16} className="animate-spin" />
                    Validating
                 </>
             )}
             {pasteStatus === 'ready_to_apply' && (
                 <>
                    <Check size={16} />
                    Apply
                 </>
             )}
             {pasteStatus === 'error' && (
                 <>
                    <RotateCcw size={16} />
                    Retry
                 </>
             )}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-900/20 text-sm font-black italic tracking-wider uppercase disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Save Arena
          </button>
        </div>
      </div>


      
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto hover:text-white"><X size={16} /></button>
        </div>
      )}

      {/* 1. Basic Information */}
      <div className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800 space-y-6">
        <h2 className="text-xl font-black italic tracking-tight text-white flex items-center gap-2 border-b border-zinc-800 pb-4 uppercase">
          <ImageIcon size={20} className="text-indigo-400" />
          Basic Information
        </h2>
        
        <div className="space-y-6">
          {/* Top Row: Fields (Left) + Video (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Left Column: Name & Folder (Stacked) */}
             <div className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Arena Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none transition-colors font-medium"
                    placeholder="Ex: Namek (Destroyed)"
                  />
                </div>

                {/* Folder Name */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Folder Name</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none flex items-center justify-between font-medium text-left"
                    >
                      <span>{formData.folder || 'Select Folder'}</span>
                      <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isFolderDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isFolderDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden max-h-80 flex flex-col"
                        >
                          <div className="p-2 border-b border-zinc-800">
                            <div className="relative">
                              <Search size={14} className="absolute left-3 top-3 text-zinc-500" />
                              <input
                                type="text"
                                value={folderSearchQuery}
                                onChange={(e) => setFolderSearchQuery(e.target.value)}
                                placeholder="Search folders..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 pl-9 pr-3 text-sm text-white focus:border-orange-500 outline-none"
                                autoFocus
                              />
                            </div>
                          </div>
                          
                          <div className="overflow-y-auto flex-1">
                            {/* Platform Folders */}
                            {filteredPlatformFolders.length > 0 && (
                                <div>
                                    <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase bg-zinc-950/50 sticky top-0 backdrop-blur-sm">Platform Folders</div>
                                    {filteredPlatformFolders.map(folder => (
                                        <button
                                            key={folder.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData({...formData, folder: folder.name})
                                                setIsFolderDropdownOpen(false)
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-between"
                                        >
                                            {folder.name}
                                            {formData.folder === folder.name && <Check size={14} className="text-orange-500" />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Group Folders */}
                            {filteredGroupFolders.length > 0 && (
                                <div>
                                    <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase bg-zinc-950/50 border-t border-zinc-800 sticky top-0 backdrop-blur-sm">Group Folders</div>
                                    {filteredGroupFolders.map(folder => (
                                        <button
                                            key={folder.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData({...formData, folder: folder.name})
                                                setIsFolderDropdownOpen(false)
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-between"
                                        >
                                            {folder.name}
                                            {formData.folder === folder.name && <Check size={14} className="text-orange-500" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            {filteredPlatformFolders.length === 0 && filteredGroupFolders.length === 0 && (
                                <div className="p-4 text-center text-zinc-500 text-sm">No folders found</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
             </div>

             {/* Right Column: Visual Media (Video) */}
             <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Visual Media (Video)</label>
                
                {formData.video ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-zinc-800 bg-black/50">
                    <video src={formData.video} className="w-full h-full object-contain" controls />
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, video: ''})}
                      className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-red-600 transition-colors backdrop-blur-sm z-10"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="h-48">
                     <input 
                       type="file" 
                       accept="video/*"
                       onChange={(e) => handleFileUpload(e, 'video')}
                       className="hidden"
                       id="video-upload"
                       disabled={uploading}
                     />
                     <label 
                       htmlFor="video-upload"
                       className={`w-full h-full cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 border-dashed rounded-lg flex flex-col items-center justify-center text-zinc-500 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                     >
                        {uploading ? (
                         <Loader2 size={24} className="mb-2 animate-spin text-orange-500" />
                       ) : (
                         <Upload size={24} className="mb-2" />
                       )}
                       <span className="text-sm font-medium">{uploading ? 'Uploading...' : 'Click to upload video'}</span>
                     </label>
                  </div>
                )}
             </div>
          </div>

          {/* Bottom Row: Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none transition-colors h-32 resize-none font-medium text-sm leading-relaxed"
              placeholder="Enter arena description..."
            />
          </div>
        </div>
      </div>

      {/* 2. Environment & Physics */}
      <div className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800 space-y-8">
        <h2 className="text-xl font-black italic tracking-tight text-white flex items-center gap-2 border-b border-zinc-800 pb-4 uppercase">
          <Globe size={20} className="text-green-400" />
          Environment & Physics
        </h2>
        
        <div className="space-y-8">
          
          {/* Daytime Slicer (Like Gender) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Daytime</label>
              <div className="w-full h-[50px] bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex items-center relative">
                {availableDaytimes.map((item: any) => {
                  const isSelected = formData.daytime === item.value
                  const Icon = item.icon
                  return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFormData({...formData, daytime: item.value})}
                    className={`flex-1 h-full flex items-center justify-center relative z-10 rounded-lg transition-colors duration-200 gap-2 ${
                      isSelected ? 'text-orange-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title={item.value}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="daytime-selection"
                        className="absolute inset-0 bg-zinc-800 rounded-lg shadow-sm border border-zinc-700/50"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon size={18} className="relative z-20" strokeWidth={2.5} />
                    <span className="relative z-20 text-xs font-bold uppercase tracking-wide">{item.value}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Weather Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Weather</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableWeathers.map((item: any) => {
                  const Icon = item.icon
                  const isSelected = formData.weather === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFormData({...formData, weather: item.value})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      <Icon size={16} />
                      {item.value}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Environment Multi-Select */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Environment Type (Max 2)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableEnvironments.map((item: any) => {
                  const Icon = item.icon
                  const isSelected = formData.environment?.includes(item.value as any)
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleEnvironment(item.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border ${
                        isSelected
                          ? 'bg-green-500/10 border-green-500/50 text-green-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      <Icon size={16} />
                      {item.value}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}