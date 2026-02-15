
import { Character } from '@/types';
import { generateBracket, generateMatchQueue, BattleSession } from '@/lib/tournament';

export function filterCharactersForCup(allCharacters: Character[], cup: any): Character[] {
    const criteria = cup.config.participantCriteria;
    if (!criteria) return allCharacters;

    return allCharacters.filter(c => {
        // Specific Characters
        if (criteria.specificCharacters && criteria.specificCharacters.includes(c.id)) {
            return true;
        }

        // Franchises
        if (criteria.franchises && criteria.franchises.length > 0 && !criteria.franchises.includes(c.groupId)) {
            return false;
        }

        // Power Scale / Stats
        const stages = c.stages || [];
        if (stages.length === 0) return false;

        const getStagePower = (s: any) => {
             return Object.values(s.stats || {}).reduce((a: any, b: any) => (Number(a)||0) + (Number(b)||0), 0) as number;
        };

        let powerToTest = 0;
        if (criteria.stageMode === 'weakest') {
             powerToTest = Math.min(...stages.map((s: any) => getStagePower(s)));
        } else if (criteria.stageMode === 'strongest') {
             powerToTest = Math.max(...stages.map((s: any) => getStagePower(s)));
        } else {
             powerToTest = Math.max(...stages.map((s: any) => getStagePower(s)));
        }
         
        if (criteria.minPower !== undefined && powerToTest < criteria.minPower) return false;
        if (criteria.maxPower !== undefined && powerToTest > criteria.maxPower) return false;

        // Tags
        if (criteria.tags && criteria.tags.length > 0) {
             const allStageTags = new Set<string>();
             stages.forEach((s: any) => {
                 if (s.tags) {
                     if (Array.isArray(s.tags.combatClass)) s.tags.combatClass.forEach((t: string) => allStageTags.add(t));
                     if (Array.isArray(s.tags.source)) s.tags.source.forEach((t: string) => allStageTags.add(t));
                     if (Array.isArray(s.tags.element)) s.tags.element.forEach((t: string) => allStageTags.add(t));
                     if (s.tags.composition) allStageTags.add(s.tags.composition);
                     // if (Array.isArray(s.tags.race)) s.tags.race.forEach((t: string) => allStageTags.add(t));
                     if (Array.isArray(s.tags.movement)) s.tags.movement.forEach((t: string) => allStageTags.add(t));
                 }
             });
  
             const matchCount = criteria.tags.filter((t: string) => allStageTags.has(t)).length;
             const minRequired = criteria.minTagMatches || 1;
             if (matchCount < minRequired) return false;
        }

        return true;
    });
}

export function generateCupTournament(cup: any, allCharacters: Character[]): BattleSession {
    const filteredChars = filterCharactersForCup(allCharacters, cup);

    if (filteredChars.length < 2) {
        throw new Error(`Not enough eligible characters found (${filteredChars.length}). Need at least 2.`);
    }

    const teamSize = cup.config.teamSize === 2 ? '2v2' : '1x1';
    const bracketSize = cup.config.participantCriteria?.bracketSize || 8;
    const stageMode = cup.config.participantCriteria?.stageMode || 'random';

    if (cup.config.format === 'queue') {
         return generateMatchQueue(
            filteredChars,
            teamSize,
            bracketSize,
            stageMode
         );
    } else {
         return generateBracket(
            filteredChars,
            teamSize,
            bracketSize,
            stageMode
         );
    }
}

function hashSeedToInt(seed: string): number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
}

function createSeededRng(seed: string): () => number {
    let t = hashSeedToInt(seed) || 1;
    return () => {
        t += 0x6D2B79F5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

export function generateCupTournamentWithSeed(
    cup: any,
    allCharacters: Character[],
    seed?: string
): BattleSession {
    if (!seed) {
        return generateCupTournament(cup, allCharacters);
    }

    const filteredChars = filterCharactersForCup(allCharacters, cup);

    if (filteredChars.length < 2) {
        throw new Error(`Not enough eligible characters found (${filteredChars.length}). Need at least 2.`);
    }

    const teamSize = cup.config.teamSize === 2 ? '2v2' : '1x1';
    const bracketSize = cup.config.participantCriteria?.bracketSize || 8;
    const stageMode = cup.config.participantCriteria?.stageMode || 'random';
    const rng = createSeededRng(seed);

    if (cup.config.format === 'queue') {
        return generateMatchQueue(
            filteredChars,
            teamSize,
            bracketSize,
            stageMode,
            rng
        );
    } else {
        return generateBracket(
            filteredChars,
            teamSize,
            bracketSize,
            stageMode,
            rng
        );
    }
}
