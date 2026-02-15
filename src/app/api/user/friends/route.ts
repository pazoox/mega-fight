import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        const user = await getUser(request)
        if (!user) {
            console.log('Unauthorized request to /api/user/friends')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')

        // Search for users to add
        if (search) {
            const { data: users } = await supabaseAdmin
                .from('profiles')
                .select('id, username, avatar_url')
                .ilike('username', `%${search}%`)
                .neq('id', user.id) // Don't show self
                .limit(10)
            
            return NextResponse.json(users || [])
        }

        // List friends
        // We need to find rows where user is either requester or receiver
        const { data: relationships, error } = await supabaseAdmin
            .from('friends')
            .select(`
                id,
                status,
                created_at,
                requester:requester_id(id, username, avatar_url),
                receiver:receiver_id(id, username, avatar_url)
            `)
            .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)

        if (error) {
            console.error('Supabase error fetching friends:', error)
            throw error
        }

        // Format for frontend
        const formatted = relationships.map((rel: any) => {
            // Guard clause for missing related data
            if (!rel.requester || !rel.receiver) {
                console.warn('Missing requester or receiver data for relationship:', rel.id)
                return null
            }

            const isRequester = rel.requester.id === user.id
            const friend = isRequester ? rel.receiver : rel.requester
            return {
                id: rel.id, // Relationship ID
                friendId: friend.id,
                username: friend.username,
                avatarUrl: friend.avatar_url,
                status: rel.status,
                isRequester, // To know if I sent the invite or received it
                createdAt: rel.created_at
            }
        }).filter(Boolean) // Remove nulls

        return NextResponse.json(formatted)

    } catch (error) {
        console.error('Error fetching friends:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { targetUserId } = await request.json()

        if (!targetUserId) return NextResponse.json({ error: 'Target user required' }, { status: 400 })

        // Check if relationship already exists
        const { data: existing } = await supabaseAdmin
            .from('friends')
            .select('*')
            .or(`and(requester_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
            .single()

        if (existing) {
            return NextResponse.json({ error: 'Relationship already exists' }, { status: 400 })
        }

        // Create request
        const { data, error } = await supabaseAdmin
            .from('friends')
            .insert({
                requester_id: user.id,
                receiver_id: targetUserId,
                status: 'pending'
            })
            .select()
            .single()

        if (error) throw error

        // Get sender profile for notification
        const { data: senderProfile } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()

        // Create Notification for Receiver
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: targetUserId,
                type: 'friend_request',
                title: 'New Friend Request',
                message: `${senderProfile?.username || 'Someone'} wants to be your friend!`,
                data: { friend_id: user.id },
                read: false
            })

        return NextResponse.json({ success: true, data })

    } catch (error) {
        console.error('Error adding friend:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const user = await getUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { relationshipId, action } = await request.json() // action: 'accept' | 'reject'

        if (!relationshipId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

        if (action === 'reject') {
            await supabaseAdmin.from('friends').delete().eq('id', relationshipId)
            return NextResponse.json({ success: true, status: 'rejected' })
        }

        if (action === 'accept') {
            const { data, error } = await supabaseAdmin
                .from('friends')
                .update({ status: 'accepted' })
                .eq('id', relationshipId)
                .select()
                .single()

            if (error) throw error

            // Notify Requester
            const { data: acceptorProfile } = await supabaseAdmin
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single()

            if (data.requester_id) {
                 await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: data.requester_id,
                    type: 'friend_request', // Or a new type 'friend_accepted' but 'friend_request' is fine for generic friend stuff
                    title: 'Friend Request Accepted',
                    message: `${acceptorProfile?.username || 'User'} accepted your friend request!`,
                    data: { friend_id: user.id },
                    read: false
                })
            }

            return NextResponse.json({ success: true, data })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('Error updating friend:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
