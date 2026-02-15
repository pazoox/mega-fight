'use client'

import React from 'react'
import ArenaForm from '@/components/admin/ArenaForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewArenaPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      <ArenaForm />
    </div>
  )
}
