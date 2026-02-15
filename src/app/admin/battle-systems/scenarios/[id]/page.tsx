'use client';

import { useParams } from 'next/navigation';
import ChallengeForm from '@/components/admin/ChallengeForm';

export default function EditScenarioPage() {
  const params = useParams();
  const id = params.id as string;

  return <ChallengeForm challengeId={id} redirectPath="/admin/battle-systems/scenarios" />;
}
