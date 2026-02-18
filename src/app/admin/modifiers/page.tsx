'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import * as LucideIcons from 'lucide-react'
import { Swords, Mountain, Zap, ChevronDown, ChevronUp, Wind, Flame, Droplets, Globe, Shield, Activity, Skull, Ghost, Cpu, Sparkles, User, Crosshair, Plus, X, Save, Edit, Trash2, CircleDot, CloudRain, CloudLightning, Snowflake, Maximize, Grip, Sliders, Sun, Moon, Sunrise, Sunset, Building2, Grid3X3, TreePine, Tent, Landmark, Orbit, CloudFog, Tags, Search, Dna, Database, ArrowLeftRight, Handshake, ArrowRight, Heart, Crown, Dumbbell, Percent, Hash } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'
import { motion, AnimatePresence } from 'framer-motion'

import { COMBAT_CLASSES_DATA, MOVEMENT_DATA, COMPOSITION_DATA, SOURCE_DATA, ELEMENT_DATA, ARENA_DAYTIME_DATA, ENVIRONMENTS_DATA, WEATHERS_DATA, SKILL_TAGS_DATA } from '@/constants'
import { Group } from '@/types'

// ==========================================
// DATA DEFINITIONS
// ==========================================

const COMBAT_VARS = {
  'Race': {
    icon: Dna,
    values: [],
    desc: 'Canonical biological or artificial race.'
  },
  'Combat Class': {
    icon: Crosshair,
    values: COMBAT_CLASSES_DATA,
    desc: 'Determines the fighting style and role in battle.'
  },
  'Combat Tags': {
    icon: Tags,
    values: SKILL_TAGS_DATA,
    desc: 'Keywords defining skill properties and effects.'
  },
  'Movement': {
    icon: Wind,
    values: MOVEMENT_DATA,
    desc: 'How the character traverses the battlefield.'
  },
  'Composition': {
    icon: User,
    values: COMPOSITION_DATA,
    desc: 'The physical makeup of the character.'
  },
  'Power Source': {
    icon: Sparkles,
    values: SOURCE_DATA,
    desc: 'The origin of their power.'
  },
  'Element': {
    icon: Flame,
    values: ELEMENT_DATA,
    desc: 'Elemental affinity and resistance.'
  }
}

const ARENA_VARS = {
  'Daytime': {
    icon: Sun,
    values: ARENA_DAYTIME_DATA,
    desc: 'Time of day affecting visibility and specific power sources.'
  },
  'Environment': {
    icon: Globe,
    values: ENVIRONMENTS_DATA,
    desc: 'The dominant biome of the arena.'
  },
  'Weather': {
    icon: Droplets,
    values: WEATHERS_DATA,
    desc: 'Atmospheric conditions affecting the battle.'
  }
}

const MODIFIER_VARS = {}

// ==========================================
// COMPONENTS
// ==========================================

const RPG_ICONS = [
  // Combat & Weapons
  'Swords', 'Sword', 'Shield', 'ShieldCheck', 'ShieldAlert', 'ShieldX', 'Axe', 'Hammer', 'Gavel', 'Pickaxe', 'Crosshair', 'Target', 'Bomb', 'Skull', 'Ghost', 'VenetianMask', 'Grab', 'HandMetal', 'Fist',
  // Magic & Elements
  'Zap', 'Flame', 'FlameKindling', 'Droplets', 'Waves', 'Wind', 'Tornado', 'Snowflake', 'Mountain', 'MountainSnow', 'Sun', 'Moon', 'MoonStar', 'Star', 'Sparkles', 'Wand', 'Wand2', 
  'Cloud', 'CloudRain', 'CloudLightning', 'CloudFog', 'CloudSnow', 'CloudHail', 'CloudMoon', 'CloudSun', 'Orbit', 'Eclipse', 'Sunrise', 'Sunset', 'Thermometer', 'ThermometerSun', 'ThermometerSnowflake',
  // Stats & Attributes
  'Heart', 'HeartPulse', 'HeartCrack', 'Brain', 'BrainCircuit', 'Eye', 'EyeOff', 'Dumbbell', 'BicepsFlexed', 'Activity', 'Hourglass', 'Timer', 'Gauge', 'Scale', 'Battery', 'BatteryCharging', 'BatteryWarning', 'Flashlight', 'TrendingUp', 'TrendingDown', 'BarChart', 'PieChart', 'LineChart',
  // Loot & Items
  'Gem', 'Diamond', 'Coins', 'Banknote', 'Wallet', 'Scroll', 'Map', 'Key', 'Lock', 'Unlock', 'Backpack', 'Luggage', 'Gift', 'FlaskConical', 'FlaskRound', 'Beaker', 'TestTube', 'Book', 'BookOpen', 'Briefcase', 'Camera', 'Compass', 'Crown', 'Dice1', 'Dice2', 'Dice3', 'Dice4', 'Dice5', 'Dice6', 'Drum', 'Egg', 'Glasses', 'Guitar', 'Headphones', 'Keyboard', 'Lamp', 'Magnet', 'Megaphone', 'Mic', 'Microscope', 'Palette', 'Phone', 'Smartphone', 'Tablet', 'Shirt', 'Shovel', 'Speaker', 'Ticket', 'Tag', 'Tags', 'Tool', 'Trophy', 'Umbrella', 'Watch', 'Wrench', 'Trash2',
  'Box', 'Boxes', 'Package', 'ShoppingBag', 'ShoppingCart', 'Bell', 'Sticker', 'StickyNote', 'Stamp', 'Receipt', 'Newspaper', 'Clipboard', 'File', 'Folder',
  // Food & Drink
  'Pizza', 'Apple', 'Banana', 'Carrot', 'Cherry', 'Citrus', 'Cookie', 'Croissant', 'CupSoda', 'Donut', 'EggFried', 'Grape', 'IceCream', 'Lollipop', 'Martini', 'Milk', 'Nut', 'Popcorn', 'Sandwich', 'Soup', 'Vegan', 'Wheat', 'Wine', 'Beer', 'Coffee', 'Cake', 'Candy',
  'Drumstick', 'Pineapple', 'Salad', 'GlassWater', 'Dessert', 'Utensils', 'UtensilsCrossed',
  // Nature & Creatures
  'Leaf', 'Flower', 'Flower2', 'TreePine', 'TreeDeciduous', 'Trees', 'Palmtree', 'Sprout', 'Footprints', 'PawPrint', 'Feather', 'Bird', 'Cat', 'Dog', 'Rat', 'Fish', 'FishSymbol', 'Bug', 'BugPlay', 'Spider', 'Dna', 'Rabbit', 'Snail', 'Turtle', 'Squirrel', 'Bone',
  'Rainbow', 'Shell', 'Clover', 'Droplet',
  // Tech & Sci-Fi
  'Cpu', 'Database', 'Server', 'Radio', 'Signal', 'Bot', 'Robot', 'Rocket', 'Plane', 'Atom', 'Biohazard', 'Radiation', 'Terminal', 'TerminalSquare', 'Code', 'Code2', 'Binary', 'Microchip', 'CircuitBoard', 'Wifi', 'HardDrive', 'Fingerprint', 'Scan', 'Radar', 'Router', 'Monitor', 'Mouse', 'Tv',
  'Satellite', 'Earth',
  // Gaming
  'Gamepad', 'Gamepad2', 'Joystick', 'Puzzle', 'ToyBrick',
  // Classes & Roles
  'Medal', 'User', 'Users', 'UserCog', 'UserCheck', 'Handshake', 'Music', 'GraduationCap', 'Construction', 'HardHat', 'Stethoscope', 'Syringe', 'Pill',
  // Vehicles & Transport
  'Anchor', 'Ship', 'Car', 'Bike', 'Bus', 'Truck', 'Train', 'Sailboat', 'Tractor', 'Forklift', 'Ambulance',
  // Furniture & Housing
  'Bed', 'BedDouble', 'Armchair', 'Sofa', 'DoorOpen', 'DoorClosed', 'Table', 'Bath', 'Refrigerator', 'Microwave',
  // Art & Tools
  'Brush', 'PaintBucket', 'Pencil', 'PenTool', 'Eraser', 'Scissors', 'Highlighter', 'Ruler',
  // Emotes & Body
  'Smile', 'Laugh', 'Frown', 'Meh', 'ThumbsUp', 'ThumbsDown', 'Hand', 'Ear',
  // Locations
  'Tent', 'TentTree', 'Landmark', 'Building2', 'Castle', 'Factory', 'Home', 'Warehouse', 'Store', 'School', 'Hospital',
  // Shapes & Misc
  'CircleDot', 'Grid', 'Grid3X3', 'Layers', 'Hexagon', 'Triangle', 'Square', 'Circle', 'Infinity', 'HelpCircle', 'AlertCircle', 'AlertTriangle', 'AlertOctagon', 'Info', 'Check', 'CheckCircle', 'CheckSquare', 'X', 'XCircle', 'XSquare', 'Plus', 'Minus', 'Divide', 'Percent', 'Hash', 'AtSign', 'Asterisk', 'Badge', 'BadgeCheck', 'BadgeAlert', 'BadgeInfo', 'Flag', 'Bookmark', 'Pin', 'Paperclip'
]

