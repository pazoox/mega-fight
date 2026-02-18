import CharacterForm from '@/components/admin/CharacterForm'

interface NewCharacterPageProps {
  searchParams?: {
    groupId?: string
  }
}

export default function NewCharacterPage({ searchParams }: NewCharacterPageProps) {
  const groupId = typeof searchParams?.groupId === 'string' ? searchParams.groupId : undefined

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      <CharacterForm initialGroupId={groupId} />
    </div>
  )
}
