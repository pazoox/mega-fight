import { Character, CharacterStats, Arena, BattleModifier, BattleContext } from '@/types';
import { evaluateDynamicRules, Rule } from './ruleEngine';
import modifierRules from '@/data/modifierRules.json';

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================

const BUFF_MAJOR = 1.2; // +20%
const BUFF_MINOR = 1.1; // +10%
const NERF_MAJOR = 0.8; // -20%
const NERF_MINOR = 0.9; // -10%

export interface BattleAnalysis {
  finalStats: CharacterStats;
  modifiers: BattleModifier[];
  immunities: string[]; // List of things this character is immune to in this context
}

// ==========================================
// CORE FUNCTIONS
// ==========================================

/**
 * MAIN ENGINE FUNCTION
 * Calculates final stats and generates a report of all modifiers.
 */
export function runBattleAnalysis(context: BattleContext): BattleAnalysis {
  const { character, stageIndex, arena, teammates, opponents } = context;
  
  // Safety check
  if (!character || !character.stages || !character.stages[stageIndex]) {
    return {
      finalStats: { hp: 0, str: 0, def: 0, sta: 0, sp_atk: 0, int: 0, spd: 0, atk_spd: 0 },
      modifiers: [],
      immunities: []
    };
  }

  const stage = character.stages[stageIndex];
  const tags = stage.tags;
  
  let modifiers: BattleModifier[] = [];

  // 1. Power Scales (Base Multiplier)
  // We apply this DIRECTLY to the base stats first? Or treat it as a modifier?
  // Treating as a base transformation is safer for the logic, but let's track it if needed.
  // For the 'Analysis' object, we return the FINAL numbers.

  // 2. Dynamic Rules (Environment, Synergy, etc.)
  // We evaluate rules ONCE with the full context.
  // evaluateDynamicRules checks context.arena for Environment rules
  // and context.teammates for Synergy rules automatically.
  modifiers = [
    ...modifiers,
    ...evaluateDynamicRules(context, modifierRules as unknown as Rule[])
  ];

  // 4. Calculate Final Stats
  const rawStats = context.baseStatsOverride ? { ...context.baseStatsOverride } : { ...stage.stats };
  const finalStats = { ...rawStats };

  // Define stats to be processed
  // Note: We include sp_atk and atk_spd which were missing in previous explicit assignments
  const statKeys: (keyof CharacterStats)[] = ['hp', 'str', 'def', 'sta', 'sp_atk', 'int', 'spd', 'atk_spd'];
  
  // Initialize trackers for Additive Stacking
  // This prevents exponential stat growth from multiple percentage buffs
  const percentMults: Record<string, number> = {};
  const flatAdds: Record<string, number> = {};
  
  statKeys.forEach(k => {
    percentMults[k] = 1.0;
    flatAdds[k] = 0;
  });

  // Aggregate Modifiers
  modifiers.forEach(mod => {
    const isFlat = mod.type === 'flat';
    
    // Determine which stats are affected
    const targets: (keyof CharacterStats)[] = mod.targetStat === 'all' 
      ? statKeys 
      : (mod.targetStat ? [mod.targetStat as keyof CharacterStats] : []);

    targets.forEach(stat => {
      if (isFlat) {
        flatAdds[stat] += mod.value;
      } else {
        // Additive Stacking for Percentages
        // e.g. 1.2 (+20%) becomes +0.2 to the multiplier
        // e.g. 0.8 (-20%) becomes -0.2 to the multiplier
        percentMults[stat] += (mod.value - 1.0);
      }
    });
  });

  // Apply Aggregated Modifiers to Final Stats
  statKeys.forEach(stat => {
    // Ensure multiplier doesn't go below 0.1 (10%) to prevent negative stats or complete nullification unless intended
    // You can adjust this floor if you want 0 to be possible
    const finalMult = Math.max(0.1, percentMults[stat]);
    
    // Calculate: (Base * Multiplier) + Flat
    // Note: We apply flat AFTER multiplier usually, or BEFORE? 
    // Standard is usually (Base + Flat) * Mult or (Base * Mult) + Flat.
    // Previous code did sequential application.
    // Let's stick to (Base * Mult) + Flat for stability (flat bonuses shouldn't be multiplied by weather usually unless specified).
    
    if (typeof rawStats[stat] === 'number') {
        finalStats[stat] = Math.round((rawStats[stat] as number * finalMult) + flatAdds[stat]);
        
        // Safety floor
        if ((finalStats[stat] as number) < 0) (finalStats[stat] as number) = 0;
    }
  });

  // 5. Immunities (Against first opponent usually)
  const immunities: string[] = [];
  
  // Note: Old hardcoded immunity logic removed. 
  // Future implementation should handle immunities via dynamic rules if needed.

  return {
    finalStats,
    modifiers,
    immunities
  };
}
