import { Character, CharacterStats, Arena, CharacterTags, BattleContext, BattleModifier } from '@/types';
import { evaluateDynamicRules, Rule } from '@/lib/ruleEngine';
import modifierRules from '@/data/modifierRules.json';

// Multipliers
const BUFF_MAJOR = 1.2; // +20%
const BUFF_MINOR = 1.1; // +10%
const NERF_MAJOR = 0.8; // -20%
const NERF_MINOR = 0.9; // -10%

export interface ModifierDetail {
  label: string;
  value: number; // e.g. 1.2 for +20%
  category: 'Scale' | 'Environment' | 'Physics' | 'Magic' | 'Complexity' | 'Synergy' | 'Immunity' | 'Weather';
  trigger: string;
  triggerType?: string;
  stats?: string[];
  type?: 'percentage' | 'flat';
  relationType?: 'versus' | 'synergy';
  targetType?: string;
  targetValue?: string;
}

export interface ArenaModifiers {
  stats: CharacterStats;
  buffs: ModifierDetail[];
  nerfs: ModifierDetail[];
}

export function getFirstTag(value: string | string[] | undefined): string {
  if (!value) return '';
  if (Array.isArray(value)) return value[0] || '';
  return value;
}

export function getScaledStats(
  character: Character, 
  stageIndex: number, 
  powerScale: boolean = false
): CharacterStats {
  if (!character || !character.stages || !character.stages[stageIndex]) {
    return { hp: 0, str: 0, def: 0, sta: 0, sp_atk: 0, int: 0, spd: 0, atk_spd: 0 };
  }
  const stage = character.stages[stageIndex];
  let baseStats = { ...stage.stats };

  if (powerScale) {
    const rawScale = character.canonScale || 100;
    const scaleFactor = rawScale / 100;
    const flags = (character as any).scaledStats || { hp: true, str: true, def: true, sta: true, sp_atk: true, int: true, spd: true, atk_spd: true };
    
    baseStats = {
      hp: flags.hp ? Math.round(baseStats.hp * scaleFactor) : baseStats.hp,
      str: flags.str ? Math.round(baseStats.str * scaleFactor) : baseStats.str,
      def: flags.def ? Math.round(baseStats.def * scaleFactor) : baseStats.def,
      sta: flags.sta ? Math.round((baseStats.sta || 0) * scaleFactor) : (baseStats.sta || 0),
      sp_atk: flags.sp_atk ? Math.round((baseStats.sp_atk || 0) * scaleFactor) : (baseStats.sp_atk || 0),
      int: flags.int ? Math.round(baseStats.int * scaleFactor) : baseStats.int,
      spd: flags.spd ? Math.round(baseStats.spd * scaleFactor) : baseStats.spd,
      atk_spd: flags.atk_spd ? Math.round((baseStats.atk_spd || 0) * scaleFactor) : (baseStats.atk_spd || 0),
      justifications: baseStats.justifications,
    };
  }
  return baseStats;
}

export function calculateArenaModifiers(
  character: Character, 
  stageIndex: number, 
  arena: Arena | null,
  powerScale: boolean = false,
  baseStatsOverride?: CharacterStats
): ArenaModifiers {
  // Get base stats from the current stage OR override
  const stage = character.stages[stageIndex];
  let baseStats: CharacterStats;

  if (baseStatsOverride) {
      baseStats = { ...baseStatsOverride };
  } else {
      baseStats = getScaledStats(character, stageIndex, powerScale);
  }
  
  // Initialize modifiers result
  const result: ArenaModifiers = {
    stats: { ...baseStats },
    buffs: [],
    nerfs: []
  };

  if (!arena) return result;

  // Create Battle Context
  const context: BattleContext = {
    character,
    stageIndex,
    arena,
    baseStatsOverride
  };

  // Evaluate Dynamic Rules
  const dynamicModifiers = evaluateDynamicRules(context, modifierRules as unknown as Rule[]);

  // Apply Modifiers to Stats and Populate Buffs/Nerfs
  dynamicModifiers.forEach(mod => {
    // 1. Apply to Stats (Simplified application for UI display)
    // Note: battleEngine.ts has more complex stacking logic. 
    // Here we just want to show the "Result" stats in the card.
    
    // Determine target stats
    const statsKeys: (keyof CharacterStats)[] = ['hp', 'str', 'def', 'sta', 'sp_atk', 'int', 'spd', 'atk_spd'];
    const targets = mod.targetStat === 'all' ? statsKeys : (mod.targetStat ? [mod.targetStat as keyof CharacterStats] : []);
    
    // Apply value
    targets.forEach(stat => {
      if (typeof result.stats[stat] === 'number') {
        if (mod.type === 'flat') {
          (result.stats as any)[stat] += mod.value;
        } else {
          // Percentage
          (result.stats as any)[stat] = Math.round((result.stats as any)[stat] * mod.value);
        }
      }
    });

    // 2. Classify as Buff or Nerf for UI
    const isBuff = (mod.type === 'flat' && mod.value >= 0) || (mod.type !== 'flat' && mod.value >= 1);
    const detail: ModifierDetail = {
      label: mod.label,
      value: mod.value,
      category: mod.category as any, // Cast to match UI category types if needed
      trigger: mod.trigger,
      triggerType: mod.triggerType,
      stats: targets.map(s => s.toUpperCase()),
      type: mod.type || 'percentage',
      relationType: mod.relationType,
      targetType: mod.targetType,
      targetValue: mod.targetValue
    };

    if (isBuff) {
      result.buffs.push(detail);
    } else {
      result.nerfs.push(detail);
    }
  });

  return result;
}

// Deprecated helper left intentionally empty (no longer used)
function applyMultiplier(
  modifiers: ArenaModifiers, 
  stat: keyof CharacterStats | 'all', 
  factor: number
) {}
