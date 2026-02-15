 'use client'
 
import Link from 'next/link'
import { Flame, LogIn, User, Coins, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import { Notifications } from '@/components/Notifications'

interface NavbarProps {
  active?: 'play' | 'explore' | 'ranking' | 'admin'
}

export function Navbar({ active }: NavbarProps) {
  const { user, profile, signOut } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Flame className="text-orange-500 group-hover:scale-110 transition-transform" size={28} />
          <span className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 pr-2">
            MEGA FIGHT
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-bold tracking-widest text-zinc-400">
          <Link href="/fight" className={`hover:text-white transition-colors ${active === 'play' ? 'text-white border-b-2 border-orange-500 pb-1' : ''}`}>PLAY</Link>
          <Link href="/explore" className={`hover:text-white transition-colors ${active === 'explore' ? 'text-white border-b-2 border-orange-500 pb-1' : ''}`}>EXPLORE</Link>
          <Link href="/leaderboard" className={`hover:text-white transition-colors ${active === 'ranking' ? 'text-white border-b-2 border-orange-500 pb-1' : ''}`}>RANKING</Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Notifications />
              
              <div className="relative">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-3 hover:bg-zinc-900 px-3 py-2 rounded-xl transition-colors"
                >
                <div className="flex flex-col items-end">
                   <span className="text-sm font-bold text-white">{profile?.username || user.email?.split('@')[0]}</span>
                   <span className="text-xs text-yellow-500 flex items-center gap-1">
                     <Coins size={10} /> {profile?.coins || 0}
                   </span>
                </div>
                <div className="w-10 h-10 bg-zinc-800 rounded-full border border-zinc-700 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-zinc-500" size={20} />
                  )}
                </div>
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden py-1">
                   <Link 
                    href="/profile" 
                    className="flex items-center gap-2 px-4 py-3 hover:bg-zinc-800 text-sm text-zinc-300 hover:text-white transition-colors"
                    onClick={() => setShowDropdown(false)}
                   >
                     <User size={16} /> Profile
                   </Link>
                   <Link
                    href="/admin/groups"
                    className="flex items-center gap-2 px-4 py-3 hover:bg-zinc-800 text-sm text-orange-500 hover:text-orange-400 transition-colors"
                    onClick={() => setShowDropdown(false)}
                   >
                     <LayoutDashboard size={16} className="text-orange-500" /> ADMIN
                   </Link>
                   
                   <button 
                    onClick={() => {
                      signOut()
                      setShowDropdown(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-zinc-800 text-sm text-red-400 hover:text-red-300 transition-colors border-t border-zinc-800"
                   >
                     <LogOut size={16} /> Logout
                   </button>
                </div>
              )}
            </div>
          </div>
          ) : (
            <Link href="/login" className="px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform text-sm flex items-center gap-2">
              <LogIn size={16} /> LOGIN
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
