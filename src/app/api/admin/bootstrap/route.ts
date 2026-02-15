import { NextResponse } from 'next/server'
import { createClient as createSRClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getUser } from '@/lib/auth'

async function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) {
    return createAdminClient(url, key, { auth: { persistSession: false } })
  }
  return await createSRClient()
}

export async function POST(request: Request) {
  try {
    const requester = await getUser(request)
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabaseAdmin = await getAdminClient()

    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    const requesterEmail = (requester as any)?.email
    const isSelf = requesterEmail && requesterEmail.toLowerCase() === String(email).toLowerCase()

    if ((count || 0) > 0 && !isSelf) {
      return NextResponse.json({ error: 'Admins already exist. Only self-bootstrap allowed.' }, { status: 403 })
    }

    const targetId = (requester as any)?.id
    if (!targetId) return NextResponse.json({ error: 'Requester not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        { id: targetId, role: 'admin', is_banned: false, coins: 0, username: (requesterEmail || '').split('@')[0] || 'admin' }, 
        { onConflict: 'id' }
      )
      .select('id, username, role')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, profile: data })
  } catch (error: any) {
    return NextResponse.json({ error: 'Bootstrap failed' }, { status: 200 })
  }
}
