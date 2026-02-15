'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  label: string
  value: string | number
  description?: string
  icon?: any
}

interface CustomSelectProps {
  options: (Option | string)[]
  value: string | number | string[]
  onChange: (value: any) => void
  placeholder?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  multi?: boolean
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  triggerClassName = '',
  disabled = false,
  multi = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Normalize options to Option[]
  const normalizedOptions: Option[] = options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  )

  const selectedOptions = multi 
    ? normalizedOptions.filter(opt => Array.isArray(value) && value.includes(opt.value as never))
    : normalizedOptions.find(opt => opt.value === value)

  const getDisplayLabel = () => {
    if (multi) {
      const vals = (value as any[]) || []
      if (vals.length === 0) return placeholder
      if (vals.length === 1) {
        const val = vals[0]
        const found = normalizedOptions.find(o => o.value === val)
        if (found) return found.label
        // Fallback: Ensure we don't return an object
        return typeof val === 'object' ? (val?.label || val?.value || JSON.stringify(val)) : val
      }
      return `${vals.length} selected`
    }
    return (selectedOptions as Option)?.label || placeholder
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white transition-all duration-200 outline-none",
          isOpen ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'hover:border-zinc-700',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          triggerClassName
        )}
      >
        <span className={`flex items-center gap-2 truncate ${!value || (Array.isArray(value) && value.length === 0) ? 'text-gray-500' : ''}`}>
          {!multi && (selectedOptions as Option)?.icon && React.createElement((selectedOptions as Option).icon, { size: 16 })}
          {getDisplayLabel()}
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
          <div className="p-1 space-y-0.5">
            {normalizedOptions.map((option) => {
              const isSelected = multi 
                ? Array.isArray(value) && value.includes(option.value as never)
                : option.value === value
                
              return (
                <button
                  key={option.value}
                  type="button"
                  title={option.description}
                  onClick={() => {
                    if (multi) {
                      const current = (value as any[]) || []
                      const newValue = current.includes(option.value)
                        ? current.filter(v => v !== option.value)
                        : [...current, option.value]
                      onChange(newValue)
                    } else {
                      handleSelect(option.value)
                    }
                  }}
                  className={`w-full flex flex-col items-start px-3 py-2.5 rounded-lg text-sm text-left transition-colors group
                    ${isSelected 
                      ? 'bg-yellow-500/10 text-yellow-500 font-medium' 
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {option.icon && React.createElement(option.icon, { size: 16, className: isSelected ? 'text-yellow-500' : 'text-zinc-500' })}
                      <span className="truncate">{option.label}</span>
                    </div>
                    {isSelected && <Check size={16} className="text-yellow-500 flex-shrink-0 ml-2" />}
                  </div>
                  {option.description && (
                    <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-yellow-500/70' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                      {option.description}
                    </span>
                  )}
                </button>
              )
            })}
            {options.length === 0 && (
                <div className="px-3 py-2.5 text-sm text-gray-500 text-center">No options</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
