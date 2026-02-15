
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PlayCupOptions = {
  skipRedirect?: boolean;
  seed?: string;
};

export function usePlayCup() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const playCup = async (cup: any, options?: PlayCupOptions) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cups/generate-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cupId: cup.id,
          seed: options?.seed && options.seed.trim().length > 0 ? options.seed.trim() : undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create tournament');
      }

      const { tournamentId } = await res.json();

      // 6. Redirect
      if (!options?.skipRedirect) {
        router.push(`/tournaments/${tournamentId}`);
      }

      return tournamentId;

    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = (cup: any) => {
    // Generate a valid UUID for the room
    const roomId = crypto.randomUUID();
    router.push(`/fight/room/${roomId}?cupId=${cup.id}`);
  };

  return { playCup, createRoom, isLoading };
}
