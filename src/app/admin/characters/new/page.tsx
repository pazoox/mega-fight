import CharacterForm from '@/components/admin/CharacterForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewCharacterPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      <CharacterForm />
    </div>
  )
}
