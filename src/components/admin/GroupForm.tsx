'use client'

import React, { useState, useEffect } from 'react'
import { Group } from '@/types'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Copy, Check, Plus, X } from 'lucide-react'
import { generateGroupPrompt } from '@/utils/aiPrompt'
import { CANON_SCALE_OPTIONS, COMMON_RACES } from '@/constants'

interface GroupFormProps {
  groupId?: string
}

export default function GroupForm({ groupId }: GroupFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Partial<Group>>({
    name: ''
  })
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [systemVars, setSystemVars] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(!!groupId)

  useEffect(() => {
    fetch('/api/tags').then(res => res.json()).then(setAvailableTags)
    fetch('/api/system-vars').then(res => res.json()).then(setSystemVars).catch(console.error)

    if (groupId) {
      fetch(`/api/groups`).then(res => res.json()).then((groups: Group[]) => {
        const found = groups.find(g => g.id === groupId)
        if (found) setFormData(found)
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, [groupId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = groupId ? 'PUT' : 'POST'
    
    try {
      const res = await fetch('/api/groups', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        router.push('/admin/groups')
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to save group', error)
    }
  }

  const handleCopyPrompt = () => {
    const prompt = generateGroupPrompt(formData, systemVars)
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Group Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Group Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="Platform"
                checked={formData.type !== 'Community'}
                onChange={() => setFormData({ ...formData, type: 'Platform' })}
                className="w-4 h-4 text-orange-500 bg-black border-zinc-800 focus:ring-orange-500"
              />
              <span className="text-zinc-300">Platform (Admin)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="Community"
                checked={formData.type === 'Community'}
                onChange={() => setFormData({ ...formData, type: 'Community' })}
                className="w-4 h-4 text-orange-500 bg-black border-zinc-800 focus:ring-orange-500"
              />
              <span className="text-zinc-300">Community</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy AI Prompt'}
          </button>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              <Save size={18} />
              Save Group
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}