export default function ModifiersPage() {
  const [combatVars, setCombatVars] = useState(COMBAT_VARS)
  const [arenaVars, setArenaVars] = useState(ARENA_VARS)
  const [modifierVars, setModifierVars] = useState(MODIFIER_VARS)
  const [rules, setRules] = useState<any[]>([])
  const [fighters, setFighters] = useState<{ id: string; name: string; groupId: string | null }[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  
  const [modalOpen, setModalOpen] = useState(false)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState<{ category: 'combat' | 'arena' | 'modifier', field: string } | null>(null)
  
  // Rule Modal State
  const [newRule, setNewRule] = useState({
    relationType: 'versus' as 'versus' | 'synergy',
    originGroup: 'Combat' as 'Combat' | 'Arena' | 'Fighter',
    originCategory: '',
    originVariable: '',
    targetGroup: 'Combat' as 'Combat' | 'Arena' | 'Fighter',
    targetCategory: '',
    targetVariable: '',
    statAffected: '',
    effectType: 'percentage' as 'percentage' | 'flat',
    effectValue: 0,
    description: ''
  })
  
  const [editingItem, setEditingItem] = useState<{ index: number } | null>(null)
  const [newValue, setNewValue] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [selectedIcon, setSelectedIcon] = useState<string>('')
  const [iconSearch, setIconSearch] = useState('')
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  // Matrix State
  const [matrixRelation, setMatrixRelation] = useState<'versus' | 'synergy' | ''>('')
  const [matrixGroup, setMatrixGroup] = useState<'Combat' | 'Arena' | 'Fighters' | ''>('')
  const [matrixCategory, setMatrixCategory] = useState('')
  const [matrixVariable, setMatrixVariable] = useState('')
  
  // Get all valid icons
  const allIcons = useMemo(() => {
    return Object.keys(LucideIcons)
      .filter(key => isNaN(Number(key)) && key !== 'createLucideIcon' && key !== 'default' && /^[A-Z]/.test(key))
      .sort()
  }, [])

  const filteredIcons = useMemo(() => {
    if (!iconSearch) {
      // Return curated RPG icons that exist in Lucide
      return RPG_ICONS.filter(icon => allIcons.includes(icon))
    }
    return allIcons.filter(name => name.toLowerCase().includes(iconSearch.toLowerCase())).slice(0, 100)
  }, [allIcons, iconSearch])

  const [contextMenu, setContextMenu] = useState<{ 
    x: number, 
    y: number, 
    type: 'variable' | 'rule',
    // Variable Props
    category?: 'combat' | 'arena' | 'modifier', 
    field?: string, 
    index?: number, 
    // Rule Props
    ruleId?: string,
    // Common
    value: any 
  } | null>(null)

  const [deleteDialog, setDeleteDialog] = useState<{
    category: 'combat' | 'arena'
    field: string
    index: number
    label: string
  } | null>(null)

  // Map backend keys to frontend keys
  const KEY_MAPPING: Record<string, string> = {
    'Race': 'races',
    'Combat Class': 'combatClasses',
    'Combat Tags': 'skillTags',
    'Movement': 'movements',
    'Composition': 'compositions',
    'Power Source': 'sources',
    'Element': 'elements',
    'Daytime': 'arenaDaytimes',
    'Environment': 'environments',
    'Weather': 'weathers'
  }

  // Reverse mapping for saving
  const REVERSE_KEY_MAPPING: Record<string, string> = Object.entries(KEY_MAPPING).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {})

  const processIcon = (iconName: any) => {
    if (!iconName) return CircleDot
    if (typeof iconName !== 'string') return iconName // Already a component
    return (LucideIcons as any)[iconName] || CircleDot
  }

  const fetchSystemVars = async () => {
    try {
      // Fetch Rules
      fetch('/api/modifier-rules')
        .then(res => res.json())
        .then(data => setRules(data))
        .catch(err => console.error('Failed to fetch rules:', err))

      const res = await fetch('/api/system-vars')
      const data = await res.json()
      
      if (data && Object.keys(data).length > 0) {
        // Update Combat Vars
        setCombatVars(prev => {
          const next = { ...prev }
          Object.keys(next).forEach(key => {
            const backendKey = KEY_MAPPING[key]
            if (data[backendKey]) {
                // @ts-ignore
                next[key] = { 
                    // @ts-ignore
                    ...next[key], 
                    values: data[backendKey].map((item: any) => ({
                        ...item,
                        icon: processIcon(item.icon)
                    }))
                }
            }
          })
          return next
        })

        // Update Arena Vars
        setArenaVars(prev => {
          const next = { ...prev }
          Object.keys(next).forEach(key => {
            const backendKey = KEY_MAPPING[key]
            if (data[backendKey]) {
                // @ts-ignore
                next[key] = { 
                    // @ts-ignore
                    ...next[key], 
                    values: data[backendKey].map((item: any) => ({
                        ...item,
                        icon: processIcon(item.icon)
                    }))
                }
            }
          })
          return next
        })
      }
    } catch (error) {
      console.error('Failed to fetch system vars:', error)
    }
  }

  const saveToBackend = async (newCombatVars: any, newArenaVars: any) => {
    try {
      const existingRes = await fetch('/api/system-vars')
      const existingData = existingRes.ok ? await existingRes.json() : {}

      const payload: any = { ...existingData }
      
      Object.entries(newCombatVars).forEach(([key, data]: [string, any]) => {
        const backendKey = KEY_MAPPING[key]
        if (backendKey) {
          payload[backendKey] = data.values.map((item: any) => {
            let iconName = 'CircleDot'
            if (item.icon) {
              if (typeof item.icon === 'string') {
                iconName = item.icon
              } else {
                const foundName = Object.keys(LucideIcons).find(k => (LucideIcons as any)[k] === item.icon)
                if (foundName) iconName = foundName
              }
            }
            return {
              value: item.value,
              description: item.description,
              icon: iconName
            }
          })
        }
      })

      Object.entries(newArenaVars).forEach(([key, data]: [string, any]) => {
        const backendKey = KEY_MAPPING[key]
        if (backendKey) {
          payload[backendKey] = data.values.map((item: any) => {
            let iconName = 'CircleDot'
            if (item.icon) {
              if (typeof item.icon === 'string') {
                iconName = item.icon
              } else {
                const foundName = Object.keys(LucideIcons).find(k => (LucideIcons as any)[k] === item.icon)
                if (foundName) iconName = foundName
              }
            }
            return {
              value: item.value,
              description: item.description,
              icon: iconName
            }
          })
        }
      })

      const saveRes = await fetch('/api/system-vars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!saveRes.ok) {
        console.error('Failed to save system vars: ', await saveRes.text())
      } else {
        fetchSystemVars()
      }
    } catch (error) {
      console.error('Failed to save system vars:', error)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchSystemVars()
  }, [])

  useEffect(() => {
    const fetchFightersAndGroups = async () => {
      try {
        const [fightersRes, groupsRes] = await Promise.all([
          fetch('/api/characters?mode=list&onlyActive=true&limit=500'),
          fetch('/api/groups')
        ])

        if (fightersRes.ok) {
          const fightersData = await fightersRes.json()
          if (Array.isArray(fightersData)) {
            setFighters(
              fightersData.map((c: any) => ({
                id: c.id,
                name: c.name,
                groupId: c.group_id || c.groupId || null
              }))
            )
          }
        }

        if (groupsRes.ok) {
          const groupsData = await groupsRes.json()
          if (Array.isArray(groupsData)) {
            setGroups(groupsData)
          }
        }
      } catch (error) {
        console.error('Failed to fetch fighters/groups for rules modal:', error)
      }
    }
    fetchFightersAndGroups()
  }, [])

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleAddClick = (category: 'combat' | 'arena' | 'modifier', field: string) => {
    setCurrentField({ category, field })
    setEditingItem(null)
    setNewValue('')
    setNewDesc('')
    setSelectedIcon('')
    setIconSearch('')
    setModalOpen(true)
  }

  const handleAddRuleClick = (originGroup: 'Combat' | 'Arena' | 'Fighter', originCategory?: string) => {
      setEditingRuleId(null)
      setNewRule({
          relationType: 'versus',
          originGroup,
          originCategory: originGroup === 'Fighter' ? '' : (originCategory || ''),
          originVariable: '',
          targetGroup: 'Combat',
          targetCategory: '',
          targetVariable: '',
          statAffected: '',
          effectType: 'percentage',
          effectValue: 0,
          description: ''
      })
      setRuleModalOpen(true)
  }

  const handleEdit = () => {
    if (!contextMenu) return
    
    if (contextMenu.type === 'rule') {
        const rule = contextMenu.value
        setEditingRuleId(rule.id)
        
        const isCombat = (cat: string) => cat in combatVars

        const triggerIsFighter = rule.trigger.type === 'Fighter'
        const targetIsFighter = rule.target.type === 'Fighter'

        let originGroup: 'Combat' | 'Arena' | 'Fighter' = 'Combat'
        let originCategory = ''
        let originVariable = ''

        if (triggerIsFighter) {
          const fighter = fighters.find(f => f.name === rule.trigger.value)
          originGroup = 'Fighter'
          originCategory = fighter?.groupId || ''
          originVariable = rule.trigger.value
        } else {
          originGroup = isCombat(rule.trigger.type) ? 'Combat' : 'Arena'
          originCategory = rule.trigger.type
          originVariable = rule.trigger.value
        }

        let targetGroup: 'Combat' | 'Arena' | 'Fighter' = 'Combat'
        let targetCategory = ''
        let targetVariable = ''

        if (targetIsFighter) {
          const fighter = fighters.find(f => f.name === rule.target.value)
          targetGroup = 'Fighter'
          targetCategory = fighter?.groupId || ''
          targetVariable = rule.target.value
        } else {
          targetGroup = isCombat(rule.target.type) ? 'Combat' : 'Arena'
          targetCategory = rule.target.type
          targetVariable = rule.target.value
        }
        
        setNewRule({
            relationType: rule.relationType || (rule.id.includes('synergy') ? 'synergy' : 'versus'),
            originGroup,
            originCategory,
            originVariable,
            targetGroup,
            targetCategory,
            targetVariable,
            statAffected: rule.effect.stat,
            effectType: rule.effect.type,
            effectValue: rule.effect.value,
            description: rule.description
        })
        
        setRuleModalOpen(true)
        setContextMenu(null)
        return
    }

    if (contextMenu.type === 'variable' && contextMenu.category && contextMenu.field) {
        setCurrentField({ category: contextMenu.category, field: contextMenu.field })
        setEditingItem({ index: contextMenu.index! })
        
        const isObj = typeof contextMenu.value === 'object' && contextMenu.value !== null
        setNewValue(isObj ? contextMenu.value.value : contextMenu.value)
        setNewDesc(isObj ? contextMenu.value.description : '')
        
        // Try to find icon name
        if (isObj && contextMenu.value.icon) {
            const iconName = Object.keys(LucideIcons).find(key => (LucideIcons as any)[key] === contextMenu.value.icon)
            setSelectedIcon(iconName || '')
        } else {
            setSelectedIcon('')
        }
        
        setIconSearch('')
        setModalOpen(true)
        setContextMenu(null)
    }
  }

  const handleSaveRule = async () => {
    // Basic validation
    if (!newRule.originCategory || !newRule.originVariable || !newRule.targetCategory || !newRule.targetVariable || !newRule.statAffected || !newRule.effectValue) {
        return
    }

    // If editing, delete old rule first
    if (editingRuleId) {
        try {
            await fetch(`/api/modifier-rules?id=${editingRuleId}`, {
                method: 'DELETE'
            })
            setRules(prev => prev.filter(r => r.id !== editingRuleId))
        } catch (error) {
            console.error('Failed to delete old rule:', error)
            return
        }
    }

    const triggerType = newRule.originGroup === 'Fighter' ? 'Fighter' : newRule.originCategory
    const targetType = newRule.targetGroup === 'Fighter' ? 'Fighter' : newRule.targetCategory

    const payload = {
        name: `rule_${newRule.relationType}_${triggerType}_${newRule.originVariable}_${targetType}_${newRule.targetVariable}`,
        trigger: {
            type: triggerType,
            value: newRule.originVariable
        },
        target: {
            type: targetType,
            value: newRule.targetVariable
        },
        effect: {
            stat: newRule.statAffected,
            type: newRule.effectType,
            value: Number(newRule.effectValue)
        },
        description: newRule.description,
        active: true,
        version: 1
    }

    try {
        const res = await fetch('/api/modifier-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        
        if (res.ok) {
            const savedRule = await res.json()
            setRules(prev => [...prev, savedRule])
            setRuleModalOpen(false)
            setEditingRuleId(null)
        }
    } catch (error) {
        console.error('Failed to save rule:', error)
    }
  }

  const confirmVariableDelete = async () => {
    if (!deleteDialog) return
    const { category, field, index, label } = deleteDialog

    if (category === 'combat') {
      const newCombatVars = { ...combatVars }
      // @ts-ignore
      const currentValues = newCombatVars[field].values
      const newValues = [...currentValues]
      newValues.splice(index, 1)
      // @ts-ignore
      newCombatVars[field] = { ...newCombatVars[field], values: newValues }
      
      setCombatVars(newCombatVars)
      saveToBackend(newCombatVars, arenaVars)

      fetch('/api/system-vars/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: field,
          value: label
        })
      }).catch(err => console.error('Failed to run system vars cleanup:', err))
    } else if (category === 'arena') {
      const newArenaVars = { ...arenaVars }
      // @ts-ignore
      const currentValues = newArenaVars[field].values
      const newValues = [...currentValues]
      newValues.splice(index, 1)
      // @ts-ignore
      newArenaVars[field] = { ...newArenaVars[field], values: newValues }
      
      setArenaVars(newArenaVars)
      saveToBackend(combatVars, newArenaVars)

      fetch('/api/system-vars/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: field,
          value: label
        })
      }).catch(err => console.error('Failed to run system vars cleanup:', err))
    }

    setDeleteDialog(null)
  }

  const cancelVariableDelete = () => {
    setDeleteDialog(null)
  }

  const handleDelete = async () => {
    if (!contextMenu) return

    if (contextMenu.type === 'rule' && contextMenu.ruleId) {
        try {
            const res = await fetch(`/api/modifier-rules?id=${contextMenu.ruleId}`, {
                method: 'DELETE'
            })
            
            if (res.ok) {
                setRules(prev => prev.filter(r => r.id !== contextMenu.ruleId))
            }
        } catch (error) {
            console.error('Failed to delete rule:', error)
        }
        setContextMenu(null)
        return
    }

    if (contextMenu.type === 'variable' && contextMenu.category && contextMenu.field && contextMenu.index !== undefined) {
        const { category, field, index } = contextMenu
        
        if (category === 'modifier') {
            setContextMenu(null)
            return
        }

        const rawVal = contextMenu.value as any
        const variableLabel = typeof rawVal === 'object' && rawVal !== null ? rawVal.value : String(rawVal)

        setDeleteDialog({
          category,
          field,
          index,
          label: variableLabel
        })
        setContextMenu(null)
    }
  }

  const handleSave = () => {
    if (!currentField || !newValue.trim()) return

    const IconComponent = selectedIcon ? (LucideIcons as any)[selectedIcon] : null
    const newItem = { 
        value: newValue.trim(), 
        description: newDesc.trim(),
        icon: IconComponent
    }
    
    if (currentField.category === 'combat') {
      const newCombatVars = { ...combatVars }
      // @ts-ignore
      const currentValues = newCombatVars[currentField.field].values
      let newValues = [...currentValues]
      
      if (editingItem !== null) {
        // @ts-ignore
        newValues[editingItem.index] = newItem
      } else {
        // @ts-ignore
        newValues.push(newItem)
      }

      // @ts-ignore
      newCombatVars[currentField.field] = { ...newCombatVars[currentField.field], values: newValues }
      
      setCombatVars(newCombatVars)
      saveToBackend(newCombatVars, arenaVars)

    } else if (currentField.category === 'arena') {
      const newArenaVars = { ...arenaVars }
      // @ts-ignore
      const currentValues = newArenaVars[currentField.field].values
      let newValues = [...currentValues]
      
      if (editingItem !== null) {
         // @ts-ignore
         newValues[editingItem.index] = newItem
      } else {
         // @ts-ignore
         newValues.push(newItem)
      }

      // @ts-ignore
      newArenaVars[currentField.field] = { ...newArenaVars[currentField.field], values: newValues }
      
      setArenaVars(newArenaVars)
      saveToBackend(combatVars, newArenaVars)
    }

    setModalOpen(false)
  }

  const handleContextMenu = (e: React.MouseEvent, category: 'combat' | 'arena' | 'modifier', field: string, index: number, value: any) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'variable',
      category,
      field,
      index,
      value
    })
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32 relative space-y-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2">
            MODIFIERS <span className="text-orange-500">MANAGEMENT</span>
          </h1>
          <p className="text-zinc-500 text-sm">Configure global system variables, attributes, and tags.</p>
        </div>
      </div>

      {/* Variables Section */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors space-y-6">
        <div className="flex flex-col gap-1 mb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Database className="text-orange-500" size={20} />
                </div>
                Variables
            </h2>
            <p className="text-zinc-500 text-sm ml-11">
                Global system constants used for character creation and arena generation.
            </p>
        </div>

        <div className="space-y-6">
            {/* 1. Combat Container */}
            <CollapsibleSection title="Combat" icon={Swords} color="red">
                {Object.entries(combatVars).map(([key, data]) => (
                <ExpandableField 
                    key={key} 
                    title={key} 
                    data={data} 
                    color="red" 
                    onAdd={() => handleAddClick('combat', key)}
                    onItemContextMenu={(e, idx, val) => handleContextMenu(e, 'combat', key, idx, val)}
                />
                ))}
            </CollapsibleSection>

            {/* 2. Arena Container */}
            <CollapsibleSection title="Arena" icon={Mountain} color="blue">
                {Object.entries(arenaVars).map(([key, data]) => (
                <ExpandableField 
                    key={key} 
                    title={key} 
                    data={data} 
                    color="blue" 
                    onAdd={() => handleAddClick('arena', key)}
                    onItemContextMenu={(e, idx, val) => handleContextMenu(e, 'arena', key, idx, val)}
                />
                ))}
            </CollapsibleSection>
        </div>
      </section>

      {/* Rule Engine Section */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-purple-500/30 transition-colors space-y-6">
        <div className="flex flex-col gap-1 mb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Cpu className="text-purple-500" size={20} />
                </div>
                Rule Engine
            </h2>
            <p className="text-zinc-500 text-sm ml-11">
                Logic matrix defining how attributes interact to create dynamic buffs/nerfs.
            </p>
        </div>

        <div className="space-y-6">
            {/* 1. Combat Rules */}
            <CollapsibleSection title="Combat Rules" icon={Swords} color="red" onAdd={() => handleAddRuleClick('Combat')}>
                <div className="space-y-4">
                    {Object.entries(combatVars).map(([key, data]) => {
                        const categoryRules = rules.filter(r => r.trigger.type === key || r.target.type === key)
                        if (categoryRules.length === 0) return null
                        
                        return (
                            <ExpandableRuleCategory 
                                key={key}
                                title={key}
                                icon={data.icon}
                                description={data.desc}
                                count={categoryRules.length}
                                color="red"
                                onAdd={() => handleAddRuleClick('Combat', key)}
                            >
                                <RuleTable rules={categoryRules} combatVars={combatVars} arenaVars={arenaVars} />
                            </ExpandableRuleCategory>
                        )
                    })}
                    {rules.filter(r => {
                        return Object.keys(combatVars).some(key => r.trigger.type === key || r.target.type === key)
                    }).length === 0 && (
                        <div className="text-center text-zinc-600 py-4 italic">No active combat rules.</div>
                    )}
                </div>
            </CollapsibleSection>

            {/* 2. Arena Rules */}
            <CollapsibleSection title="Arena Rules" icon={Mountain} color="blue" onAdd={() => handleAddRuleClick('Arena')}>
                <div className="space-y-4">
            {Object.entries(arenaVars).map(([key, data]) => {
                const categoryRules = rules.filter(r => r.trigger.type === key || r.target.type === key)
                if (categoryRules.length === 0) return null
                
                return (
                    <ExpandableRuleCategory 
                        key={key}
                        title={key}
                        icon={data.icon}
                        description={data.desc}
                        count={categoryRules.length}
                        color="blue"
                        onAdd={() => handleAddRuleClick('Arena', key)}
                    >
                        <RuleTable 
                            rules={categoryRules} 
                            combatVars={combatVars} 
                            arenaVars={arenaVars}
                            onRowContextMenu={(e, rule) => {
                                e.preventDefault()
                                setContextMenu({
                                    x: e.clientX,
                                    y: e.clientY,
                                    type: 'rule',
                                    ruleId: rule.id,
                                    value: rule
                                })
                            }}
                        />
                    </ExpandableRuleCategory>
                )
            })}
            {rules.filter(r => {
                return Object.keys(arenaVars).some(key => r.trigger.type === key || r.target.type === key)
            }).length === 0 && (
                <div className="text-center text-zinc-600 py-4 italic">No active arena rules.</div>
            )}
          </div>
            </CollapsibleSection>

            {/* 3. Fighter Rules */}
            <CollapsibleSection title="Fighter Rules" icon={User} color="green" onAdd={() => handleAddRuleClick('Fighter')}>
                <div className="space-y-4">
                    {rules.filter(r => r.trigger.type === 'Fighter' || r.target.type === 'Fighter').length === 0 && (
                        <div className="text-center text-zinc-600 py-4 italic">
                            No active fighter-specific rules.
                        </div>
                    )}
                    {rules.filter(r => r.trigger.type === 'Fighter' || r.target.type === 'Fighter').length > 0 && (
                        <RuleTable 
                            rules={rules.filter(r => r.trigger.type === 'Fighter' || r.target.type === 'Fighter')}
                            combatVars={combatVars}
                            arenaVars={arenaVars}
                            onRowContextMenu={(e, rule) => {
                                e.preventDefault()
                                setContextMenu({
                                    x: e.clientX,
                                    y: e.clientY,
                                    type: 'rule',
                                    ruleId: rule.id,
                                    value: rule
                                })
                            }}
                        />
                    )}
                </div>
            </CollapsibleSection>
        </div>
      </section>

      {/* Matrix Section */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-green-500/30 transition-colors space-y-6">
        <div className="flex flex-col gap-1 mb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Grid3X3 className="text-green-500" size={20} />
                </div>
                Matrix
            </h2>
            <p className="text-zinc-500 text-sm ml-11">
                Full overview of all active rules with cascading filters.
            </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
             {/* Relation Filter */}
             <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Relation</label>
                <CustomSelect 
                    value={matrixRelation}
                    onChange={(val) => {
                        setMatrixRelation(val as 'versus' | 'synergy' | '')
                    }}
                    options={[
                        { label: 'All Relations', value: '', icon: CircleDot },
                        { label: 'Versus', value: 'versus', icon: Swords },
                        { label: 'Synergy', value: 'synergy', icon: Handshake }
                    ]}
                    placeholder="Filter by Relation..."
                />
             </div>

             {/* Group Filter */}
             <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Group</label>
                <CustomSelect 
                    value={matrixGroup}
                    onChange={(val) => {
                        setMatrixGroup(val as 'Combat' | 'Arena' | '')
                        setMatrixCategory('')
                        setMatrixVariable('')
                    }}
                    options={[
                        { label: 'All Groups', value: '', icon: CircleDot },
                        { label: 'Combat', value: 'Combat', icon: Swords },
                        { label: 'Arena', value: 'Arena', icon: Mountain }
                    ]}
                    placeholder="Filter by Group..."
                />
             </div>

             {/* Category Filter */}
             <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Category</label>
                <CustomSelect 
                    value={matrixCategory}
                    onChange={(val) => {
                        setMatrixCategory(val)
                        setMatrixVariable('')
                    }}
                    disabled={!matrixGroup}
                    options={
                        matrixGroup 
                        ? Object.entries(matrixGroup === 'Combat' ? combatVars : arenaVars).map(([key, data]) => ({
                            label: key,
                            value: key,
                            icon: (data as any).icon
                        }))
                        : []
                    }
                    placeholder="Filter by Category..."
                />
             </div>

             {/* Variable Filter */}
             <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Variable</label>
                <CustomSelect 
                    value={matrixVariable}
                    onChange={(val) => setMatrixVariable(val)}
                    disabled={!matrixCategory}
                    options={
                        matrixCategory
                        /* @ts-ignore */
                        ? ((matrixGroup === 'Combat' ? combatVars : arenaVars)[matrixCategory]?.values || []).map((v: any) => ({
                            label: v.value,
                            value: v.value,
                            icon: v.icon,
                            description: v.description
                        }))
                        : []
                    }
                    placeholder="Filter by Variable..."
                />
             </div>
        </div>

        {/* Filtered Table */}
        <RuleTable 
            rules={rules.filter(r => {
                if (matrixRelation && r.relationType !== matrixRelation) return false;

                if (!matrixGroup) return true;
                
                const isCategoryInGroup = (category: string, group: 'Combat' | 'Arena') => {
                    const vars = group === 'Combat' ? combatVars : arenaVars;
                    return category in vars;
                }

                if (!matrixCategory) {
                    if (matrixGroup === 'Fighters') {
                        return r.trigger.type === 'Fighter' || r.target.type === 'Fighter';
                    }
                    const triggerInGroup = isCategoryInGroup(r.trigger.type, matrixGroup);
                    const targetInGroup = isCategoryInGroup(r.target.type, matrixGroup);
                    return triggerInGroup || targetInGroup;
                }

                if (!matrixVariable) {
                    if (matrixGroup === 'Fighters') {
                        const triggerMatchesCat = r.trigger.type === 'Fighter' && r.trigger.value === matrixCategory;
                        const targetMatchesCat = r.target.type === 'Fighter' && r.target.value === matrixCategory;
                        return triggerMatchesCat || targetMatchesCat;
                    }
                    const triggerMatchesCat = r.trigger.type === matrixCategory;
                    const targetMatchesCat = r.target.type === matrixCategory;
                    return triggerMatchesCat || targetMatchesCat;
                }

                const triggerMatchesVar = 
                    matrixGroup === 'Fighters'
                        ? (r.trigger.type === 'Fighter' && r.trigger.value === matrixCategory && r.effect.stat === matrixVariable)
                        : (r.trigger.type === matrixCategory && r.trigger.value === matrixVariable);
                const targetMatchesVar = 
                    matrixGroup === 'Fighters'
                        ? (r.target.type === 'Fighter' && r.target.value === matrixCategory && r.effect.stat === matrixVariable)
                        : (r.target.type === matrixCategory && r.target.value === matrixVariable);
                
                return triggerMatchesVar || targetMatchesVar;
            })} 
            combatVars={combatVars} 
            arenaVars={arenaVars} 
            onRowContextMenu={(e, rule) => {
                e.preventDefault()
                setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    type: 'rule',
                    ruleId: rule.id,
                    value: rule
                })
            }}
        />
      </section>

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-[60] bg-[#1a1a1a] border border-zinc-800 rounded-xl shadow-xl overflow-hidden min-w-[150px]"
          >
            <div className="p-1">
              <button 
                onClick={handleEdit}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors text-left"
              >
                <Edit size={14} />
                Edit
              </button>
              <button 
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors text-left"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteDialog && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={cancelVariableDelete}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Remover variável</h3>
                  <p className="text-xs text-zinc-400">
                    Isso vai remover <span className="font-semibold text-red-300">"{deleteDialog.label}"</span> de todas as regras,
                    arenas e fighters relacionados. Essa ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelVariableDelete}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmVariableDelete}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 transition-colors"
                >
                  Remover em tudo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Rule Modal */}
      <AnimatePresence>
        {ruleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-7xl bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 shrink-0">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${newRule.relationType === 'versus' ? 'bg-orange-500/20 text-orange-500' : 'bg-purple-500/20 text-purple-500'}`}>
                        {newRule.relationType === 'versus' ? <Swords size={24} /> : <Handshake size={24} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Create Interaction Rule</h3>
                        <p className="text-xs text-zinc-500">Define how variables affect combat dynamics</p>
                    </div>
                </div>
                <button onClick={() => setRuleModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Relation Toggle */}
                <div className="flex justify-center">
                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                        <button
                            onClick={() => setNewRule({...newRule, relationType: 'versus'})}
                            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${newRule.relationType === 'versus' ? 'bg-orange-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Swords size={16} />
                            VERSUS
                        </button>
                        <button
                            onClick={() => setNewRule({...newRule, relationType: 'synergy'})}
                            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${newRule.relationType === 'synergy' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Handshake size={16} />
                            SYNERGY
                        </button>
                    </div>
                </div>

                {/* Interaction Flow - Horizontal Layout */}
                <div className="flex flex-col xl:flex-row gap-4 items-stretch">
                    
                    {/* ORIGIN CARD */}
                    <div className={`flex-1 min-w-[280px] space-y-4 p-5 rounded-2xl border ${newRule.relationType === 'versus' ? 'bg-orange-500/5 border-orange-500/20' : 'bg-purple-500/5 border-purple-500/20'}`}>
                        <h4 className={`text-xs font-bold uppercase flex items-center gap-2 ${newRule.relationType === 'versus' ? 'text-orange-400' : 'text-purple-400'}`}>
                            <div className={`w-2 h-2 rounded-full ${newRule.relationType === 'versus' ? 'bg-orange-500' : 'bg-purple-500'}`}></div>
                            {newRule.relationType === 'versus' ? 'Trigger (Source)' : 'Teammate A (Trigger)'}
                        </h4>
                        
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Group</label>
                                    <CustomSelect 
                                        value={newRule.originGroup}
                                        onChange={(val) => {
                                            const group = val as 'Combat' | 'Arena' | 'Fighter'
                                            setNewRule({
                                              ...newRule,
                                              originGroup: group,
                                              originCategory: '',
                                              originVariable: ''
                                            })
                                        }}
                                        options={[
                                            { label: 'Combat', value: 'Combat', icon: Swords },
                                            { label: 'Arena', value: 'Arena', icon: Mountain },
                                            { label: 'Fighter', value: 'Fighter', icon: User }
                                        ]}
                                        placeholder="Group"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Category</label>
                                    <CustomSelect 
                                        value={newRule.originCategory}
                                        onChange={(val) => setNewRule({...newRule, originCategory: val, originVariable: ''})}
                                        options={
                                          newRule.originGroup === 'Fighter'
                                            ? groups.map((g) => ({
                                                label: g.name,
                                                value: g.id,
                                                icon: Building2
                                              }))
                                            : Object.entries(newRule.originGroup === 'Combat' ? combatVars : arenaVars).map(([key, data]) => ({
                                                label: key,
                                                value: key,
                                                icon: (data as any).icon
                                              }))
                                        }
                                        disabled={newRule.originGroup === 'Fighter' && groups.length === 0}
                                        placeholder={newRule.originGroup === 'Fighter' ? "Select Fighter Group..." : "Category"}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Variable</label>
                                <CustomSelect 
                                    value={newRule.originVariable}
                                    onChange={(val) => setNewRule({...newRule, originVariable: val})}
                                    disabled={
                                      !newRule.originCategory ||
                                      (newRule.originGroup === 'Fighter' && (groups.length === 0 || fighters.length === 0))
                                    }
                                    options={
                                        newRule.originGroup === 'Fighter'
                                          ? fighters
                                              .filter((f) => f.groupId && f.groupId === newRule.originCategory)
                                              .map((f) => ({
                                                label: f.name,
                                                value: f.name
                                              }))
                                          : (
                                              /* @ts-ignore */
                                              ((newRule.originGroup === 'Combat' ? combatVars : arenaVars)[newRule.originCategory]?.values || []).map((v: any) => ({
                                                label: v.value,
                                                value: v.value,
                                                icon: v.icon,
                                                description: v.description
                                              }))
                                            )
                                    }
                                    placeholder={
                                      newRule.originGroup === 'Fighter'
                                        ? (newRule.originCategory ? "Select Fighter..." : "Select Group first...")
                                        : "Select Variable..."
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* CONNECTOR ICON 1 */}
                    <div className="flex flex-col items-center justify-center text-zinc-600 self-center">
                        {newRule.relationType === 'versus' ? (
                            <ArrowRight size={24} />
                        ) : (
                            <ArrowLeftRight size={24} />
                        )}
                    </div>

                    {/* TARGET CARD */}
                    <div className="flex-1 min-w-[280px] space-y-4 p-5 rounded-2xl border bg-blue-500/5 border-blue-500/20">
                        <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            {newRule.relationType === 'versus' ? 'Target (Affected)' : 'Teammate B (Condition)'}
                        </h4>
                        
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Group</label>
                                    <CustomSelect 
                                        value={newRule.targetGroup}
                                        onChange={(val) => {
                                            const group = val as 'Combat' | 'Arena' | 'Fighter'
                                            setNewRule({
                                              ...newRule,
                                              targetGroup: group,
                                              targetCategory: '',
                                              targetVariable: ''
                                            })
                                        }}
                                        options={[
                                            { label: 'Combat', value: 'Combat', icon: Swords },
                                            { label: 'Arena', value: 'Arena', icon: Mountain },
                                            { label: 'Fighter', value: 'Fighter', icon: User }
                                        ]}
                                        placeholder="Group"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Category</label>
                                    <CustomSelect 
                                        value={newRule.targetCategory}
                                        onChange={(val) => setNewRule({...newRule, targetCategory: val, targetVariable: ''})}
                                        options={
                                          newRule.targetGroup === 'Fighter'
                                            ? groups.map((g) => ({
                                                label: g.name,
                                                value: g.id,
                                                icon: Building2
                                              }))
                                            : Object.entries(newRule.targetGroup === 'Combat' ? combatVars : arenaVars).map(([key, data]) => ({
                                                label: key,
                                                value: key,
                                                icon: (data as any).icon
                                              }))
                                        }
                                        disabled={newRule.targetGroup === 'Fighter' && groups.length === 0}
                                        placeholder={newRule.targetGroup === 'Fighter' ? "Select Fighter Group..." : "Category"}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Variable</label>
                                <CustomSelect 
                                    value={newRule.targetVariable}
                                    onChange={(val) => setNewRule({...newRule, targetVariable: val})}
                                    disabled={
                                      !newRule.targetCategory ||
                                      (newRule.targetGroup === 'Fighter' && (groups.length === 0 || fighters.length === 0))
                                    }
                                    options={
                                        newRule.targetGroup === 'Fighter'
                                          ? fighters
                                              .filter((f) => f.groupId && f.groupId === newRule.targetCategory)
                                              .map((f) => ({
                                                label: f.name,
                                                value: f.name
                                              }))
                                          : (
                                              /* @ts-ignore */
                                              ((newRule.targetGroup === 'Combat' ? combatVars : arenaVars)[newRule.targetCategory]?.values || []).map((v: any) => ({
                                                label: v.value,
                                                value: v.value,
                                                icon: v.icon,
                                                description: v.description
                                              }))
                                            )
                                    }
                                    placeholder={
                                      newRule.targetGroup === 'Fighter'
                                        ? (newRule.targetCategory ? "Select Fighter..." : "Select Group first...")
                                        : "Select Variable..."
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* CONNECTOR ICON 2 */}
                    <div className="flex flex-col items-center justify-center text-zinc-600 self-center">
                        <ArrowRight size={24} />
                    </div>

                    {/* Effect Section - Horizontal Layout */}
                    <div className="flex-1 min-w-[280px] space-y-4 p-5 rounded-2xl border bg-green-500/5 border-green-500/20">
                        <h4 className="text-xs font-bold text-green-400 uppercase flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            Effect Outcome
                        </h4>
                        
                        <div className="space-y-3">
                             <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Stat</label>
                                    <CustomSelect 
                                        value={newRule.statAffected}
                                        onChange={(val) => setNewRule({...newRule, statAffected: val})}
                                        options={[
                                            { label: 'Strength', value: 'STR', icon: Dumbbell },
                                            { label: 'Speed', value: 'SPD', icon: Zap },
                                            { label: 'Sp. Atk', value: 'SP. ATK', icon: Sparkles },
                                            { label: 'Health', value: 'HP', icon: Heart },
                                            { label: 'Overall', value: 'Overall', icon: Crown }
                                        ]}
                                        placeholder="Select..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Type</label>
                                    <CustomSelect 
                                        value={newRule.effectType}
                                        onChange={(val) => setNewRule({...newRule, effectType: val as 'percentage' | 'flat'})}
                                        options={[
                                            { label: 'Mult (%)', value: 'percentage', icon: Percent },
                                            { label: 'Flat (+/-)', value: 'flat', icon: Hash }
                                        ]}
                                        placeholder="Type"
                                    />
                                </div>
                            </div>
                            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Value</label>
                                <input 
                                    type="number"
                                    step={newRule.effectType === 'percentage' ? 0.05 : 1}
                                    value={newRule.effectValue}
                                    onChange={(e) => setNewRule({...newRule, effectValue: Number(e.target.value)})}
                                    className="w-full bg-transparent text-white text-sm font-bold outline-none"
                                    placeholder={newRule.effectType === 'percentage' ? "1.1" : "10"}
                                />
                            </div>
                        
                            <textarea 
                                value={newRule.description}
                                onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                                className="w-full min-h-[60px] bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 focus:border-green-500 outline-none resize-none placeholder:text-zinc-600"
                                placeholder="Flavor text..."
                            />
                        </div>
                    </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
                 <button 
                  onClick={handleSaveRule}
                  disabled={!newRule.originVariable || !newRule.targetVariable || !newRule.statAffected}
                  className={`w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg ${newRule.relationType === 'versus' ? 'bg-gradient-to-r from-orange-600 to-red-600 shadow-orange-900/20' : 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-purple-900/20'}`}
                 >
                   <Save size={20} />
                   CREATE {newRule.relationType === 'versus' ? 'VERSUS' : 'SYNERGY'} RULE
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Variable Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#1a1a1a] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Add New Variable</h3>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Variable Name</label>
                  <input 
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none transition-colors"
                    placeholder="e.g. New Option"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Description</label>
                  <textarea 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full min-h-[80px] bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none resize-none transition-colors"
                    placeholder="Brief description of what this variable does..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Icon</label>
                  
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                        placeholder="Search icons (e.g. 'sword', 'fire')..."
                    />
                  </div>

                  <div className="grid grid-cols-6 gap-2 max-h-[300px] overflow-y-auto p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                    {filteredIcons.map(iconName => {
                        const Icon = (LucideIcons as any)[iconName]
                        const isSelected = selectedIcon === iconName
                        
                        return (
                            <button
                                key={iconName}
                                onClick={() => setSelectedIcon(iconName)}
                                className={`aspect-square flex flex-col items-center justify-center p-2 rounded-lg transition-all ${isSelected ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                                title={iconName}
                            >
                                <Icon size={20} />
                            </button>
                        )
                    })}
                    {filteredIcons.length === 0 && (
                        <div className="col-span-6 text-center py-4 text-xs text-zinc-500">
                            No icons found
                        </div>
                    )}
                  </div>
                  {selectedIcon && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-orange-400">
                          <span className="font-bold">Selected:</span> {selectedIcon}
                      </div>
                  )}
                </div>

                <div className="pt-2">
                   <div className="text-xs text-yellow-500/80 mb-4 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                      Note: This will be added to <strong>{currentField?.field}</strong> in the current session.
                   </div>
                
                   <button 
                    onClick={handleSave}
                    disabled={!newValue.trim()}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                   >
                     <Save size={18} />
                     SAVE VARIABLE
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

function RuleTable({ rules, combatVars, arenaVars, onRowContextMenu }: { rules: any[], combatVars: any, arenaVars: any, onRowContextMenu?: (e: React.MouseEvent, rule: any) => void }) {
  return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-950 text-zinc-500 font-medium uppercase text-xs">
                  <tr>
                      <th className="px-4 py-3">Origin</th>
                      <th className="px-4 py-3 text-center">Relation</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Effect</th>
                      <th className="px-4 py-3">Description</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                  {rules.map((rule) => {
                      const isBuff = rule.effect.type === 'percentage' ? rule.effect.value >= 1 : rule.effect.value >= 0;
                      const displayValue = rule.effect.type === 'percentage' 
                          ? `${rule.effect.value >= 1 ? '+' : ''}${Math.round((rule.effect.value - 1) * 100)}%`
                          : `${rule.effect.value >= 0 ? '+' : ''}${rule.effect.value}`;
                      
                      const getVarInfo = (type: string, value: string) => {
                          // Normalize type keys
                          const normalizedType = {
                              'CombatClass': 'Combat Class',
                              'Source': 'Power Source',
                              'Tag': 'Combat Tags'
                          }[type] || type;

                          // Try Combat Vars
                          const combatVar = combatVars[normalizedType];
                          if (combatVar) {
                              const specificItem = combatVar.values.find((v: any) => v.value === value);
                              return {
                                  category: normalizedType,
                                  icon: specificItem?.icon || combatVar.icon,
                                  style: {
                                      color: 'text-red-400',
                                      bg: 'bg-red-500/10',
                                      border: 'border-red-500/20'
                                  }
                              }
                          }

                          // Try Arena Vars
                          const arenaVar = arenaVars[normalizedType];
                          if (arenaVar) {
                              const specificItem = arenaVar.values.find((v: any) => v.value === value);
                              return {
                                  category: normalizedType,
                                  icon: specificItem?.icon || arenaVar.icon,
                                  style: {
                                      color: 'text-blue-400',
                                      bg: 'bg-blue-500/10',
                                      border: 'border-blue-500/20'
                                  }
                              }
                          }

                          // Fallback
                          return {
                              category: type,
                              icon: CircleDot,
                              style: {
                                  color: 'text-zinc-400',
                                  bg: 'bg-zinc-800',
                                  border: 'border-zinc-700'
                              }
                          }
                      }

                      const triggerInfo = getVarInfo(rule.trigger.type, rule.trigger.value)
                      const targetInfo = getVarInfo(rule.target.type, rule.target.value)

                      return (
                          <tr 
                            key={rule.id} 
                            className="hover:bg-white/5 transition-colors cursor-context-menu"
                            onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, rule)}
                          >
                              <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider pl-1">
                                          {triggerInfo.category}
                                      </span>
                                      <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border w-fit ${triggerInfo.style.bg} ${triggerInfo.style.border}`}>
                                          <triggerInfo.icon size={14} className={triggerInfo.style.color} />
                                          <span className={`font-medium text-sm ${triggerInfo.style.color}`}>{rule.trigger.value}</span>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-4 py-3 text-center text-zinc-600 align-middle">
                                  {rule.id.includes('synergy') ? (
                                      <div title="Afeta Ambos" className="flex justify-center">
                                          <ArrowLeftRight size={18} />
                                      </div>
                                  ) : (
                                      <div title="Afeta o Alvo" className="flex justify-center">
                                          <ArrowRight size={18} />
                                      </div>
                                  )}
                              </td>
                              <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider pl-1">
                                          {targetInfo.category}
                                      </span>
                                      <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border w-fit ${targetInfo.style.bg} ${targetInfo.style.border}`}>
                                          <targetInfo.icon size={14} className={targetInfo.style.color} />
                                          <span className={`font-medium text-sm ${targetInfo.style.color}`}>{rule.target.value}</span>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                  <div className="flex items-center gap-2">
                                      <span className={`text-xs font-bold ${isBuff ? 'text-green-400' : 'text-red-400'}`}>
                                          {rule.effect.stat}
                                      </span>
                                      <span className="text-zinc-300">
                                          {displayValue}
                                      </span>
                                  </div>
                              </td>
                              <td className="px-4 py-3 text-zinc-500 italic align-middle">
                                  {rule.description}
                              </td>
                          </tr>
                      )
                  })}
              </tbody>
          </table>
      </div>
  )
}

function ExpandableRuleCategory({ title, icon: Icon, description, count, color, children, onAdd }: { title: string, icon: any, description: string, count: number, color: 'red' | 'blue', children: React.ReactNode, onAdd?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [allowOverflow, setAllowOverflow] = useState(false)

  const colorClasses = {
    red: {
      border: isOpen ? 'border-red-500/50' : 'border-zinc-800',
      bg: isOpen ? 'bg-zinc-900' : 'bg-zinc-900/30',
      text: 'text-red-400',
      iconBg: 'bg-red-500/10'
    },
    blue: {
      border: isOpen ? 'border-blue-500/50' : 'border-zinc-800',
      bg: isOpen ? 'bg-zinc-900' : 'bg-zinc-900/30',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/10'
    }
  }[color]

  return (
    <div className={`rounded-xl border transition-all duration-300 ${colorClasses.border} ${colorClasses.bg}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${colorClasses.iconBg} ${colorClasses.text}`}>
            <Icon size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-zinc-200 flex items-center gap-2">
                {title}
                <span className="text-zinc-600 text-xs font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                    {count}
                </span>
            </h3>
            <p className="text-xs text-zinc-500">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onAdd && (
            <div 
                role="button"
                onClick={(e) => {
                    e.stopPropagation()
                    onAdd()
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Add new rule"
            >
                <Plus size={18} />
            </div>
          )}
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="text-zinc-500" size={20} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onAnimationStart={() => setAllowOverflow(false)}
            onAnimationComplete={() => {
              if (isOpen) setAllowOverflow(true)
            }}
            className={allowOverflow ? 'overflow-visible' : 'overflow-hidden'}
          >
            <div className="p-4 pt-0 border-t border-zinc-800/50">
              <div className="mt-4">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ExpandableField({ title, data, color, onAdd, onItemContextMenu }: { title: string, data: any, color: 'red' | 'blue' | 'yellow', onAdd: () => void, onItemContextMenu: (e: React.MouseEvent, index: number, value: any) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [allowOverflow, setAllowOverflow] = useState(false)
  const Icon = data.icon

  const colorClasses = {
    red: {
      border: isOpen ? 'border-red-500/50' : 'border-zinc-800',
      bg: isOpen ? 'bg-zinc-900' : 'bg-zinc-900/30',
      text: 'text-red-400',
      iconBg: 'bg-red-500/10'
    },
    blue: {
      border: isOpen ? 'border-blue-500/50' : 'border-zinc-800',
      bg: isOpen ? 'bg-zinc-900' : 'bg-zinc-900/30',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/10'
    },
    yellow: {
      border: isOpen ? 'border-yellow-500/50' : 'border-zinc-800',
      bg: isOpen ? 'bg-zinc-900' : 'bg-zinc-900/30',
      text: 'text-yellow-400',
      iconBg: 'bg-yellow-500/10'
    }
  }[color]

  return (
    <div className={`rounded-xl border transition-all duration-300 ${colorClasses.border} ${colorClasses.bg}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${colorClasses.iconBg} ${colorClasses.text}`}>
            <Icon size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-zinc-200">{title}</h3>
            <p className="text-xs text-zinc-500">{data.desc}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div 
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              onAdd()
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Add new variable"
          >
            <Plus size={18} />
          </div>
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="text-zinc-500" size={20} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onAnimationStart={() => setAllowOverflow(false)}
            onAnimationComplete={() => {
              if (isOpen) setAllowOverflow(true)
            }}
            className={allowOverflow ? 'overflow-visible' : 'overflow-hidden'}
          >
            <div className="p-4 pt-0 border-t border-zinc-800/50">
              <div className="mt-4 flex flex-wrap gap-2">
                {data.values.map((val: any, idx: number) => {
                  const isObj = typeof val === 'object' && val !== null
                  const display = isObj ? val.value : val
                  const tooltip = isObj ? val.description : undefined
                  const Icon = isObj && val.icon ? val.icon : null

                  return (
                    <div key={display} className="relative group">
                      <span 
                        onContextMenu={(e) => onItemContextMenu(e, idx, val)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-950 text-zinc-300 border border-zinc-800 ${tooltip ? 'cursor-help hover:bg-zinc-800 hover:text-white transition-colors' : ''} hover:border-orange-500/50 transition-all`}
                      >
                        {Icon && <Icon size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />}
                        {display}
                      </span>
                      
                      {tooltip && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[250px] z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="bg-black/90 backdrop-blur-sm text-white text-[10px] px-3 py-2 rounded-lg border border-zinc-700 shadow-xl text-center">
                            {tooltip}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-zinc-700" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CollapsibleSection({ title, icon: Icon, color, children, onAdd }: { title: string, icon: any, color: 'red' | 'blue' | 'yellow' | 'green', children: React.ReactNode, onAdd?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  const colorClasses = {
    red: { bg: 'bg-red-500/10', text: 'text-red-500' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500' }
  }[color]

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="flex-1 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 ${colorClasses.bg} rounded-lg transition-colors group-hover:bg-opacity-80`}>
              <Icon className={colorClasses.text} size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white group-hover:text-zinc-300 transition-colors">{title}</h2>
          </div>
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} p-2 rounded-full group-hover:bg-white/5`}>
            <ChevronDown className="text-zinc-500 group-hover:text-white transition-colors" size={24} />
          </div>
        </button>
        
        {onAdd && (
          <div 
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              onAdd()
            }}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors border border-zinc-700"
            title="Add new rule"
          >
            <Plus size={20} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-4 pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
