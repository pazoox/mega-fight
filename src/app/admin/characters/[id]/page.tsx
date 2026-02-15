'use client'

import CharacterForm from '@/components/admin/CharacterForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function EditCharacterPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      <CharacterForm characterId={id} />
    </div>
  )
}