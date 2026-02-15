import { BattleContext, BattleModifier, Character, CharacterStats } from '@/types';

// ==========================================
// TYPES
// ==========================================

export interface RuleTrigger {
  type: string; // e.g., "Weather", "Environment", "Race", "Element"
  value: string; // e.g., "Rainy", "Volcanic", "Human", "Fire"
}

export interface RuleEffect {
  stat: string; // e.g., "SP. ATK", "SPD", "Overall"
  type: 'percentage' | 'flat';
  value: number;
}

export interface Rule {
  id: string;
  trigger: RuleTrigger;
  target: RuleTrigger;
  effect: RuleEffect;
  description: string;
  relationType?: 'versus' | 'synergy';
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Maps the display stat name (from Rule Engine) to the internal CharacterStats key.
 */
function mapStatKey(displayStat: string): keyof CharacterStats | 'all' | null {
  const map: Record<string, keyof CharacterStats> = {
    'HP': 'hp',
    'STR': 'str',
    'DEF': 'def',
    'STA': 'sta',
    'SP. ATK': 'sp_atk',
    'INT': 'int',
    'SPD': 'spd',
    'ATK SPD': 'atk_spd'
  };

  if (displayStat === 'Overall') return 'all';
  return map[displayStat] || null;
}

/**
 * Checks if a character has a specific tag/attribute based on the Rule Trigger type.
 */
function checkCharacterCondition(character: Character, type: string, value: string): boolean {
  if (!character || !character.stages || !character.stages[0]) return false;
  const tags = character.stages[0].tags;
  const specs = character.specs;

  // Normalize for comparison
  const val = value.toLowerCase();

  switch (type) {
    case 'Fighter':
      return character.name.toLowerCase() === val;
    case 'Race':
      return specs.race.toLowerCase() === val;
    case 'CombatClass':
    case 'Combat Class':
      return tags.combatClass.some(t => t.toLowerCase() === val);
    case 'Movement':
      return tags.movement.some(t => t.toLowerCase() === val);
    case 'Composition':
      return tags.composition.toLowerCase() === val;
    case 'Size':
      return tags.size.toLowerCase() === val;
    case 'Source':
      return tags.source.some(t => t.toLowerCase() === val);
    case 'Element':
      return tags.element.some(t => t.toLowerCase() === val);
    case 'Gender':
      return specs.gender.toLowerCase() === val;
    default:
      return false;
  }
}

/**
 * Checks if the Arena matches the Rule Trigger condition.
 */
function checkArenaCondition(context: BattleContext, type: string, value: string): boolean {
  if (!context.arena) return false;
  const arena = context.arena;
  const val = value.toLowerCase();

  switch (type) {
    case 'Weather':
      return arena.weather?.toLowerCase() === val;
    case 'Environment':
      return arena.environment.some(e => e.toLowerCase() === val);
    case 'Daytime':
      return arena.daytime?.toLowerCase() === val;
    default:
      return false;
  }
}

// ==========================================
// MAIN ENGINE
// ==========================================

/**
 * Evaluates a list of dynamic rules against the current battle context.
 */
export function evaluateDynamicRules(context: BattleContext, rules: Rule[]): BattleModifier[] {
  const mods: BattleModifier[] = [];

  for (const rule of rules) {
    let isTriggered = false;
    let category: BattleModifier['category'] = 'Environment'; // Default
    
    // Check relation type (fallback to ID parsing for backward compatibility if needed)
    const isSynergy = rule.relationType === 'synergy' || (!rule.relationType && rule.id.startsWith('rule_synergy'));

    // 1. Determine if Trigger condition is met
    if (isSynergy) {
      if (context.teammates && context.teammates.length > 0) {
        isTriggered = context.teammates.some(mate => 
          checkCharacterCondition(mate, rule.trigger.type, rule.trigger.value)
        );
        category = 'Synergy';
      }
    } else {
      if (['Weather', 'Environment', 'Daytime'].includes(rule.trigger.type)) {
        isTriggered = checkArenaCondition(context, rule.trigger.type, rule.trigger.value);
        category = 'Environment';
      } else if (context.opponents && context.opponents.length > 0) {
        isTriggered = context.opponents.some(opp =>
          checkCharacterCondition(opp, rule.trigger.type, rule.trigger.value)
        );
        if (isTriggered) {
          category = 'Synergy';
        }
      }
    }

    if (!isTriggered) continue;

    // 2. Determine if Target condition is met (The current character)
    const isTargetMet = checkCharacterCondition(context.character, rule.target.type, rule.target.value);

    if (isTargetMet) {
      const targetStat = mapStatKey(rule.effect.stat);
      
      if (targetStat) {
        mods.push({
          label: rule.description || `${rule.trigger.value} -> ${rule.target.value}`,
          value: rule.effect.value, 
          type: rule.effect.type,
          category: category,
          targetStat: targetStat,
          trigger: rule.trigger.value,
          triggerType: rule.trigger.type,
          relationType: isSynergy ? 'synergy' : 'versus',
          targetType: rule.target.type,
          targetValue: rule.target.value
        });
      }
    }
  }

  return mods;
}
