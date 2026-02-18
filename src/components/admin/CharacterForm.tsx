'use client'

import React, { useState, useEffect } from 'react'
import ImageCropper from './ImageCropper'
import { CharacterCard } from '@/components/CharacterCard'
import CustomSelect from '@/components/ui/CustomSelect'
import { motion } from 'framer-motion'
import { Character, CharacterStats, Group, EnvironmentType, CombatClass, MovementType, SizeType, SourceType, CompositionType, Skill, GenderType } from '@/types'
import * as LucideIcons from 'lucide-react'
import { Plus, Trash2, Save, AlertCircle, FileJson, X, Copy, Loader2, Maximize2, Ruler, Weight, Info, Zap, Wind, Mountain, Swords, Shield, Activity, Brain, Flame, Droplets, ArrowLeft, Users, Mars, Venus, Ban, Trophy, Crosshair, ChevronDown, ChevronUp, Heart, Dumbbell, Eye, Clipboard, Check, RotateCcw, Sparkles, Sun, CircleDot, Handshake, ArrowRight, ArrowLeftRight, Percent, Hash, Crown } from 'lucide-react'
import { CANON_SCALE_OPTIONS, COMBAT_CLASSES_DATA, MOVEMENT_DATA, COMPOSITION_DATA, SOURCE_DATA, ELEMENT_DATA, SKILL_TAGS, SKILL_TAGS_DATA } from '@/constants'
import { getStatTier, calculateRank, getRankColor, RankType } from '@/utils/statTiers'
import { generateCharacterPrompt } from '@/utils/aiPrompt'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CharacterFormProps {
  characterId?: string
  userMode?: boolean
  userGroup?: string
  initialGroupId?: string
  onSaveCustom?: (data: Partial<Character>) => Promise<void>
  onCancel?: () => void
}

