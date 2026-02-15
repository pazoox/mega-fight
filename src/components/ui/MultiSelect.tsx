'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Check, ChevronDown, Plus } from 'lucide-react'

interface MultiSelectProps {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  onCreate?: (newTag: string) => void
  allowCreate?: boolean
}

const MultiSelect: React.FC<MultiSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...", 
  onCreate,
  allowCreate = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wrapperRef])

  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  const handleCreate = () => {
    if (searchTerm && onCreate) {
      onCreate(searchTerm)
      if (!value.includes(searchTerm)) {
        onChange([...value, searchTerm])
      }
      setSearchTerm('')
    }
  }

  const removeTag = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== tag))
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 min-h-[52px] cursor-text flex flex-wrap gap-2 items-center transition-all hover:border-zinc-700 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500/50"
        onClick={() => setIsOpen(true)}
      >
        {value.map(tag => (
          <span key={tag} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium">
            {tag}
            <button onClick={(e) => removeTag(e, tag)} className="hover:text-white transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}
        
        <input 
          type="text" 
          className="bg-transparent outline-none text-white text-sm flex-1 min-w-[60px] placeholder:text-zinc-600"
          placeholder={value.length === 0 ? placeholder : ''}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
        />
        
        <div className="ml-auto text-zinc-500">
          <ChevronDown size={16} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl shadow-black/50 max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div 
                key={option}
                className={`p-3 cursor-pointer text-sm transition-colors ${
                  value.includes(option) 
                    ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 font-medium' 
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
                onClick={() => handleSelect(option)}
              >
                <div className="flex items-center justify-between">
                  {option}
                  {value.includes(option) && <Check size={14} />}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-zinc-500 text-center italic">No options found</div>
          )}
          
          {allowCreate && searchTerm && !options.some(o => o.toLowerCase() === searchTerm.toLowerCase()) && (
            <div 
              onClick={handleCreate}
              className="flex items-center gap-2 px-3 py-3 text-sm text-orange-500 hover:bg-orange-500/10 cursor-pointer border-t border-zinc-800 font-medium transition-colors"
            >
              <Plus size={14} />
              Create "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MultiSelect
