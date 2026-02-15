import { Character } from '@/types';

export interface Team {
    id: string;
    name: string;
    members: Character[];
    logo?: string;
    color?: string;
}

export interface Match {
    id: string;
    p1: Team;
    p2: Team;
    winner: Team | null;
    round: number;
    arena?: any;
    config?: any;
    tournamentState?: BattleSession; // Self-reference for persistence
    isThirdPlaceMatch?: boolean;
}

export interface BattleSession {
    matches: Match[];
    currentMatchIndex: number;
    history: Match[];
    champion: Team | null;
    type: 'bracket' | 'queue' | 'last-standing';
    remainingTeams?: Team[];
}

export function draftCharacter(pool: Character[], criteria: any): Character | null {
    if (!pool || pool.length === 0) return null;
    // Simple random draft for now, or filter by criteria
    const valid = pool.filter(c => {
        if (criteria?.excludeIds && criteria.excludeIds.includes(c.id)) return false;
        return true;
    });
    if (valid.length === 0) return null;
    return valid[Math.floor(Math.random() * valid.length)];
}

export function generateBracket(
    characters: Character[], 
    teamSize: '1x1' | '2v2' | '3v3' | '4v4', 
    bracketSize: number, 
    stageMode: string,
    rng?: () => number
): BattleSession {
    // 1. Create Teams
    const teams: Team[] = [];
    const rand = rng || Math.random;
    const size = teamSize === '4v4' ? 4 : teamSize === '3v3' ? 3 : teamSize === '2v2' ? 2 : 1;
    const shuffled = [...characters].sort(() => rand() - 0.5);
    
    // We need enough characters for 'bracketSize' teams.
    // If not enough, reduce bracket size or fill with duplicates (not ideal).
    // Let's assume filteredChars has enough.
    
    for (let i = 0; i < bracketSize; i++) {
        const members: Character[] = [];
        for (let j = 0; j < size; j++) {
            if (shuffled.length > 0) members.push(shuffled.pop()!);
        }
        
        if (members.length === size) {
            const idSuffix = Math.floor(rand() * 1e9).toString(36);
            teams.push({
                id: `team-${i}-${idSuffix}`,
                name: members.map(c => c.name).join(' & '),
                members,
                logo: members[0].stages[0].thumbnail || members[0].stages[0].image
            });
        }
    }
    
    // 2. Generate First Round Matches
    const matches: Match[] = [];
    const genId = () => `match-${Math.floor(rand() * 1e9).toString(36)}`;
    
    for (let i = 0; i < teams.length; i += 2) {
        const t1 = teams[i];
        const t2 = teams[i+1];
        
        if (t1 && t2) {
             matches.push({
                id: genId(),
                p1: t1,
                p2: t2,
                winner: null,
                round: 0
            });
        }
    }
    
    return {
        matches,
        currentMatchIndex: 0,
        history: [],
        champion: null,
        type: 'bracket'
    };
}

export function generateMatchQueue(
    characters: Character[],
    teamSize: '1x1' | '2v2' | '3v3' | '4v4',
    count: number,
    stageMode: string,
    rng?: () => number
): BattleSession {
    // Just a sequence of unrelated matches (e.g. for simple queue)
    // Or maybe "King of the Hill"?
    // For now, let's implement as a list of independent matches.
    
    const teams: Team[] = [];
    const rand = rng || Math.random;
    const size = teamSize === '4v4' ? 4 : teamSize === '3v3' ? 3 : teamSize === '2v2' ? 2 : 1;
    const shuffled = [...characters].sort(() => rand() - 0.5);
    
    // Generate as many teams as possible
    while (shuffled.length >= size) {
         const members: Character[] = [];
        for (let j = 0; j < size; j++) {
            members.push(shuffled.pop()!);
        }
        const idSuffix = Math.floor(rand() * 1e9).toString(36);
        teams.push({
            id: `team-${idSuffix}`,
            name: members.map(c => c.name).join(' & '),
            members,
            logo: members[0].stages[0].thumbnail || members[0].stages[0].image
        });
    }
    
    const matches: Match[] = [];
    const genId = () => `match-${Math.floor(rand() * 1e9).toString(36)}`;
    
    for (let i = 0; i < teams.length; i += 2) {
        const t1 = teams[i];
        const t2 = teams[i+1];
        if (t1 && t2) {
            matches.push({
                id: genId(),
                p1: t1,
                p2: t2,
                winner: null,
                round: 0
            });
        }
    }
    
    return {
        matches,
        currentMatchIndex: 0,
        history: [],
        champion: null,
        type: 'queue'
    };
}

export function advanceTournament(tournament: BattleSession, winner: Team): BattleSession {
    const currentMatch = tournament.matches[tournament.currentMatchIndex];
    const updatedMatch = { ...currentMatch, winner };
    
    // Update history
    const history = [...tournament.history, updatedMatch];
    
    // Update matches list (mark current as done)
    const matches = [...tournament.matches];
    matches[tournament.currentMatchIndex] = updatedMatch;
    
    // Check if tournament is already finished
    if (tournament.champion) {
        return tournament;
    }

    if (tournament.type === 'bracket') {
        // Bracket Logic
        
        // Are there more matches pending in the list?
        if (tournament.currentMatchIndex < matches.length - 1) {
            return {
                ...tournament,
                matches,
                history,
                currentMatchIndex: tournament.currentMatchIndex + 1
            };
        }
        
        // If no more matches in list, check if we need to generate next round
        const currentRound = updatedMatch.round;
        
        // Filter matches from current round
        const roundMatches = matches.filter(m => m.round === currentRound);
        
        // Check if all have winners
        if (roundMatches.every(m => m.winner)) {
             // Generate next round
             const nextRoundMatches: Match[] = [];
             const genId = () => `match-${Math.random().toString(36).substr(2, 9)}`;
             
             // If only 1 match in round, we have a champion!
             if (roundMatches.length === 1) {
                 return {
                     ...tournament,
                     matches,
                     history,
                     champion: winner
                 };
             }

             for (let i = 0; i < roundMatches.length; i += 2) {
                 const m1 = roundMatches[i];
                 const m2 = roundMatches[i+1];
                 
                 if (!m2) break; // Should not happen in strict bracket
                 
                 if (m1.winner && m2.winner) {
                     nextRoundMatches.push({
                         id: genId(),
                         p1: m1.winner,
                         p2: m2.winner,
                         winner: null,
                         round: currentRound + 1
                     });
                 }
             }
             
             if (nextRoundMatches.length === 0) {
                 // Should have been caught by length===1 check, but safety
                 return {
                     ...tournament,
                     matches,
                     history,
                     champion: winner
                 };
             }
             
             // Append next round matches
             const newMatches = [...matches, ...nextRoundMatches];
             
             return {
                 ...tournament,
                 matches: newMatches,
                 history,
                 currentMatchIndex: matches.length // Index of the first match of next round
             };
        }
        
        // If we are here, it means we finished the last match in the list, 
        // but not all matches in the round are done? 
        // This is impossible if we play sequentially and `matches` contains ALL matches of the round.
        // Yes, generateBracket generates ALL matches of round 0.
        // And we append ALL matches of round 1.
        // So we should be good.
        
        return { ...tournament, matches, history, champion: winner }; // Fallback

    } else {
        // Queue / Other types
        if (tournament.currentMatchIndex < matches.length - 1) {
             return {
                ...tournament,
                matches,
                history,
                currentMatchIndex: tournament.currentMatchIndex + 1
            };
        } else {
            return {
                ...tournament,
                matches,
                history,
                champion: winner
            };
        }
    }
}
