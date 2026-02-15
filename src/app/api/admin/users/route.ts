import { NextResponse } from 'next/server'
import { createClient as createSRClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) {
    return createAdminClient(url, key, { auth: { persistSession: false } })
  }
  return await createSRClient()
}

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json([], { status: 200 })
    const admin = createAdminClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await admin
      .from('profiles')
      .select('id, username, avatar_url, role, is_banned, coins')
      .order('username', { ascending: true })
    try { console.log('Admin client error:', !!error, 'rows:', Array.isArray(data) ? data.length : 0) } catch {}
    if (error) return NextResponse.json([], { status: 200 })
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = await getAdminClient()

    const { data: requester } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    const email = (user as any)?.email?.toLowerCase() || ''
    const isWhitelisted = email === 'pazin1999@gmail.com'
    if (requester?.role !== 'admin' && !isWhitelisted) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (isWhitelisted && requester?.role !== 'admin') {
      await supabaseAdmin.from('profiles').upsert({ id: (user as any).id, role: 'admin' }, { onConflict: 'id' })
    }

    const body = await request.json()
    const { id, role, is_banned, grantCoins } = body || {}
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    let updated: any = {}

    if (typeof role !== 'undefined' || typeof is_banned !== 'undefined') {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          ...(typeof role !== 'undefined' ? { role } : {}),
          ...(typeof is_banned !== 'undefined' ? { is_banned } : {})
        })
        .eq('id', id)
        .select('id, username, avatar_url, role, is_banned, coins')
        .single()
      if (error) throw error
      updated = data
    }

    if (grantCoins && Number(grantCoins) > 0) {
      const { data: current } = await supabaseAdmin
        .from('profiles')
        .select('coins, username')
        .eq('id', id)
        .single()
      const newCoins = (current?.coins || 0) + Number(grantCoins)
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ coins: newCoins })
        .eq('id', id)
        .select('id, username, avatar_url, role, is_banned, coins')
        .single()
      if (error) throw error
      updated = data

      await supabaseAdmin.from('notifications').insert({
        user_id: id,
        type: 'reward',
        title: 'Coins Received',
        message: `Você recebeu ${Number(grantCoins)} coins do Admin.`,
        data: { amount: Number(grantCoins) },
        read: false
      })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: 'Update failed' }, { status: 200 })
  }
}
