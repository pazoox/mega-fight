'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Swords, Users, Shield, Home, LayoutDashboard, Workflow, Gamepad2 } from 'lucide-react'

const MENU_ITEMS = [
  {
    name: 'System',
    path: '/admin/system',
    icon: LayoutDashboard
  },
  {
    name: 'Scenarios',
    path: '/admin/battle-systems/scenarios',
    icon: Gamepad2
  },
  {
    name: 'Arenas',
    path: '/admin/arenas',
    icon: Shield
  },
  {
    name: 'Groups',
    path: '/admin/groups',
    icon: Users
  },
  {
    name: 'Fighters',
    path: '/admin/fighters',
    icon: Swords
  },
  {
    name: 'Modifiers',
    path: '/admin/modifiers',
    icon: Workflow
  }
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 h-screen bg-[#111] border-r border-[#222] flex flex-col fixed left-0 top-0 text-gray-300">
      <div className="p-6 border-b border-[#222]">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <LayoutDashboard className="text-orange-500" />
          <span>Mega Admin</span>
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.path)
          const Icon = item.icon
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive 
                  ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' 
                  : 'hover:bg-[#1a1a1a] hover:text-white'
                }`}
            >
              <Icon size={20} className={isActive ? 'text-orange-500' : 'text-gray-500 group-hover:text-white'} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#222]">
        <Link 
          href="/"
          className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-all"
        >
          <Home size={20} />
          <span>Back to Site</span>
        </Link>
      </div>
    </div>
  )
}
