'use client'

import GroupForm from '@/components/admin/GroupForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function EditGroupPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/groups" className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="text-gray-400" />
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
          Edit Group
        </h1>
      </div>
      
      <GroupForm groupId={id} />
    </div>
  )
}
