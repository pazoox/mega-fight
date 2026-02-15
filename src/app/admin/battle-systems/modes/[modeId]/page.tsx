'use client';

import { useParams } from 'next/navigation';
import BattleModeForm from '@/components/admin/BattleModeForm';

export default function ModeEditorPage() {
  const params = useParams();
  const modeId = params.modeId as string;
  
  return <BattleModeForm modeId={modeId} />;
}
