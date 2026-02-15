import { createClient } from './supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getUser(request?: Request) {
    // 1. Try Cookies via Supabase SSR (Standard for Next.js App Router)
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!error && user) return user
    } catch (e) {
        // cookies() might fail if not in a request context or during static generation
        // console.warn('Cookie auth check skipped:', e)
    }

    // 2. Fallback to Authorization Header (if request provided)
    if (request) {
        const authHeader = request.headers.get('Authorization')
        if (authHeader) {
            const token = authHeader.split(' ')[1]
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
            if (!error && user) return user
        }
    }

    return null
}
