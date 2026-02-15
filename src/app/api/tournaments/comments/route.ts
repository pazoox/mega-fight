import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
 
 const supabaseAdmin = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SERVICE_ROLE_KEY!
 );
 
const DATA_FILE = path.join(process.cwd(), 'src/data/tournament-comments.json');

function readLocalComments(tid: string) {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const all = JSON.parse(raw || '[]');
    return Array.isArray(all) ? all.filter((c: any) => c.tournament_id === tid) : [];
  } catch {
    return [];
  }
}

function appendLocalComment(comment: any) {
  const current = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8') || '[]') : [];
  current.unshift(comment);
  fs.writeFileSync(DATA_FILE, JSON.stringify(current, null, 2), 'utf-8');
}

 export async function GET(request: Request) {
   try {
     const { searchParams } = new URL(request.url)
     const tid = searchParams.get('tid')
     if (!tid) return NextResponse.json({ error: 'tid is required' }, { status: 400 })
 
     const { data, error } = await supabaseAdmin
       .from('comments')
       .select('*, profiles(username, avatar_url)')
      .eq('tournament_id', tid)
       .order('created_at', { ascending: false })
 
    const local = readLocalComments(tid)
    if (error) {
      if (error.code === '42P01' || String(error.message || '').includes('tournament_id')) {
        return NextResponse.json(local)
      }
      throw error
    }
 
    const dbData = Array.isArray(data) ? data : []
    const merged = [...local, ...dbData].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return NextResponse.json(merged)
   } catch (e: any) {
     console.error('GET /api/tournaments/comments error', e)
     return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 })
   }
 }
 
 export async function POST(request: Request) {
   try {
     const user = await getUser(request)
     if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
     const body = await request.json()
     const { tid, content } = body || {}
     if (!tid || !content || String(content).trim() === '') {
       return NextResponse.json({ error: 'tid and content are required' }, { status: 400 })
     }
 
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        user_id: user.id,
        tournament_id: tid,
        content
      })
      .select('*, profiles(username, avatar_url)')
      .single()
 
    if (error) {
      if (error.code === '42P01' || String(error.message || '').includes('tournament_id')) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('username, avatar_url').eq('id', user.id).single()
        const localComment = {
          id: crypto.randomUUID(),
          user_id: user.id,
          tournament_id: tid,
          content,
          created_at: new Date().toISOString(),
          profiles: profile || null
        }
        appendLocalComment(localComment)
        return NextResponse.json(localComment)
      }
      throw error
    }
 
    try {
      appendLocalComment({
        id: data.id,
        user_id: data.user_id,
        tournament_id: tid,
        content: data.content,
        created_at: data.created_at || new Date().toISOString(),
        profiles: data.profiles || null
      })
    } catch {}
    return NextResponse.json(data)
   } catch (e: any) {
     console.error('POST /api/tournaments/comments error', e)
     return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 })
   }
 }
