'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChallengeConfig, ChallengeMode, SlotConfig, ChallengeLayout, Character, Arena } from '@/types';
import { Maximize2, X, Move, Save, RefreshCw, ZoomIn, ZoomOut, User, Shield, Users, MapPin, Trophy, LogOut, BarChart2, HelpCircle, Maximize, Play, Square, Plus, Trash2, ArrowLeftRight, Image as ImageIcon, Swords } from 'lucide-react';
import { VsBadge } from '@/app/fight/solo/components';
import { CharacterCard } from '../CharacterCard';

interface BattleLayoutEditorProps {
  mode: ChallengeMode;
  config: ChallengeConfig;
  onChange: (layout: ChallengeLayout) => void;
  arenaImage?: string; // Optional background for visualization
  arenaName?: string; // Optional name for visualization
}

const BattleLayoutEditor: React.FC<BattleLayoutEditorProps> = ({ mode, config, onChange, arenaImage: initialArenaImage, arenaName: initialArenaName }) => {
  const [slots, setSlots] = useState<SlotConfig[]>(config.layout?.slots || []);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [demoCharacters, setDemoCharacters] = useState<Character[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArenaId, setSelectedArenaId] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch demo characters for preview
    fetch('/api/characters')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Shuffle and pick enough for slots
          const shuffled = data.sort(() => 0.5 - Math.random());
          setDemoCharacters(shuffled.slice(0, 10));
        }
      })
      .catch(err => console.error('Failed to fetch demo characters:', err));

    // Fetch arenas
    fetch('/api/arenas')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            setArenas(data);
            if (data.length > 0) setSelectedArenaId(data[0].id);
        }
      })
      .catch(err => console.error('Failed to fetch arenas:', err));
  }, []);

  const currentArena = arenas.find(a => a.id === selectedArenaId);
  const bgImage = currentArena?.image || initialArenaImage;
  const bgName = currentArena?.name || initialArenaName;

  // Default Slots Generation based on Mode
  const generateDefaultSlots = () => {
    const newSlots: SlotConfig[] = [];
    
    if (mode === 'squad_4v4') {
      const teamSize = config.teamSize || 4;
      // Team A (Left)
      for (let i = 0; i < teamSize; i++) {
        newSlots.push({ id: `p${i+1}`, x: 20, y: 20 + (i * 15), type: 'player', scale: 0.9 });
      }
      // Team B (Right)
      for (let i = 0; i < teamSize; i++) {
        newSlots.push({ id: `e${i+1}`, x: 80, y: 20 + (i * 15), type: 'opponent', scale: 0.9 });
      }
    } else if (mode === 'boss_raid') {
      const teamSize = config.teamSize || 3; // Challengers
      // Boss (Right Center)
      newSlots.push({ id: 'boss', x: 80, y: 50, type: 'opponent', scale: 1.5 });
      
      // Players (Left Arc)
      for (let i = 0; i < teamSize; i++) {
        newSlots.push({ id: `p${i+1}`, x: 20, y: 30 + (i * 20), type: 'player', scale: 1 });
      }
    } else if (mode === '2v2') {
        // 2v2 Tag Team Layout (Realistic Side-by-Side)
        // Real game: Cards are side-by-side filling the half-screen.
        // Scale 0.92 used in real game relative to full size.
        
        // Team 1 (Left Half)
        newSlots.push({ id: 'p1', x: 15, y: 50, type: 'player', scale: 0.92 });
        newSlots.push({ id: 'p2', x: 38, y: 50, type: 'player', scale: 0.92 });
        
        // Team 2 (Right Half)
        newSlots.push({ id: 'e1', x: 62, y: 50, type: 'opponent', scale: 0.92 });
        newSlots.push({ id: 'e2', x: 85, y: 50, type: 'opponent', scale: 0.92 });

      } else {
        // Default / 1v1 / Stats Battle (Center Halves)
        // Real game (1920x1080):
        // P1 Center ~ 22% (Left of center gap)
        // P2 Center ~ 78% (Right of center gap)
        // Y Center ~ 55% (Due to pt-48 top padding)
        newSlots.push({ id: 'p1', x: 22, y: 55, type: 'player', scale: 1.0 });
        newSlots.push({ id: 'e1', x: 78, y: 55, type: 'opponent', scale: 1.0 });
      }
    
    setSlots(newSlots);
    onChange({ slots: newSlots });
  };

  // Auto-Reset when Mode Changes (User Requirement)
  useEffect(() => {
    // We check if the current slots match the mode somewhat, or just force reset.
    // The user explicitly asked for auto-reset on mode change.
    generateDefaultSlots();
  }, [mode]);

  // Sync slots if config changes (optional, maybe manual reset is better)
  useEffect(() => {
    if (!config.layout?.slots || config.layout.slots.length === 0) {
       // Only auto-generate if empty
       // generateDefaultSlots();
    } else {
       setSlots(config.layout.slots);
    }
  }, [config.layout]);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    // Grid Snapping (Magnetism)
    const gridSize = 5; // Snap every 5%
    const snap = (value: number) => {
        const remainder = value % gridSize;
        if (remainder < 1) return value - remainder; // Snap down
        if (remainder > gridSize - 1) return value + (gridSize - remainder); // Snap up
        return value;
    };

    const x = snap(rawX);
    const y = snap(rawY);

    // Clamp values 0-100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setSlots(prev => prev.map(slot => 
      slot.id === draggingId ? { ...slot, x: clampedX, y: clampedY } : slot
    ));
  };

  const handleMouseUp = () => {
    if (draggingId) {
        onChange({ slots }); // Save on drop
        setDraggingId(null);
    }
  };

  // Scale Handlers
  const updateScale = (id: string, delta: number) => {
    const updatedSlots = slots.map(slot => {
        if (slot.id === id) {
            const newScale = Math.max(0.5, Math.min(2.5, (slot.scale || 1) + delta));
            return { ...slot, scale: newScale };
        }
        return slot;
    });
    setSlots(updatedSlots);
    onChange({ slots: updatedSlots });
  };

  const addSlot = (type: 'player' | 'opponent') => {
    const newId = type === 'player' 
        ? `p${slots.filter(s => s.type === 'player').length + 1}`
        : `e${slots.filter(s => s.type === 'opponent').length + 1}`;
    
    // Position intelligently (find a gap or stack)
    const newSlot: SlotConfig = {
        id: newId,
        x: type === 'player' ? 25 : 75,
        y: 50,
        type,
        scale: 1
    };
    
    const updatedSlots = [...slots, newSlot];
    setSlots(updatedSlots);
    onChange({ slots: updatedSlots });
  };

  const removeSlot = (id: string) => {
    const updatedSlots = slots.filter(s => s.id !== id);
    setSlots(updatedSlots);
    onChange({ slots: updatedSlots });
    if (draggingId === id) setDraggingId(null);
  };

  const toggleSlotType = (id: string) => {
    const updatedSlots = slots.map(s => {
        if (s.id === id) {
            return { ...s, type: s.type === 'player' ? 'opponent' : 'player' } as SlotConfig;
        }
        return s;
    });
    setSlots(updatedSlots);
    onChange({ slots: updatedSlots });
  };

  // Render a Slot
    const renderSlot = (slot: SlotConfig, isThumbnail = false, index: number) => {
        const isPlayer = slot.type === 'player';
        // Realistic sizing:
        // Real card is ~26% of screen width (500px / 1920px)
        // We use percentages to maintain this ratio in the editor regardless of container size
        const baseWidthPercent = 26; 
        const widthPercent = baseWidthPercent * (slot.scale || 1);
        
        // Z-Index based on Y position (lower items in front)
        const zIndex = draggingId === slot.id ? 100 : Math.floor(slot.y);
        
        // Demo Character Data
        const demoChar = demoCharacters.length > 0 ? demoCharacters[index % demoCharacters.length] : null;
        const imageUrl = demoChar?.stages[0]?.image;

        // Editor Mode / Thumbnail
        return (
          <div
            key={slot.id}
            onMouseDown={(e) => !isThumbnail && handleMouseDown(e, slot.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-200 group
                ${isThumbnail ? '' : 'cursor-grab active:cursor-grabbing hover:z-[100]'}
                ${draggingId === slot.id ? 'scale-105 drop-shadow-2xl z-[100]' : ''}
            `}
            style={{ 
                left: `${slot.x}%`, 
                top: `${slot.y}%`,
                width: `${widthPercent}%`,
                aspectRatio: '1/1.6', // Enforce 500:800 ratio
                zIndex
            }}
          >
        {/* Realistic Card Shape */}
        <div className={`w-full h-full rounded-lg border flex flex-col items-center justify-between shadow-lg overflow-hidden bg-zinc-900 relative
            ${isPlayer ? 'border-blue-500/50 shadow-blue-900/20' : 'border-red-500/50 shadow-red-900/20'}
            ${draggingId === slot.id ? 'shadow-orange-500/50 border-orange-400 ring-2 ring-orange-500/20' : ''}
        `}>
            {/* Card Background Image */}
            {imageUrl ? (
                <div className="absolute inset-0">
                    <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                    <div className={`absolute inset-0 bg-gradient-to-b ${isPlayer ? 'from-blue-900/30 via-transparent to-black' : 'from-red-900/30 via-transparent to-black'}`} />
                </div>
            ) : (
                <div className="absolute inset-0 bg-zinc-800" />
            )}

            {/* Card Header */}
            <div className={`relative w-full h-[15%] flex items-center justify-center backdrop-blur-sm border-b border-white/10 z-10
                ${isPlayer ? 'bg-blue-900/40' : 'bg-red-900/40'}
            `}>
                <span className="text-[10px] uppercase font-bold text-white drop-shadow-md tracking-wider">
                    {demoChar?.name || slot.id}
                </span>
            </div>
            
            {/* Center Content (Placeholder Icon if no image) */}
            {!imageUrl && (
                <div className="relative z-10 flex-1 w-full flex items-center justify-center">
                    {isPlayer ? <User size={isThumbnail ? 8 : 24} className="text-blue-400 opacity-50" /> : 
                     slot.id.includes('boss') ? <Shield size={isThumbnail ? 8 : 24} className="text-red-400 opacity-50" /> :
                     <Users size={isThumbnail ? 8 : 24} className="text-red-400 opacity-50" />
                    }
                </div>
            )}

            {/* Card Footer */}
            <div className="relative w-full h-[25%] bg-black/60 backdrop-blur-md border-t border-white/10 p-2 flex flex-col gap-1.5 z-10">
                <div className="flex justify-between items-end">
                     <div className="flex flex-col">
                        <span className="text-[8px] text-zinc-400 uppercase leading-none">Power</span>
                        <span className="text-xs font-black text-white leading-none">9,999</span>
                     </div>
                     <div className={`w-6 h-6 rounded flex items-center justify-center border ${isPlayer ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-red-500 bg-red-500/20 text-red-400'}`}>
                        <Swords size={12} />
                     </div>
                </div>
                {/* Stat Bars */}
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full w-[80%] ${isPlayer ? 'bg-blue-500' : 'bg-red-500'}`} />
                </div>
            </div>

            {/* Selection Ring (Animated) */}
            {draggingId === slot.id && (
                <div className="absolute inset-0 border-2 border-orange-500 rounded-lg animate-pulse z-20" />
            )}
        </div>
        
        {/* Label (Edit Mode Only) */}
        {!isThumbnail && (
            <div className="absolute -bottom-8 bg-black/90 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap border border-zinc-800 text-zinc-400 shadow-xl z-20">
                {slot.id} <span className="text-zinc-600">|</span> <span className="text-orange-400">{(slot.scale || 1).toFixed(1)}x</span>
            </div>
        )}

        {/* Controls (Edit Mode + Hover/Selected) */}
        {!isThumbnail && (
            <div className="absolute -top-14 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 rounded-lg p-1.5 border border-zinc-700 shadow-xl backdrop-blur-md z-[110]">
                 <button onClick={(e) => { e.stopPropagation(); updateScale(slot.id, -0.1); }} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-orange-500 transition-colors" title="Scale Down"><ZoomOut size={14}/></button>
                 <span className="text-[10px] font-mono w-8 text-center text-white">{(slot.scale || 1).toFixed(1)}x</span>
                 <button onClick={(e) => { e.stopPropagation(); updateScale(slot.id, 0.1); }} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-orange-500 transition-colors" title="Scale Up"><ZoomIn size={14}/></button>
                 <div className="w-px h-3 bg-zinc-700 mx-1" />
                 <button onClick={(e) => { e.stopPropagation(); toggleSlotType(slot.id); }} className={`p-1 hover:bg-white/10 rounded transition-colors ${isPlayer ? 'text-blue-400' : 'text-red-400'}`} title="Switch Type"><ArrowLeftRight size={14}/></button>
                 <button onClick={(e) => { e.stopPropagation(); removeSlot(slot.id); }} className="p-1 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-500 transition-colors" title="Remove Slot"><Trash2 size={14}/></button>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full aspect-video bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
            <div className="flex items-center gap-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Move className="text-orange-500" /> Battle Layout Editor
                </h3>
                
                {/* Arena Selector */}
                <div className="flex items-center gap-2 border-l border-zinc-800 pl-6">
                    <ImageIcon size={14} className="text-zinc-500" />
                    <select 
                        value={selectedArenaId} 
                        onChange={(e) => setSelectedArenaId(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-orange-500 min-w-[150px]"
                    >
                        <option value="">Select Background...</option>
                        {arenas.map(arena => (
                            <option key={arena.id} value={arena.id}>
                                {arena.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-xs text-zinc-500">
                    Drag to move • Hover slot to scale
                </span>
            </div>
        </div>

        {/* Editor Canvas */}
        <div className="flex-1 bg-[#111] relative overflow-hidden select-none"
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             ref={containerRef}
        >
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                style={{ 
                    backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
                    backgroundSize: '40px 40px' 
                }} 
            />
            
            {/* Center Lines */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-orange-500/20 pointer-events-none" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-orange-500/20 pointer-events-none" />

            {/* Arena BG (Full) */}
            {bgImage && (
                <div className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none" style={{ backgroundImage: `url(${bgImage})` }} />
            )}

            {/* UI Reference Elements (Safe Zones & HUD) */}
            <div className="absolute inset-0 pointer-events-none">
                
                {/* Match Info & Map (Simulating Fight Page Header) */}
                <div className="absolute top-[7.4%] left-0 right-0 flex flex-col items-center gap-2">
                     {/* Match Pill */}
                     <div className="px-4 py-1 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-full text-xs font-mono text-zinc-400 tracking-widest uppercase flex items-center gap-2">
                        <span>Match 1</span>
                        <span className="opacity-50">•</span>
                        <span>Round 1</span>
                     </div>
                     
                     {/* Map Name */}
                     <div className="flex items-center gap-2 text-orange-400 font-bold text-lg drop-shadow-md">
                        <MapPin size={20} />
                        <span>{bgName || (bgImage ? 'Selected Arena' : 'Arena Name')}</span>
                     </div>
                </div>

                {/* Top Left Controls (Simulating Fight Page) */}
                <div className="absolute top-6 left-6 z-50">
                    <div className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-800 text-zinc-600 flex items-center justify-center">
                        <Maximize size={20} />
                    </div>
                </div>

                {/* Top Right Controls (Simulating Fight Page Header) */}
                <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
                     {/* Stats / Simulation */}
                     {config.ui?.showStats && (
                        <div className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-800 text-zinc-600 flex items-center justify-center">
                            <BarChart2 size={20} />
                        </div>
                     )}
                     
                     {/* Info / Rules */}
                     <div className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-800 text-zinc-600 flex items-center justify-center">
                        <HelpCircle size={20} />
                     </div>

                     {/* Exit */}
                     {config.ui?.showExitButton && (
                        <div className="px-4 py-2 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-full text-zinc-600 font-bold text-sm flex items-center gap-2">
                            <LogOut size={16} />
                            Exit
                        </div>
                     )}
                </div>

                {/* Top Timer (Optional) - Adjusted Position */}
                {config.ui?.showTimer && (
                    <div className="absolute top-20 right-8">
                        <div className="w-16 h-16 rounded-full border-2 border-zinc-800 bg-black/50 flex items-center justify-center text-zinc-600 font-black text-xl">
                            99
                        </div>
                    </div>
                )}
                
                {/* Bottom Bar (Simulating Action Bar) */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-4 gap-4">
                     {config.ui?.showTrumpButton && <div className="w-16 h-16 rounded-full border border-orange-500/20 bg-orange-900/10 flex items-center justify-center text-[10px] text-orange-500 font-bold">TRUMP</div>}
                     <div className="w-16 h-16 rounded-full border border-white/10 bg-zinc-900/50 flex items-center justify-center text-[10px] text-zinc-500">ATK</div>
                </div>
                
                {/* VS Badge (Center) - Simulated for Editor */}
                <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 scale-50 pointer-events-none grayscale">
                    <VsBadge />
                </div>
            </div>

            {/* Render Slots */}
            {slots.map((slot, i) => renderSlot(slot, false, i))}

        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-between items-center">
            <div className="flex gap-2">
                 <button onClick={generateDefaultSlots} className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 transition-colors" title="Reset to Defaults">
                    <RefreshCw size={14} />
                 </button>
                 <div className="w-px h-8 bg-zinc-800 mx-2" />
                 <button onClick={() => addSlot('player')} className="px-4 py-2 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/50 rounded-lg text-xs font-bold text-blue-400 transition-colors flex items-center gap-2">
                    <Plus size={14} /> Add Player
                 </button>
                 <button onClick={() => addSlot('opponent')} className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded-lg text-xs font-bold text-red-400 transition-colors flex items-center gap-2">
                    <Plus size={14} /> Add Opponent
                 </button>
            </div>

            {/* Play / Preview Toggle */}
            <button 
                onClick={() => setIsPreviewMode(true)}
                className="px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all duration-300 border bg-green-500/10 border-green-500 text-green-500 hover:bg-green-500/20"
            >
                <Play size={16} fill="currentColor" /> Play Preview
            </button>
        </div>

      {/* Full Screen Play Preview Overlay */}
      {isPreviewMode && createPortal(
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden">
             {/* Arena BG (Full) */}
             {bgImage && (
                <div className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none" style={{ backgroundImage: `url(${bgImage})` }} />
             )}
             
             {/* Match Info & Map (Simulating Fight Page Header) */}
             <div className="absolute top-20 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none">
                  {/* Match Pill */}
                  <div className="px-4 py-1 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-full text-xs font-mono text-zinc-400 tracking-widest uppercase flex items-center gap-2">
                     <span>Match 1</span>
                     <span className="opacity-50">•</span>
                     <span>Round 1</span>
                  </div>
                  
                  {/* Map Name */}
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-lg drop-shadow-md">
                     <MapPin size={20} />
                     <span>{bgName || (bgImage ? 'Selected Arena' : 'Arena Name')}</span>
                  </div>
             </div>

             {/* VS Badge (Center) - Real Component */}
             <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                 <VsBadge compact={mode === '2v2'} />
             </div>

             {/* Top Left Controls (Simulating Fight Page) */}
             <div className="absolute top-6 left-6 z-50 pointer-events-none">
                 <div className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 text-zinc-400 flex items-center justify-center">
                     <Maximize size={20} />
                 </div>
             </div>

             {/* Top Right Controls (Simulating Fight Page Header) */}
             <div className="absolute top-6 right-6 z-50 flex items-center gap-3 pointer-events-none">
                  {/* Stats / Simulation */}
                  {config.ui?.showStats && (
                     <div className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 text-zinc-400 flex items-center justify-center">
                         <BarChart2 size={20} />
                     </div>
                  )}
                  
                  {/* Info / Rules */}
                  <div className="w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 text-zinc-400 flex items-center justify-center">
                     <HelpCircle size={20} />
                  </div>

                  {/* Exit */}
                  {config.ui?.showExitButton && (
                     <div className="px-4 py-2 bg-zinc-900/80 backdrop-blur border border-white/10 rounded-full text-zinc-400 font-bold text-sm flex items-center gap-2">
                         <LogOut size={16} />
                         Exit
                     </div>
                  )}
             </div>

             {/* Top Timer (Optional) - Adjusted Position */}
             {config.ui?.showTimer && (
                 <div className="absolute top-20 right-8 pointer-events-none">
                     <div className="w-16 h-16 rounded-full border-2 border-zinc-800 bg-black/50 flex items-center justify-center text-white font-black text-xl">
                         99
                     </div>
                 </div>
             )}

             {/* Cards Layer (Using Slots) */}
             <div className="absolute inset-0 pointer-events-none">
                 {slots.map((slot, index) => {
                     // Find a demo character for this slot
                     const charIndex = slots.findIndex(s => s.id === slot.id);
                     const demoChar = demoCharacters[charIndex % demoCharacters.length];
                     
                     // Scaling Logic: Fixed Size 1:1 Parity
                     // Real Game uses fixed 500x800 cards. We match this exactly.
                     const baseSize = 500; 
                     
                     const size = baseSize * (slot.scale || 1);
                     const zIndex = Math.floor(slot.y);

                     if (!demoChar) return null;

                     return (
                        <div
                            key={slot.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-500"
                            style={{ 
                                left: `${slot.x}%`, 
                                top: `${slot.y}%`,
                                width: `${size}px`, 
                                height: `${size * 1.6}px`,
                                zIndex
                            }}
                        >
                             <div style={{ 
                                 transform: `scale(${size / 500})`,
                                 transformOrigin: 'center center',
                                 width: '500px',
                                 height: '800px',
                                 pointerEvents: 'auto' // Allow hover on cards
                             }}>
                                 <CharacterCard 
                                    character={demoChar} 
                                    compact={false} 
                                    disabled 
                                    powerScale 
                                 />
                             </div>
                        </div>
                     );
                 })}
             </div>

             {/* Close Preview Button (Floating) */}
             <button 
                 onClick={() => setIsPreviewMode(false)}
                 className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[300] px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-2xl flex items-center gap-2 border border-red-400 transition-all hover:scale-105 pointer-events-auto"
             >
                 <Square size={16} fill="currentColor" /> Stop Preview
             </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BattleLayoutEditor;