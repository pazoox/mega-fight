'use client';

import { useParams } from 'next/navigation';
import ChallengeForm from '@/components/admin/ChallengeForm';

export default function EditChallengePage() {
  const params = useParams();
  const id = params.id as string;

  return <ChallengeForm challengeId={id} />;
}