const CharacterForm = ({ characterId, userMode, userGroup, initialGroupId, onSaveCustom, onCancel }: CharacterFormProps) => {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(!userMode)
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rankDistribution, setRankDistribution] = useState<Record<RankType, number>>({} as any)
  const [totalFighters, setTotalFighters] = useState(0)
  const [expandedStats, setExpandedStats] = useState<Record<string, boolean>>({
    hp: true, str: true, def: true, sta: true, 
    sp_atk: true, int: true, spd: true, atk_spd: true
  })
  const [expandedSkills, setExpandedSkills] = useState<{ main: boolean; secondary: boolean }>({ 
    main: false, secondary: false 
  })

  // Initial State
  const [formData, setFormData] = useState<Partial<Character>>({
    name: '',
    alias: '',
    description: '',
    groupId: userMode ? 'USER_GROUP_PLACEHOLDER' : '', // Placeholder, logic handled in save
    specs: {
      height: 175,
      weight: 70,
      race: 'Human',
      gender: 'Male'
    },
    stages: [
      {
        stage: 'Base',
        image: '',
        stats: {
          hp: 500, str: 500, def: 500, sta: 500, sp_atk: 500, int: 500, spd: 500, atk_spd: 500,
          justifications: { hp: '', str: '', def: '', sta: '', sp_atk: '', int: '', spd: '', atk_spd: '' }
        },
        combat: {
          mainSkill: { name: '', description: '', tags: [] },
          secondarySkill: { name: '', description: '', tags: [] }
        },
        tags: {
          combatClass: ['Assault'],
          movement: ['Terrestrial'],
          composition: 'Organic',
          size: 'Medium',
          source: ['Biological'],
          element: ['Aether'],
        }
      }
    ]
  })

  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  
  // JSON Paste State
  const [pasteStatus, setPasteStatus] = useState<'idle' | 'validating' | 'ready_to_apply' | 'error'>('idle')
  const [pendingJson, setPendingJson] = useState<Partial<Character> | null>(null)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [systemVars, setSystemVars] = useState<any>(null)
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [pendingThumb, setPendingThumb] = useState<string | null>(null)
  const [missingVars, setMissingVars] = useState<Record<string, string[]>>({})
  const [addVarOpen, setAddVarOpen] = useState(false)
  const [addVarCategory, setAddVarCategory] = useState<string>('')
  const [addVarValue, setAddVarValue] = useState<string>('')
  const [addVarLabel, setAddVarLabel] = useState<string>('')
  const [addVarDesc, setAddVarDesc] = useState<string>('')
  const [addVarIcon, setAddVarIcon] = useState<string>('')
  const [iconSearch, setIconSearch] = useState('')
  const [addVarSaving, setAddVarSaving] = useState(false)
  const [charRule, setCharRule] = useState({
    relationType: 'versus' as 'versus' | 'synergy',
    targetCategory: '',
    targetVariable: '',
    statAffected: '',
    effectType: 'percentage' as 'percentage' | 'flat',
    effectValue: 0,
    description: ''
  })
  const [charRuleSaving, setCharRuleSaving] = useState(false)

  const processIcon = (iconName: any) => {
    if (!iconName) return CircleDot
    if (typeof iconName !== 'string') return iconName
    return (LucideIcons as any)[iconName] || CircleDot
  }

  // Derived options (Dynamic or Static Fallback)
  const combatClasses = systemVars?.combatClasses || COMBAT_CLASSES_DATA
  const movements = systemVars?.movements || MOVEMENT_DATA
  const compositions = systemVars?.compositions || COMPOSITION_DATA
  const sources = systemVars?.sources || SOURCE_DATA
  const elements = systemVars?.elements || ELEMENT_DATA
  const skillTags = systemVars?.skillTags || SKILL_TAGS_DATA
  const systemRaces = (systemVars?.races?.map((r: any) => r.value) || []).sort((a: string, b: string) => a.localeCompare(b))

  const normalizeSource = (value: string | undefined) => {
    if (!value) return 'Biological'
    if (value === 'Bio') return 'Biological'
    return value
  }

  const normalizeElement = (value: string | undefined) => {
    if (!value) return 'Aether'
    if (value === 'Neutral') return 'Aether'
    return value
  }

  const allIcons = React.useMemo(() => {
    return Object.keys(LucideIcons)
      .filter(key => isNaN(Number(key)) && key !== 'createLucideIcon' && key !== 'default' && /^[A-Z]/.test(key))
      .sort()
  }, [])

  const filteredIcons = React.useMemo(() => {
    if (!iconSearch) {
      const curated = [
        'Swords','Shield','Flame','Zap','Wind','Mountain','Droplets','Skull','Star','Sparkles',
        'Heart','Brain','Dumbbell','Snowflake','Sun','Moon','Orbit','Radio','Anchor','Biohazard',
        'Cpu','Atom','FlaskConical','TreePine','Tent','Landmark','CloudRain','CloudLightning','CloudFog',
        'Volume2','Triangle','Target','Wrench','Radiation'
      ]
      return curated.filter(icon => allIcons.includes(icon))
    }
    return allIcons.filter(name => name.toLowerCase().includes(iconSearch.toLowerCase())).slice(0, 100)
  }, [allIcons, iconSearch])

  // Fetch Data
  useEffect(() => {
    fetch('/api/system-vars').then(res => res.json()).then(data => {
        if (!data) return
        
        // Hydrate icons
        const hydrated: any = {}
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                hydrated[key] = data[key].map((item: any) => ({
                    ...item,
                    icon: processIcon(item.icon)
                }))
            }
        })
        setSystemVars(hydrated)
    }).catch(console.error)

    fetch('/api/groups').then(res => res.json()).then(data => {
      setGroups(data)
      setIsLoadingGroups(false)
    }).catch(() => setIsLoadingGroups(false))

    // Fetch all characters for Rank Distribution
    fetch('/api/characters').then(res => res.json()).then((data: any[]) => {
       const dist: Record<string, number> = {}
       let count = 0
       data.forEach(char => {
          if (char.stages && char.stages[0]?.stats) {
             const stats = char.stages[0].stats
             const total = (stats.hp || 0) + (stats.str || 0) + (stats.def || 0) + (stats.sta || 0) + 
                           (stats.sp_atk || 0) + (stats.int || 0) + (stats.spd || 0) + (stats.atk_spd || 0)
             const rank = calculateRank(total)
             dist[rank] = (dist[rank] || 0) + 1
             count++
          }
       })
       setRankDistribution(dist as any)
       setTotalFighters(count)
    })

    if (characterId) {
      fetch(`/api/characters?id=${characterId}`).then(res => res.json()).then(data => {
        const found = Array.isArray(data) ? data.find((c: any) => c.id === characterId) : data
        if (found) {
            // Ensure deep merge/structure for new fields if editing old data
            found.stages = found.stages.map((s: any) => ({
                ...s,
                combat: {
                    ...s.combat,
                    mainSkill: typeof s.combat.mainSkill === 'string' 
                        ? { name: s.combat.mainSkill, description: '', tags: [] }
                        : s.combat.mainSkill || { name: '', description: '', tags: [] },
                    secondarySkill: s.combat.secondarySkill || { name: '', description: '', tags: [] }
                },
                tags: {
                    ...s.tags,
                    combatClass: Array.isArray(s.tags.combatClass) ? s.tags.combatClass : [s.tags.combatClass || 'Assault'],
                    movement: Array.isArray(s.tags.movement) ? s.tags.movement : [s.tags.movement || 'Terrestrial'],
                    source: Array.isArray(s.tags.source) ? s.tags.source.map((v: string) => normalizeSource(v)) : [normalizeSource(s.tags.source)],
                    element: Array.isArray(s.tags.element) ? s.tags.element.map((v: string) => normalizeElement(v)) : [normalizeElement(s.tags.element)],
                }
            }))
            setFormData(found)
        }
      })
    }
  }, [characterId])

  useEffect(() => {
    if (!userMode && !characterId && initialGroupId) {
      setFormData(prev => ({
        ...prev,
        groupId: prev.groupId || initialGroupId
      }))
    }
  }, [userMode, characterId, initialGroupId])

  const refreshSystemVars = async () => {
    try {
      const res = await fetch('/api/system-vars')
      const data = await res.json()
      if (!data) return
      const hydrated: any = {}
      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
          hydrated[key] = data[key].map((item: any) => ({
            ...item,
            icon: processIcon(item.icon)
          }))
        } else {
          hydrated[key] = data[key]
        }
      })
      setSystemVars(hydrated)
    } catch {}
  }

  const computeMissing = () => {
    const toSet = (arr: any[]) => new Set(arr.map((x: any) => (typeof x === 'string' ? x : x.value)))
    const vars = systemVars || {}
    const setCombat = toSet(vars.combatClasses || COMBAT_CLASSES_DATA)
    const setMove = toSet(vars.movements || MOVEMENT_DATA)
    const setComp = toSet(vars.compositions || COMPOSITION_DATA)
    const setSource = toSet(vars.sources || SOURCE_DATA)
    const setElem = toSet(vars.elements || ELEMENT_DATA)
    const setSkill = toSet(vars.skillTags || SKILL_TAGS_DATA)
    const setRace = new Set((vars.races || []).map((r: any) => r.value))
    const stage = formData.stages?.[currentStageIndex]
    const miss: Record<string, string[]> = {}
    const cc = (stage?.tags?.combatClass || []).filter((v: string) => !setCombat.has(v))
    if (cc.length) miss.combatClasses = cc
    const mv = (stage?.tags?.movement || []).filter((v: string) => !setMove.has(v))
    if (mv.length) miss.movements = mv
    const comp = stage?.tags?.composition
    if (comp && !setComp.has(comp)) miss.compositions = [comp]
    const src = (stage?.tags?.source || []).map(normalizeSource).filter((v: string) => !setSource.has(v))
    if (src.length) miss.sources = src
    const elem = (stage?.tags?.element || []).map(normalizeElement).filter((v: string) => !setElem.has(v))
    if (elem.length) miss.elements = elem
    const ms = (stage?.combat?.mainSkill?.tags || []).filter((v: string) => !setSkill.has(v))
    if (ms.length) miss.skillTagsMain = ms
    const ss = (stage?.combat?.secondarySkill?.tags || []).filter((v: string) => !setSkill.has(v))
    if (ss.length) miss.skillTagsSecondary = ss
    const raceVal = currentStageIndex === 0 ? formData.specs?.race : (stage as any)?.race
    if (raceVal && !setRace.has(raceVal)) miss.races = [raceVal]
    setMissingVars(miss)
  }

  useEffect(() => {
    computeMissing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemVars, formData, currentStageIndex])

  const openAddVar = (category: string, value: string) => {
    setAddVarCategory(category)
    setAddVarValue(value)
    setAddVarLabel(value)
    setAddVarDesc('')
    setAddVarIcon('')
    setAddVarOpen(true)
  }

  const removeMissing = (category: string, value: string) => {
    if (category === 'combatClasses' || category === 'movements' || category === 'sources' || category === 'elements') {
      const field = category === 'combatClasses' ? 'combatClass' : category === 'movements' ? 'movement' : category === 'sources' ? 'source' : 'element'
      const newStages = [...(formData.stages || [])]
      const tagsObj: any = newStages[currentStageIndex].tags as any
      const arr = tagsObj[field] || []
      tagsObj[field] = arr.filter((v: string) => v !== value)
      setFormData(prev => ({ ...prev, stages: newStages }))
    } else if (category === 'compositions') {
      const newStages = [...(formData.stages || [])]
      newStages[currentStageIndex].tags.composition = 'Organic'
      setFormData(prev => ({ ...prev, stages: newStages }))
    } else if (category === 'skillTagsMain' || category === 'skillTagsSecondary') {
      const newStages = [...(formData.stages || [])]
      const key = category === 'skillTagsMain' ? 'mainSkill' : 'secondarySkill'
      const arr = newStages[currentStageIndex].combat[key]?.tags || []
      newStages[currentStageIndex].combat[key] = {
        ...(newStages[currentStageIndex].combat[key] || { name: '', description: '', tags: [] }),
        tags: arr.filter((v: string) => v !== value)
      }
      setFormData(prev => ({ ...prev, stages: newStages }))
    } else if (category === 'races') {
      if (currentStageIndex === 0) {
        handleSpecChange('race', '')
      } else {
        handleStageFieldChange('race', '')
      }
    }
    computeMissing()
  }

  const saveAddVariable = async () => {
    if (!addVarCategory || !addVarValue) return
    try {
      setAddVarSaving(true)
      const res = await fetch('/api/system-vars')
      const raw = await res.json()
      const arr = Array.isArray(raw[addVarCategory]) ? raw[addVarCategory] : []
      const exists = arr.some((x: any) => (x.value || x.label) === addVarValue)
      if (!exists) {
        arr.push({
          value: addVarValue,
          label: addVarLabel || addVarValue,
          description: addVarDesc || '',
          icon: addVarIcon || ''
        })
        raw[addVarCategory] = arr
        await fetch('/api/system-vars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(raw)
        })
        await refreshSystemVars()
        computeMissing()
      }
      setAddVarOpen(false)
    } catch {
      setAddVarOpen(false)
    } finally {
      setAddVarSaving(false)
    }
  }

  // --- Handlers ---

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSpecChange = (field: string, value: any) => {
    setFormData(prev => {
        const newSpecs = { ...prev.specs!, [field]: value };
        let newStages = [...(prev.stages || [])];

        // Auto Size Logic
        if (field === 'height') {
            const h = parseInt(value);
            let size: SizeType = 'Medium';
            if (h < 100) size = 'Tiny';
            else if (h < 150) size = 'Small';
            else if (h < 220) size = 'Medium';
            else if (h < 500) size = 'Large';
            else if (h < 2000) size = 'Giant';
            else size = 'Colossal';

            // Update current stage size
            newStages = newStages.map(s => ({
                ...s,
                tags: { ...s.tags, size }
            }));
        }

        return { ...prev, specs: newSpecs, stages: newStages };
    })
  }

  const handleStageFieldChange = (field: string, value: string) => {
      const newStages = [...(formData.stages || [])]
      // @ts-ignore
      newStages[currentStageIndex][field] = value
      setFormData(prev => ({ ...prev, stages: newStages }))
  }

  const handleStatChange = (stat: keyof CharacterStats, value: number) => {
    const newStages = [...(formData.stages || [])]
    // @ts-ignore
    newStages[currentStageIndex].stats[stat] = value
    setFormData(prev => ({ ...prev, stages: newStages }))
  }

  const handleStatJustificationChange = (stat: string, value: string) => {
    const newStages = [...(formData.stages || [])]
    newStages[currentStageIndex].stats.justifications = {
      ...(newStages[currentStageIndex].stats.justifications || {}),
      [stat]: value
    }
    setFormData(prev => ({ ...prev, stages: newStages }))
  }

  const handleTagChange = (field: string, value: any) => {
    const newStages = [...(formData.stages || [])]
    // @ts-ignore
    newStages[currentStageIndex].tags[field] = value
    setFormData(prev => ({ ...prev, stages: newStages }))
  }


  const handleSkillChange = (skillType: 'mainSkill' | 'secondarySkill', field: keyof Skill, value: any) => {
    const newStages = [...(formData.stages || [])]
    const currentSkill = newStages[currentStageIndex].combat[skillType] || { name: '', description: '', tags: [] };
    
    newStages[currentStageIndex].combat[skillType] = {
        ...currentSkill,
        [field]: value
    }
    setFormData(prev => ({ ...prev, stages: newStages }))
  }

  const handleSaveCharacterRule = async () => {
    if (!formData.name) return
    if (!charRule.targetCategory || !charRule.targetVariable || !charRule.statAffected || !charRule.effectValue) return
    try {
      setCharRuleSaving(true)
      const payload = {
        name: `fighter_${charRule.relationType || 'versus'}_${formData.name}_${charRule.targetVariable}`,
        trigger: {
          type: 'Fighter',
          value: formData.name
        },
        target: {
          type: charRule.targetCategory,
          value: charRule.targetVariable
        },
        effect: {
          stat: charRule.statAffected,
          type: charRule.effectType,
          value: Number(charRule.effectValue)
        },
        description: charRule.description || '',
        active: true,
        version: 1
      }
      const res = await fetch('/api/modifier-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        console.error('Failed to save character rule', await res.json().catch(() => null))
        alert('Failed to save character modifier rule. Check console for details.')
        return
      }
      await res.json()
      setCharRule(prev => ({
        ...prev,
        targetVariable: '',
        statAffected: '',
        effectValue: 0,
        description: ''
      }))
    } catch (error) {
      console.error('Error saving character modifier rule', error)
      alert('Error saving character modifier rule. Check console for details.')
    } finally {
      setCharRuleSaving(false)
    }
  }

  const handleImageCropped = async (croppedImage: string) => {
    if (croppedImage === '') {
      setFormData(prev => {
        const newStages = [...(prev.stages || [])]
        const idx = currentStageIndex
        if (newStages[idx]) {
          newStages[idx] = { ...newStages[idx], image: '', thumbnail: '' }
        }
        return { ...prev, stages: newStages }
      })
      setPendingImage(null)
      setPendingThumb(null)
      setShowLayoutModal(false)
      return
    }
    setPendingImage(croppedImage)
    const thumb = await (async () => {
      const img = new Image()
      img.src = croppedImage
      await new Promise(resolve => {
        if (img.complete) resolve(null)
        else img.onload = () => resolve(null)
      })
      const canvas = document.createElement('canvas')
      const size = 256
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, size, size)
        return canvas.toDataURL('image/jpeg', 0.6)
      }
      return croppedImage
    })()
    setPendingThumb(thumb)
    setShowLayoutModal(true)
  }

  const handleAddStage = () => {
    const baseStage = formData.stages![0]
    setFormData(prev => ({
        ...prev,
        stages: [
            ...(prev.stages || []),
            {
                ...baseStage,
                stage: `Form ${prev.stages!.length + 1}`,
                image: '', // Reset image for new form
                // Keep stats/tags as base for easier editing
            }
        ]
    }))
    setCurrentStageIndex((formData.stages?.length || 0))
  }

  const handleRemoveStage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if ((formData.stages?.length || 0) <= 1) return
    
    const newStages = formData.stages!.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, stages: newStages }))
    
    if (currentStageIndex >= index && currentStageIndex > 0) {
        setCurrentStageIndex(currentStageIndex - 1)
    }
  }

  const handleCopyPrompt = async () => {
    const prompt = generateCharacterPrompt(systemVars)
    
    try {
        await navigator.clipboard.writeText(prompt)
        setCopyFeedback(true)
        setTimeout(() => setCopyFeedback(false), 2000)
    } catch (err) {
        console.warn('Clipboard API failed, trying fallback...', err)
        try {
            const textArea = document.createElement("textarea")
            textArea.value = prompt
            
            // Ensure element is part of document but hidden visually
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            textArea.style.top = "0"
            document.body.appendChild(textArea)
            
            textArea.focus()
            textArea.select()
            
            const successful = document.execCommand('copy')
            document.body.removeChild(textArea)
            
            if (successful) {
                setCopyFeedback(true)
                setTimeout(() => setCopyFeedback(false), 2000)
            } else {
                 console.error('Fallback copy failed.')
            }
        } catch (fallbackErr) {
            console.error('All copy methods failed:', fallbackErr)
        }
    }
  }

  const handlePasteJson = async () => {
    if (pasteStatus === 'idle' || pasteStatus === 'error') {
       try {
           setPasteStatus('validating')
           const text = await navigator.clipboard.readText()
           const json = JSON.parse(text)
           
           // Check if it's a Single Stage or Full Character
           const isSingleStage = json.stage && json.stats && json.combat
           
           // Basic Validation
           if (!isSingleStage && (!json.name || !json.stages || !Array.isArray(json.stages))) {
               throw new Error("Invalid structure")
           }
           
           let parsedData = isSingleStage ? { stages: [json] } : json

           // Fix nesting: If tags are inside combat, move them to root tags
           // @ts-ignore
           parsedData.stages = parsedData.stages.map((s: any) => {
              const tags = s.tags || s.combat?.tags || {
                  combatClass: ['Assault'],
                  movement: ['Terrestrial'],
                  composition: 'Organic',
                  size: 'Medium',
                  source: ['Bio'],
                  element: ['Neutral'],
              }

              // Fix Stats: If stats are at root but not in stage, move them to stage
              const stats = s.stats || json.stats || {
                  hp: 0, str: 0, def: 0, sta: 0, sp_atk: 0, int: 0, spd: 0, atk_spd: 0,
                  justifications: {}
              }

              return {
                 ...s,
                 stats,
                 tags: {
                     combatClass: Array.isArray(tags.combatClass) ? tags.combatClass : [tags.combatClass],
                     movement: Array.isArray(tags.movement) ? tags.movement : [tags.movement],
                     source: Array.isArray(tags.source) ? tags.source : [tags.source],
                     element: Array.isArray(tags.element) ? tags.element : [tags.element],
                     composition: tags.composition,
                     size: tags.size
                 },
                 combat: {
                     ...s.combat,
                     tags: undefined // Remove from combat to avoid confusion
                 }
              }
           })

           setPendingJson(parsedData)
           
           // Simulate loading for better UX
           setTimeout(() => {
             setPasteStatus('ready_to_apply')
           }, 500)
           
       } catch (e) {
           console.error(e)
           setPasteStatus('error')
       }
    } else if (pasteStatus === 'ready_to_apply') {
        if (pendingJson) {
            const isAppend = formData.name && formData.name.trim().length > 0
            
            setFormData(prev => {
                if (isAppend) {
                    // Append mode: Keep existing data, add new stages
                    return {
                        ...prev,
                        stages: [
                            ...(prev.stages || []),
                            ...(pendingJson.stages || [])
                        ]
                    }
                } else {
                    // Replace mode: New character
                    return {
                        ...prev, // Keep defaults if needed
                        ...pendingJson,
                        stages: pendingJson.stages
                    }
                }
            })

            // If appending, switch to the first new stage
            if (isAppend) {
                setCurrentStageIndex((formData.stages?.length || 0))
            } else {
                setCurrentStageIndex(0)
            }
            
            setPasteStatus('idle')
            setPendingJson(null)
        }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSubmitError(null)

    // User Mode Custom Save
    if (userMode && onSaveCustom) {
      try {
        await onSaveCustom(formData)
        // onSaveCustom handles success actions (like closing modal/redirect)
      } catch (error: any) {
        console.error(error)
        alert('Error creating fighter: ' + (error.message || error))
      } finally {
        setIsLoading(false)
      }
      return
    }

    try {
      const res = await fetch('/api/characters', {
        method: characterId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        router.push('/admin/fighters')
      } else {
        let message = 'Error saving character'
        try {
          const data = await res.json()
          if (data?.error) message = data.error
        } catch (_) {}
        setSubmitError(message)
      }
    } catch (error: any) {
      console.error(error)
      const message = error?.message || 'Unexpected error saving character'
      setSubmitError(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Constants
  const COMBAT_CLASSES = combatClasses
    .map((c: any) => ({
      label: c.value,
      value: c.value,
      description: c.description,
      icon: c.icon
    }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))

  const MOVEMENT_TYPES = movements
    .map((c: any) => ({
      label: c.value,
      value: c.value,
      description: c.description,
      icon: c.icon
    }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))

  const COMPOSITION_TYPES = compositions
    .map((c: any) => ({
      label: c.value,
      value: c.value,
      description: c.description,
      icon: c.icon
    }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))

  const SOURCE_TYPES = sources
    .map((c: any) => ({
      label: c.value,
      value: c.value,
      description: c.description,
      icon: c.icon
    }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))
  
  const ELEMENTS = elements
    .map((c: any) => ({
      label: c.value,
      value: c.value,
      description: c.description,
      icon: c.value === 'Sunny' ? Sun : c.icon
    }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))

  const SKILL_TAG_OPTIONS = skillTags
    .map((c: any) => ({
      label: c.value,
      value: c.value,
      description: c.description,
      icon: c.icon
    }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))

  const STAT_FIELDS = [
    { key: 'hp', label: 'HP (Health)', icon: Heart },
    { key: 'str', label: 'STR (Strength)', icon: Dumbbell },
    { key: 'def', label: 'DEF (Defense)', icon: Shield },
    { key: 'sta', label: 'STA (Stamina)', icon: Zap },
    { key: 'sp_atk', label: 'SP. ATK (Power)', icon: Flame },
    { key: 'int', label: 'INT (Strategy)', icon: Brain },
    { key: 'spd', label: 'SPD (Travel Speed)', icon: Wind },
    { key: 'atk_spd', label: 'ATK. SPD (Reflexes)', icon: Eye },
  ]

  const RACE_OPTIONS = systemRaces.map((r: string) => ({
    label: r,
    value: r
  }))

  const MODIFIER_TARGET_CATEGORIES = [
    { value: 'CombatClass', label: 'Combat Class', icon: Swords },
    { value: 'Movement', label: 'Movement', icon: Wind },
    { value: 'Composition', label: 'Composition', icon: CircleDot },
    { value: 'Source', label: 'Source', icon: Flame },
    { value: 'Element', label: 'Element', icon: Droplets },
    { value: 'Race', label: 'Race', icon: Users }
  ]

  const getTargetVariableOptions = () => {
    switch (charRule.targetCategory) {
      case 'CombatClass':
        return COMBAT_CLASSES
      case 'Movement':
        return MOVEMENT_TYPES
      case 'Composition':
        return COMPOSITION_TYPES
      case 'Source':
        return SOURCE_TYPES
      case 'Element':
        return ELEMENTS
      case 'Race':
        return RACE_OPTIONS
      default:
        return []
    }
  }

  const currentStage = formData.stages![currentStageIndex]
  
  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-8 pb-32">
      {submitError && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-200 flex items-start gap-3">
          <AlertCircle className="mt-0.5 text-red-400" size={18} />
          <div>
            <div className="font-semibold tracking-wide uppercase text-[11px] text-red-300">
              Error saving character
            </div>
            <div className="text-xs text-red-200/80 mt-1">
              {submitError}
            </div>
          </div>
        </div>
      )}
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => userMode && onCancel ? onCancel() : router.push('/admin/fighters')}
            className="group p-3 -ml-3 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={32} className="text-zinc-500 group-hover:text-white transition-colors" />
          </button>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 uppercase">
              {characterId ? (
                <>EDIT <span className="text-orange-500">{formData.name || 'FIGHTER'}</span></>
              ) : (
                <>NEW <span className="text-orange-500">FIGHTER</span></>
              )}
            </h1>
            <p className="text-zinc-500 font-medium">Configure character stats, visuals, and combat capabilities.</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          {/* Prompt Button */}
          <button
            type="button"
            onClick={handleCopyPrompt}
            className={`
              flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all
              ${copyFeedback 
                 ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                 : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'}
            `}
          >
            {copyFeedback ? <Check size={16} /> : <Copy size={16} />}
            {copyFeedback ? 'Copied!' : 'Prompt'}
          </button>
          
          {/* Paste JSON Button */}
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
            type="submit"
            disabled={isLoading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-900/20 text-sm font-black italic tracking-wider uppercase disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Save Fighter
          </button>
        </div>
      </div>

      {/* Stage Tabs Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 relative z-30 pointer-events-none">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto py-4 no-scrollbar flex-1 w-full sm:w-auto pointer-events-auto">
               {formData.stages?.map((stage, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setCurrentStageIndex(idx)}
                    className={`
                      relative px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 flex-shrink-0
                      ${currentStageIndex === idx 
                        ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                        : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}
                    `}
                  >
                     {stage.stage}
                     {formData.stages!.length > 1 && (
                        <button 
                           onClick={(e) => handleRemoveStage(idx, e)}
                           className="hover:text-red-500 transition-colors p-0.5 ml-1"
                        >
                           <X size={14} />
                        </button>
                     )}
                  </div>
               ))}
               <button 
                 type="button"
                 onClick={handleAddStage}
                 className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors flex-shrink-0"
               >
                 <Plus size={16} />
               </button>
          </div>

          {/* AI Tools Buttons Removed (Moved to Header) */}
      </div>

      {/* --- DASHBOARD GRID --- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-1 w-full relative z-20">
        
        {/* === LEFT COLUMN: IDENTITY (Span 2) === */}
        <div className="xl:col-span-2 flex flex-col gap-6 relative z-20">
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-6 relative z-20">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Info className="text-blue-400" /> Identity
            </h2>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Image & Physical Attributes */}
              <div className="w-full md:w-1/3 flex flex-col gap-4 relative z-10 overflow-visible">
                <div className="flex flex-col gap-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase">Character Image</label>
                  <div className="aspect-square w-full">
                    <ImageCropper 
                      key={currentStageIndex}
                      onImageCropped={handleImageCropped} 
                      initialImage={currentStage.image}
                    />
                  </div>
                </div>

                {/* Fields under Image */}
                <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-zinc-800/50">
                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Users size={12}/> Gender</label>
                    <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl p-1 flex items-center relative">
                      {[
                        { value: 'Male', icon: Mars, color: 'text-blue-400' },
                        { value: 'Female', icon: Venus, color: 'text-pink-400' },
                        { value: 'Both', icon: Users, color: 'text-purple-400' },
                        { value: 'None', icon: Ban, color: 'text-zinc-500' }
                      ].map((option) => {
                        const isSelected = (formData.specs?.gender || 'Male') === option.value;
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSpecChange('gender', option.value)}
                            className={`flex-1 h-full flex items-center justify-center relative z-10 rounded-lg transition-colors duration-200 ${isSelected ? option.color : 'text-zinc-600 hover:text-zinc-400'}`}
                            title={option.value}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="gender-selection"
                                className="absolute inset-0 bg-zinc-800 rounded-lg shadow-sm border border-zinc-700/50"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                            <Icon size={18} className="relative z-20" strokeWidth={2.5} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Composition */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Composition</label>
                    <CustomSelect
                      options={COMPOSITION_TYPES}
                      value={currentStage.tags.composition}
                      onChange={v => handleTagChange('composition', v)}
                    />
                    {!!missingVars.compositions?.length && (
                      <div className="mt-2">
                        <div className="text-[10px] text-red-300 font-bold uppercase tracking-wide">Unregistered value</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {missingVars.compositions.map((val) => (
                            <div
                              key={`comp-${val}`}
                              className="flex items-center gap-1 bg-red-950/80 border border-red-500/70 rounded-full pl-3 pr-1 py-1"
                            >
                              <span className="text-[10px] text-red-100">{val}</span>
                              <button
                                type="button"
                                onClick={() => openAddVar('compositions', val)}
                                className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-[10px] text-white"
                                title="Add to system variables"
                              >
                                <Plus size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMissing('compositions', val)}
                                className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/80 hover:bg-red-700 text-[10px] text-red-200"
                                title="Remove from this fighter"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Fields */}
              <div className="w-full md:w-2/3 flex flex-col gap-4 relative z-10 overflow-visible">
                {/* Basic Info */}
                <div className="flex gap-4">
                  <div className="flex-[2]">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                      {currentStageIndex === 0 ? 'Name' : 'Name (Override)'}
                    </label>
                    <input 
                      value={currentStageIndex === 0 ? (formData.name || '') : (currentStage.name ?? '')}
                      onChange={e => {
                        if (currentStageIndex === 0) handleInputChange('name', e.target.value)
                        else handleStageFieldChange('name', e.target.value)
                      }}
                      className={`w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-blue-500 outline-none hover:border-gray-600 transition-colors relative z-20 !pointer-events-auto !select-text ${currentStageIndex > 0 && !currentStage.name ? 'border-dashed border-zinc-700' : ''}`}
                      placeholder={currentStageIndex === 0 ? "Character Name" : (formData.name || "Inherit from Base")} 
                      required={currentStageIndex === 0}
                    />
                  </div>
                  <div className="flex-[1]">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Form Name</label>
                    <input 
                      value={currentStage.stage || ''} onChange={e => handleStageFieldChange('stage', e.target.value)}
                      className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-blue-500 outline-none hover:border-gray-600 transition-colors relative z-20 !pointer-events-auto !select-text"
                      placeholder="e.g. Base" required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                    {currentStageIndex === 0 ? 'Alias' : 'Alias (Override)'}
                  </label>
                  <input 
                    value={currentStageIndex === 0 ? (formData.alias || '') : (currentStage.alias ?? '')}
                    onChange={e => {
                      if (currentStageIndex === 0) handleInputChange('alias', e.target.value)
                      else handleStageFieldChange('alias', e.target.value)
                    }}
                    className={`w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-blue-500 outline-none hover:border-gray-600 transition-colors relative z-20 !pointer-events-auto !select-text ${currentStageIndex > 0 && !currentStage.alias ? 'border-dashed border-zinc-700' : ''}`}
                    placeholder={currentStageIndex === 0 ? "e.g. The Strongest" : (formData.alias || "Inherit from Base")}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Group</label>
                    {userMode ? (
                      <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-zinc-400 flex items-center cursor-not-allowed">
                        {userGroup || 'Default Group'}
                      </div>
                    ) : (
                      <CustomSelect
                        options={groups.map(g => ({ label: g.name, value: g.id }))}
                        value={formData.groupId || ''}
                        onChange={v => handleInputChange('groupId', v)}
                        placeholder="Select Group"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                      {currentStageIndex === 0 ? 'Race' : 'Race (Override)'}
                    </label>
                    <CustomSelect
                      options={systemRaces.length > 0 ? systemRaces : ['Alien', 'Android', 'Angel', 'Cyborg', 'Deity', 'Demon', 'Human', 'Mutant', 'Unknown']}
                      value={currentStageIndex === 0 ? (formData.specs?.race || 'Human') : (currentStage.race ?? '')}
                      onChange={v => {
                        if (currentStageIndex === 0) handleSpecChange('race', v)
                        else handleStageFieldChange('race', v)
                      }}
                      placeholder={currentStageIndex === 0 ? "Select Race" : (formData.specs?.race || "Inherit from Base")}
                    />
                    {!!missingVars.races?.length && (
                      <div className="mt-2">
                        <div className="text-[10px] text-red-300 font-bold uppercase tracking-wide">Unregistered value</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {missingVars.races.map((val) => (
                            <div
                              key={`race-${val}`}
                              className="flex items-center gap-1 bg-red-950/80 border border-red-500/70 rounded-full pl-3 pr-1 py-1"
                            >
                              <span className="text-[10px] text-red-100">{val}</span>
                              <button
                                type="button"
                                onClick={() => openAddVar('races', val)}
                                className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-[10px] text-white"
                                title="Add to system variables"
                              >
                                <Plus size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMissing('races', val)}
                                className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/80 hover:bg-red-700 text-[10px] text-red-200"
                                title="Remove from this fighter"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Ruler size={12}/> Height (cm)</label>
                    <input 
                      type="number"
                      value={formData.specs?.height || ''} onChange={e => handleSpecChange('height', e.target.value)}
                      className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-blue-500 outline-none hover:border-gray-600 transition-colors relative z-20 !pointer-events-auto !select-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Weight size={12}/> Weight (kg)</label>
                    <input 
                      type="number"
                      value={formData.specs?.weight || ''} onChange={e => handleSpecChange('weight', e.target.value)}
                      className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-blue-500 outline-none hover:border-gray-600 transition-colors relative z-20 !pointer-events-auto !select-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1"><Maximize2 size={12}/> Size (Auto)</label>
                    <div className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-zinc-400 font-mono text-xs flex items-center justify-center truncate hover:border-gray-600 transition-colors">
                      {currentStage.tags.size}
                    </div>
                  </div>
                </div>

                {/* Lore - Expanded height */}
                <div className="flex-1 flex flex-col">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                    {currentStageIndex === 0 ? 'Lore' : 'Lore (Override)'}
                  </label>
                  <textarea 
                    value={currentStageIndex === 0 ? (formData.description || '') : (currentStage.description ?? '')}
                    onChange={e => {
                      if (currentStageIndex === 0) handleInputChange('description', e.target.value)
                      else handleStageFieldChange('description', e.target.value)
                    }}
                    className={`w-full flex-1 min-h-[100px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none text-sm hover:border-gray-600 transition-colors relative z-20 !pointer-events-auto !select-text ${currentStageIndex > 0 && !currentStage.description ? 'border-dashed border-zinc-700' : ''}`}
                    placeholder={currentStageIndex === 0 ? "Character backstory..." : (formData.description || "Inherit from Base")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RANK + RADAR (Span 1) */}
        <div className="xl:col-span-1 flex flex-col gap-6">
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 flex-1 min-h-[200px] flex flex-col">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2 mb-4">
                <Trophy className="text-yellow-400" /> Rank Analysis
              </h2>
              
              <div className="flex-1 flex flex-row items-center gap-6">
                 {/* Left Side: Rank Letter */}
                 {(() => {
                     if (!currentStage?.stats) return null
                     const totalStats = Object.entries(currentStage.stats)
                         .filter(([key]) => STAT_FIELDS.some(f => f.key === key))
                         .reduce((sum, [_, val]) => sum + (val as number), 0)
                     
                     const currentRank = calculateRank(totalStats)
                     const rankCount = rankDistribution[currentRank] || 0
                     const displayCount = rankCount
                     const percentage = totalFighters > 0 ? (displayCount / totalFighters) * 100 : 100
                     const dashArray = 2 * Math.PI * 45 // radius 45
                     const dashOffset = dashArray - (dashArray * percentage) / 100
                     const color = getRankColor(currentRank)

                     return (
                         <>
                            <div className="flex-1 flex flex-col items-center justify-center border-r border-zinc-800 pr-6">
                                <span className="text-7xl font-black italic" style={{ color }}>{currentRank}</span>
                                <span className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-2 mb-4">RANK</span>
                                
                                <div className="bg-black/30 rounded-lg px-3 py-1.5 border border-zinc-800 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Power</span>
                                    <span className="text-xl font-mono font-bold text-white">{totalStats}</span>
                                </div>
                            </div>

                            {/* Right Side: Graph & Text */}
                            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                {/* Small Donut Chart */}
                                <div className="relative w-24 h-24">
                                     <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                         {/* Background Circle */}
                                         <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="10" />
                                         {/* Progress Circle */}
                                         <circle 
                                             cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="10" 
                                             strokeDasharray={dashArray}
                                             strokeDashoffset={dashOffset}
                                             strokeLinecap="round"
                                             className="transition-all duration-1000 ease-out"
                                         />
                                     </svg>
                                </div>
                                
                                {/* Message */}
                                <div className="text-left w-full">
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        <span className="text-white font-bold">{formData.name || 'Unknown'}</span> is in the top tier of the roster, matching <span className="text-white font-bold">{displayCount}</span> other fighters in this category.
                                    </p>
                                </div>
                            </div>
                         </>
                     )
                 })()}
              </div>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 flex-1 min-h-[200px] flex flex-col">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2 mb-4">
                  <Crosshair className="text-cyan-400" /> Radar
                </h2>
                
                <div className="flex-1 flex items-center justify-center p-2">
                   {(() => {
                       if (!currentStage?.stats) return null
                       const size = 180
                       const center = size / 2
                       const radius = (size / 2) - 10
                       const totalStats = Object.entries(currentStage.stats)
                           .filter(([key]) => STAT_FIELDS.some(f => f.key === key))
                           .reduce((sum, [_, val]) => sum + (val as number), 0)
                       const currentRank = calculateRank(totalStats)
                       const color = getRankColor(currentRank)

                       // 8 axes for 8 stats
                       const angleStep = (Math.PI * 2) / 8
                       const statsOrder = ['hp', 'str', 'def', 'sta', 'spd', 'atk_spd', 'int', 'sp_atk']
                       const statsLabels = {
                           hp: 'HP', str: 'STR', def: 'DEF', sta: 'STA',
                           spd: 'SPD', atk_spd: 'ASP', int: 'INT', sp_atk: 'SPA'
                       }
                       
                       const getPoint = (value: number, index: number, max: number = 2000) => {
                           const angle = index * angleStep - Math.PI / 2 // Start from top
                           const r = (value / max) * radius
                           return {
                               x: center + Math.cos(angle) * r,
                               y: center + Math.sin(angle) * r,
                               angle // Return angle for label positioning
                           }
                       }

                       // Calculate points for the polygon
                       const points = statsOrder.map((statKey, i) => {
                           const val = currentStage.stats[statKey as keyof CharacterStats] as number
                           const { x, y } = getPoint(val, i)
                           return `${x},${y}`
                       }).join(' ')

                       // Generate grid lines (25%, 50%, 75%, 100%)
                       const gridLevels = [0.25, 0.5, 0.75, 1]

                       return (
                           <div className="relative" style={{ width: size, height: size }}>
                               <svg width={size} height={size} className="overflow-visible">
                                   {/* Grid Background */}
                                   {gridLevels.map((level, lvlIdx) => (
                                       <polygon
                                           key={lvlIdx}
                                           points={statsOrder.map((_, i) => {
                                               const { x, y } = getPoint(2000 * level, i)
                                               return `${x},${y}`
                                           }).join(' ')}
                                           fill="none"
                                           stroke="#333"
                                           strokeWidth="1"
                                           className="opacity-50"
                                       />
                                   ))}

                                   {/* Axes Lines */}
                                   {statsOrder.map((_, i) => {
                                       const { x, y } = getPoint(2000, i)
                                       return (
                                           <line
                                               key={i}
                                               x1={center} y1={center}
                                               x2={x} y2={y}
                                               stroke="#333"
                                               strokeWidth="1"
                                               className="opacity-50"
                                           />
                                       )
                                   })}

                                   {/* Labels */}
                                   {statsOrder.map((statKey, i) => {
                                       // Position labels slightly outside the max radius
                                       const { x, y, angle } = getPoint(2350, i) // Push out further (2000 -> 2350)
                                       
                                      // Adjust text anchor based on horizontal position
                                      let textAnchor: 'start' | 'middle' | 'end' = 'middle'
                                      if (Math.cos(angle) > 0.1) textAnchor = 'start'
                                      else if (Math.cos(angle) < -0.1) textAnchor = 'end'
                                      
                                      // Adjust baseline based on vertical position
                                      let dominantBaseline: 'auto' | 'middle' | 'hanging' = 'middle'
                                      if (Math.sin(angle) > 0.1) dominantBaseline = 'hanging'
                                      else if (Math.sin(angle) < -0.1) dominantBaseline = 'auto'

                                       return (
                                           <text
                                               key={`label-${i}`}
                                               x={x} y={y}
                                               fill="#71717a" // zinc-500
                                               fontSize="10"
                                               fontWeight="bold"
                                               textAnchor={textAnchor}
                                               dominantBaseline={dominantBaseline}
                                               className="uppercase tracking-wider"
                                           >
                                               {statsLabels[statKey as keyof typeof statsLabels]}
                                           </text>
                                       )
                                   })}

                                   {/* Data Polygon */}
                                   <polygon
                                       points={points}
                                       fill={color}
                                       fillOpacity="0.2"
                                       stroke={color}
                                       strokeWidth="2"
                                       className="transition-all duration-500 ease-out"
                                   />
                                   
                                   {/* Data Points */}
                                   {statsOrder.map((statKey, i) => {
                                       const val = currentStage.stats[statKey as keyof CharacterStats] as number
                                       const { x, y } = getPoint(val, i)
                                       return (
                                           <circle
                                               key={i}
                                               cx={x} cy={y}
                                               r="3"
                                               fill={color}
                                               className="transition-all duration-500 ease-out"
                                           />
                                       )
                                   })}
                               </svg>
                           </div>
                       )
                   })()}
                </div>
            </div>
        </div>

        {/* === CENTER COLUMN: STATS ENGINE === */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-6 h-full">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Activity className="text-yellow-400" /> Stats Engine
            </h2>
            
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-x-6 gap-y-6">
               {STAT_FIELDS.map(stat => {
                  const currentValue = currentStage.stats?.[stat.key as keyof CharacterStats] as number || 0;
                  const tierInfo = getStatTier(stat.key, currentValue);
                  const isExpanded = expandedStats[stat.key];
                  const accentColor = tierInfo.color.replace('text-', 'accent-')
                  const Icon = stat.icon

                  return (
                    <div key={stat.key} className={`bg-black/30 p-4 rounded-xl border ${tierInfo.border} border-opacity-60 hover:border-opacity-100 transition-all`}>
                       <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-bold text-zinc-300 uppercase flex items-center gap-2">
                             <Icon size={16} className={tierInfo.color} />
                             {stat.label}
                          </label>
                          <div className="flex items-center gap-3">
                             <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${tierInfo.color} border-current bg-black/50`}>
                                {tierInfo.label}
                             </div>
                             <span className={`w-12 text-right font-mono font-bold text-lg ${tierInfo.color}`}>
                                {currentValue}
                             </span>
                             <button
                                type="button"
                                onClick={() => setExpandedStats(prev => ({ ...prev, [stat.key]: !prev[stat.key] }))}
                                className={`p-1 rounded-lg transition-colors ${isExpanded ? `bg-zinc-800 ${tierInfo.color}` : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                             >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                             </button>
                          </div>
                       </div>
                       
                       <input 
                         type="range" min="0" max="2000" step="10"
                         value={currentValue}
                         onChange={e => handleStatChange(stat.key as keyof CharacterStats, parseInt(e.target.value))}
                         className={`w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer ${accentColor} mb-2`}
                       />
                       
                       <p className={`text-[10px] ${tierInfo.color} mb-3 font-medium opacity-80 h-4 overflow-hidden`}>
                          {tierInfo.description}
                       </p>
                       
                       {isExpanded && (
                           <textarea 
                             value={currentStage.stats?.justifications?.[stat.key as keyof typeof currentStage.stats.justifications] || ''}
                             onChange={e => handleStatJustificationChange(stat.key, e.target.value)}
                             className="w-full min-h-[100px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none text-sm hover:border-gray-600 transition-colors animate-in fade-in slide-in-from-top-2 duration-200"
                             placeholder={`Justify this ${tierInfo.label} level...`}
                           />
                       )}
                    </div>
                  );
               })}
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN: COMBAT & TRAITS === */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* Combat Details */}
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-6">
             <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
               <Swords className="text-red-400" /> Combat Profile
             </h2>

             <div className="grid grid-cols-2 gap-4">
                {/* Combat Class */}
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Combat Class</label>
                   <CustomSelect
                      options={COMBAT_CLASSES}
                      value={currentStage.tags.combatClass}
                      onChange={v => handleTagChange('combatClass', v)}
                      multi
                   />
                   {!!missingVars.combatClasses?.length && (
                     <div className="mt-2">
                       <div className="text-[10px] text-red-300 font-bold uppercase tracking-wide">Unregistered values</div>
                       <div className="flex flex-wrap gap-2 mt-1">
                         {missingVars.combatClasses.map((val) => (
                           <div
                             key={`cc-${val}`}
                             className="flex items-center gap-1 bg-red-950/80 border border-red-500/70 rounded-full pl-3 pr-1 py-1"
                           >
                             <span className="text-[10px] text-red-100">{val}</span>
                             <button
                               type="button"
                               onClick={() => openAddVar('combatClasses', val)}
                               className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-[10px] text-white"
                               title="Add to system variables"
                             >
                               <Plus size={10} />
                             </button>
                             <button
                               type="button"
                               onClick={() => removeMissing('combatClasses', val)}
                               className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/80 hover:bg-red-700 text-[10px] text-red-200"
                               title="Remove from this fighter"
                             >
                               <X size={10} />
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                </div>

                {/* Movement */}
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Movement</label>
                   <CustomSelect
                      options={MOVEMENT_TYPES}
                      value={currentStage.tags.movement}
                      onChange={v => handleTagChange('movement', v)}
                      multi
                   />
                  {!!missingVars.movements?.length && (
                    <div className="mt-2">
                      <div className="text-[10px] text-red-300 font-bold uppercase tracking-wide">Unregistered values</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {missingVars.movements.map((val) => (
                          <div
                            key={`mv-${val}`}
                            className="flex items-center gap-1 bg-red-950/80 border border-red-500/70 rounded-full pl-3 pr-1 py-1"
                          >
                            <span className="text-[10px] text-red-100">{val}</span>
                            <button
                              type="button"
                              onClick={() => openAddVar('movements', val)}
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-[10px] text-white"
                              title="Add to system variables"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMissing('movements', val)}
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/80 hover:bg-red-700 text-[10px] text-red-200"
                              title="Remove from this fighter"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
             </div>

             {/* Skills */}
             <div className="space-y-4 pt-2">
                {(['mainSkill', 'secondarySkill'] as const).map((skillKey) => {
                   const skill = currentStage.combat[skillKey] || { name: '', description: '', tags: [] };
                   const isMain = skillKey === 'mainSkill';
                   const label = isMain ? 'Main Skill' : 'Secondary Skill';
                   const defaultColor = isMain ? 'text-blue-400' : 'text-purple-400';
                   
                   // Scaling Logic
                   const scalingStat = skill.scalingStat;
                   const statValue = scalingStat ? (currentStage.stats[scalingStat as keyof CharacterStats] as number) : 0;
                   const tierInfo = scalingStat ? getStatTier(scalingStat, statValue) : null;
                   
                   const borderColor = tierInfo ? tierInfo.border : (isMain ? 'border-blue-500/30' : 'border-purple-500/30');
                   const titleColor = tierInfo ? tierInfo.color : defaultColor;
                   
                   const isExpanded = isMain ? expandedSkills.main : expandedSkills.secondary;
                   const toggleExpand = () => setExpandedSkills(prev => ({ 
                      ...prev, 
                      [isMain ? 'main' : 'secondary']: !prev[isMain ? 'main' : 'secondary'] 
                   }));
              
                   return (
                      <div key={skillKey} className={`bg-black/30 p-4 rounded-xl border ${borderColor} border-opacity-60 hover:border-opacity-100 transition-all`}>
                         <div className="flex justify-between items-center cursor-pointer" onClick={toggleExpand}>
                            <h3 className={`text-xs font-bold ${titleColor} uppercase flex items-center gap-2`}>
                               {label}
                               {tierInfo && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] border ${tierInfo.color} border-current bg-black/50`}>
                                     {tierInfo.label}
                                  </span>
                               )}
                            </h3>
                            <div className="flex items-center gap-2">
                               {scalingStat && (
                                  <div className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-1 bg-zinc-900/50 px-2 py-1 rounded">
                                     SCALES WITH {scalingStat}
                                  </div>
                               )}
                               <button type="button" className={`text-zinc-500 hover:text-white transition-colors`}>
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                               </button>
                            </div>
                         </div>
              
                         {isExpanded && (
                            <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                               {/* Scaling Stat Selector */}
                               <div>
                                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Scaling Stat (Power Source)</label>
                                  <div className="grid grid-cols-4 gap-2">
                                     {STAT_FIELDS.map(stat => {
                                        const Icon = stat.icon;
                                        const isSelected = scalingStat === stat.key;
                                        const statTier = getStatTier(stat.key, currentStage.stats[stat.key as keyof CharacterStats] as number);
                                        
                                        return (
                                           <button
                                              key={stat.key}
                                              type="button"
                                              onClick={() => handleSkillChange(skillKey, 'scalingStat', stat.key === scalingStat ? undefined : stat.key)}
                                              className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${isSelected ? `bg-zinc-800 ${statTier.border} text-white` : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}
                                              title={stat.label}
                                           >
                                              <Icon size={14} className={`mb-1 ${isSelected ? statTier.color : ''}`} />
                                              <span className="text-[9px] font-bold uppercase">{stat.key}</span>
                                           </button>
                                        )
                                     })}
                                  </div>
                               </div>
              
                               <div className="space-y-3">
                                  <div>
                                     <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Name</label>
                                     <input 
                                        value={skill.name || ''}
                                        onChange={e => handleSkillChange(skillKey, 'name', e.target.value)}
                                        placeholder="Skill Name"
                                        className="w-full h-[50px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-blue-500 outline-none hover:border-gray-600 transition-colors relative z-20 !pointer-events-auto !select-text"
                                     />
                                  </div>

                                  <div>
                                     <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Effect / Description</label>
                                     <textarea 
                                        value={skill.description || ''}
                                        onChange={e => handleSkillChange(skillKey, 'description', e.target.value)}
                                        placeholder="Description..."
                                        className="w-full min-h-[100px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none text-sm hover:border-gray-600 transition-colors relative z-20 !pointer-events-auto !select-text"
                                     />
                                  </div>

                                  <div>
                                     <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Combat Tags</label>
                                     <CustomSelect 
                                        options={SKILL_TAG_OPTIONS}
                                        value={skill.tags}
                                        onChange={v => handleSkillChange(skillKey, 'tags', v)}
                                        multi
                                        placeholder="Tags..."
                                     />
                     {(isMain ? missingVars.skillTagsMain : missingVars.skillTagsSecondary)?.length ? (
                       <div className="mt-2">
                         <div className="text-[10px] text-red-300 font-bold uppercase tracking-wide">Unregistered values</div>
                         <div className="flex flex-wrap gap-2 mt-1">
                           {((isMain ? missingVars.skillTagsMain : missingVars.skillTagsSecondary) || []).map((val) => (
                             <div
                               key={`${isMain ? 'ms' : 'ss'}-${val}`}
                               className="flex items-center gap-1 bg-red-950/80 border border-red-500/70 rounded-full pl-3 pr-1 py-1"
                             >
                               <span className="text-[10px] text-red-100">{val}</span>
                               <button
                                 type="button"
                                 onClick={() => openAddVar('skillTags', val)}
                                 className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-[10px] text-white"
                                 title="Add to system variables"
                               >
                                 <Plus size={10} />
                               </button>
                               <button
                                 type="button"
                                 onClick={() => removeMissing(isMain ? 'skillTagsMain' : 'skillTagsSecondary', val)}
                                 className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/80 hover:bg-red-700 text-[10px] text-red-200"
                                 title="Remove from this fighter"
                               >
                                 <X size={10} />
                               </button>
                             </div>
                           ))}
                         </div>
                       </div>
                     ) : null}
                                  </div>
                               </div>
                            </div>
                         )}
                      </div>
                   )
                })}
             </div>
          </div>

          {/* Affinities (Source & Element) */}
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-6 flex-1">
             <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
               <Sparkles className="text-amber-400" /> Affinity
             </h2>
             
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Source</label>
                   <CustomSelect 
                      options={SOURCE_TYPES} value={currentStage.tags.source}
                      onChange={v => handleTagChange('source', v)}
                      multi
                   />
                  {!!missingVars.sources?.length && (
                    <div className="mt-2">
                      <div className="text-[10px] text-red-300 font-bold uppercase tracking-wide">Unregistered values</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {missingVars.sources.map((val) => (
                          <div
                            key={`src-${val}`}
                            className="flex items-center gap-1 bg-red-950/80 border border-red-500/70 rounded-full pl-3 pr-1 py-1"
                          >
                            <span className="text-[10px] text-red-100">{val}</span>
                            <button
                              type="button"
                              onClick={() => openAddVar('sources', val)}
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-[10px] text-white"
                              title="Add to system variables"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMissing('sources', val)}
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/80 hover:bg-red-700 text-[10px] text-red-200"
                              title="Remove from this fighter"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Element</label>
                   <CustomSelect 
                      options={ELEMENTS} value={currentStage.tags.element}
                      onChange={v => handleTagChange('element', v)}
                      multi
                   />
                  {!!missingVars.elements?.length && (
                    <div className="mt-2">
                      <div className="text-[10px] text-red-300 font-bold uppercase tracking-wide">Unregistered values</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {missingVars.elements.map((val) => (
                          <div
                            key={`el-${val}`}
                            className="flex items-center gap-1 bg-red-950/80 border border-red-500/70 rounded-full pl-3 pr-1 py-1"
                          >
                            <span className="text-[10px] text-red-100">{val}</span>
                            <button
                              type="button"
                              onClick={() => openAddVar('elements', val)}
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-[10px] text-white"
                              title="Add to system variables"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMissing('elements', val)}
                              className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/80 hover:bg-red-700 text-[10px] text-red-200"
                              title="Remove from this fighter"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
          

        </div>
      </div>

      {/* Character Modifiers */}
      <div className="mt-10 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Swords className="text-orange-400" />
                Character Modifiers
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Optional rules that directly reference this fighter as the trigger source.
              </p>
            </div>
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setCharRule(prev => ({ ...prev, relationType: 'versus' }))}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                  charRule.relationType === 'versus'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Swords size={14} />
                VERSUS
              </button>
              <button
                type="button"
                onClick={() => setCharRule(prev => ({ ...prev, relationType: 'synergy' }))}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                  charRule.relationType === 'synergy'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Handshake size={14} />
                SYNERGY
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="flex flex-col xl:flex-row gap-4 items-stretch min-w-[840px]">
              {/* Trigger card */}
              <div className="flex-1 min-w-[280px] space-y-4 p-5 rounded-2xl border bg-orange-500/5 border-orange-500/20">
                <h4 className="text-xs font-bold uppercase flex items-center gap-2 text-orange-400">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  Trigger (Source)
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Group</label>
                      <div className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs">
                        <span className="flex items-center gap-2 truncate">
                          <Users size={14} />
                          Fighter
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Variable</label>
                      <div className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs">
                        <span className="flex items-center gap-2 truncate text-zinc-300">
                          {formData.name || 'This Fighter'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector */}
              <div className="flex flex-col items-center justify-center text-zinc-600 self-center">
                {charRule.relationType === 'versus' ? <ArrowRight size={24} /> : <ArrowLeftRight size={24} />}
              </div>

              {/* Target card */}
              <div className="flex-1 min-w-[280px] space-y-4 p-5 rounded-2xl border bg-blue-500/5 border-blue-500/20">
                <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Target (Affected)
                </h4>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Category</label>
                      <CustomSelect
                        value={charRule.targetCategory}
                        onChange={val => setCharRule(prev => ({ ...prev, targetCategory: val, targetVariable: '' }))}
                        options={MODIFIER_TARGET_CATEGORIES}
                        placeholder="Category"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Variable</label>
                      <CustomSelect
                        value={charRule.targetVariable}
                        onChange={val => setCharRule(prev => ({ ...prev, targetVariable: val }))}
                        disabled={!charRule.targetCategory}
                        options={getTargetVariableOptions()}
                        placeholder="Select Variable..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Effect card */}
              <div className="flex-1 min-w-[280px] space-y-4 p-5 rounded-2xl border bg-green-500/5 border-green-500/20">
                <h4 className="text-xs font-bold text-green-400 uppercase flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Effect Outcome
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Stat</label>
                      <CustomSelect
                        value={charRule.statAffected}
                        onChange={val => setCharRule(prev => ({ ...prev, statAffected: val }))}
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
                        value={charRule.effectType}
                        onChange={val =>
                          setCharRule(prev => ({ ...prev, effectType: val as 'percentage' | 'flat' }))
                        }
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
                      step={charRule.effectType === 'percentage' ? 0.05 : 1}
                      value={charRule.effectValue}
                      onChange={e =>
                        setCharRule(prev => ({ ...prev, effectValue: Number(e.target.value) || 0 }))
                      }
                      className="w-full bg-transparent text-white text-sm font-bold outline-none"
                      placeholder={charRule.effectType === 'percentage' ? '1.1' : '10'}
                    />
                  </div>
                  <textarea
                    value={charRule.description}
                    onChange={e => setCharRule(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full min-h-[60px] bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 focus:border-green-500 outline-none resize-none placeholder:text-zinc-600"
                    placeholder="Flavor text..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 mt-2">
            <button
              type="button"
              onClick={handleSaveCharacterRule}
              disabled={
                charRuleSaving ||
                !formData.name ||
                !charRule.targetVariable ||
                !charRule.statAffected ||
                !charRule.effectValue
              }
              className={`w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg ${
                charRule.relationType === 'versus'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 shadow-orange-900/20'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-purple-900/20'
              }`}
            >
              {charRuleSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {charRule.relationType === 'versus' ? 'Attach Versus Rule' : 'Attach Synergy Rule'}
            </button>
          </div>
        </div>
      {/* Layout Selection Modal */}
      {showLayoutModal && pendingImage && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl flex flex-col items-center gap-8">
                <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter text-center">
                    Select Card Style
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    {/* Classic Layout */}
                    <div 
                        onClick={() => {
                            if (!pendingImage) return
                            const newStages = [...(formData.stages || [])]
                            newStages[currentStageIndex].image = pendingImage
                            newStages[currentStageIndex].thumbnail = pendingThumb || pendingImage
                            setFormData(prev => ({ 
                                ...prev, 
                                stages: newStages,
                                cardLayout: 'classic'
                            }))
                            setPendingImage(null)
                            setPendingThumb(null)
                            setShowLayoutModal(false)
                        }}
                        className="group cursor-pointer flex flex-col items-center gap-4 relative hover:z-50 transition-all duration-300"
                    >
                        <div className="relative transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_50px_rgba(255,165,0,0.5)]">
                            <div className="pointer-events-none">
                                <CharacterCard 
                                    character={{
                                        ...formData,
                                        stages: formData.stages?.map((s, i) => i === currentStageIndex ? { ...s, image: pendingImage } : s) || [],
                                        cardLayout: 'classic'
                                    } as Character}
                                    stageIndex={currentStageIndex}
                                />
                            </div>
                            <div className="absolute inset-0 border-4 border-transparent group-hover:border-orange-500 rounded-xl transition-colors" />
                        </div>
                        <span className="text-xl font-bold text-zinc-500 group-hover:text-orange-500 uppercase tracking-widest transition-colors">
                            Classic
                        </span>
                    </div>

                    {/* Bottom Focused Layout */}
                    <div 
                        onClick={() => {
                            if (!pendingImage) return
                            const newStages = [...(formData.stages || [])]
                            newStages[currentStageIndex].image = pendingImage
                            newStages[currentStageIndex].thumbnail = pendingThumb || pendingImage
                            setFormData(prev => ({ 
                                ...prev, 
                                stages: newStages,
                                cardLayout: 'bottom_focused'
                            }))
                            setPendingImage(null)
                            setPendingThumb(null)
                            setShowLayoutModal(false)
                        }}
                        className="group cursor-pointer flex flex-col items-center gap-4 relative hover:z-50 transition-all duration-300"
                    >
                        <div className="relative transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_50px_rgba(255,165,0,0.5)]">
                            <div className="pointer-events-none">
                                <CharacterCard 
                                    character={{
                                        ...formData,
                                        stages: formData.stages?.map((s, i) => i === currentStageIndex ? { ...s, image: pendingImage } : s) || [],
                                        cardLayout: 'bottom_focused'
                                    } as Character}
                                    stageIndex={currentStageIndex}
                                />
                            </div>
                            <div className="absolute inset-0 border-4 border-transparent group-hover:border-orange-500 rounded-xl transition-colors" />
                        </div>
                        <span className="text-xl font-bold text-zinc-500 group-hover:text-orange-500 uppercase tracking-widest transition-colors">
                            Bottom Focused
                        </span>
                    </div>
                </div>
                
                <button 
                    type="button"
                    onClick={() => {
                       if (!pendingImage) return
                       const newStages = [...(formData.stages || [])]
                       newStages[currentStageIndex].image = pendingImage
                       newStages[currentStageIndex].thumbnail = pendingThumb || pendingImage
                       setFormData(prev => ({ ...prev, stages: newStages }))
                       setPendingImage(null)
                       setPendingThumb(null)
                       setShowLayoutModal(false)
                    }}
                    className="text-zinc-500 hover:text-white underline text-sm uppercase tracking-wider"
                >
                    Skip Selection (Keep Current)
                </button>
            </div>
        </div>
      )}

      {addVarOpen && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-4">Adicionar Variável</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Categoria</label>
                <div className="w-full h-[40px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-zinc-400 flex items-center">{addVarCategory}</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Valor</label>
                <input value={addVarValue} onChange={e => setAddVarValue(e.target.value)} className="w-full h-[40px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Label</label>
                <input value={addVarLabel} onChange={e => setAddVarLabel(e.target.value)} className="w-full h-[40px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Description</label>
                <input value={addVarDesc} onChange={e => setAddVarDesc(e.target.value)} className="w-full h-[40px] bg-[#1a1a1a] border border-[#333] rounded-xl px-4 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Icon</label>
                <div className="relative mb-2">
                  <input
                    value={iconSearch}
                    onChange={e => setIconSearch(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                    placeholder="Search icon (e.g. sword, fire)..."
                  />
                </div>
                <div className="grid grid-cols-6 gap-2 max-h-[220px] overflow-y-auto p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                  {filteredIcons.map(iconName => {
                    const Icon = (LucideIcons as any)[iconName]
                    const isSelected = addVarIcon === iconName
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setAddVarIcon(iconName)}
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
                {addVarIcon && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-orange-400">
                    <span className="font-bold">Selected:</span> {addVarIcon}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button type="button" onClick={() => setAddVarOpen(false)} className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-300 hover:text-white">Cancel</button>
              <button type="button" onClick={saveAddVariable} disabled={addVarSaving} className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold">
                {addVarSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </form>
  )
}

export default CharacterForm
