import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUser(request: Request) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return null
    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return null
    return user
}

export async function GET(request: Request) {
    try {
        const user = await getUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Fetch comments made by user
        // Assuming table 'comments' has user_id, content, context, created_at
        const { data: comments, error } = await supabaseAdmin
            .from('comments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
             // If table doesn't exist yet, return empty array instead of crashing
             if (error.code === '42P01') return NextResponse.json([])
             throw error
        }

        return NextResponse.json(comments || [])

    } catch (error) {
        console.error('Error fetching comments:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
