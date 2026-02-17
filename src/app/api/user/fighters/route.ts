import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Character } from '@/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get user from token
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
        
        // Fetch Profile to get username
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()
            
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
            
        const groupName = `${profile.username}'s Group`
        
        // Find Group ID
        const { data: group } = await supabaseAdmin
            .from('groups')
            .select('id')
            .eq('name', groupName)
            .single()
        
        if (!group) return NextResponse.json([]) 
        
        // Fetch Fighters
        const { data: fighters } = await supabaseAdmin
            .from('characters')
            .select('*')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })

        // Map to frontend structure
        const mappedFighters = (fighters || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            alias: row.alias,
            description: row.description,
            groupId: row.group_id,
            specs: row.specs,
            stages: row.stages,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            wins: row.wins || 0,
            matches: row.matches || 0,
            cardLayout: row.card_layout
        }))
        
        return NextResponse.json(mappedFighters)
    } catch (error) {
        console.error('Error fetching user fighters:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            
        const body: Partial<Character> = await request.json()
        
        // 1. Get Profile (Check Coins)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        
        if (profileError || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
            
        if (profile.coins < 10) {
            return NextResponse.json({ error: 'Insufficient coins. You need 10 coins to create a fighter.' }, { status: 402 })
        }
        
        // 2. Find or Create Group
        const groupName = `${profile.username}'s Group`
        let groupId = null
        
        const { data: existingGroup } = await supabaseAdmin
            .from('groups')
            .select('id')
            .eq('name', groupName)
            .single()
        
        if (existingGroup) {
            groupId = existingGroup.id
        } else {
            // Create Group
            const { data: newGroup, error: groupError } = await supabaseAdmin
                .from('groups')
                .insert({
                    name: groupName,
                    type: 'User',
                    is_active: true
                })
                .select('id')
                .single()
            
            if (groupError) {
                console.error('Group creation error:', groupError)
                return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
            }
            groupId = newGroup.id
        }
        
        // 3. Create Fighter
        // Map body to DB columns
        const dbInsert = {
            id: crypto.randomUUID(),
            name: body.name,
            alias: body.alias,
            description: body.description,
            group_id: groupId,
            specs: body.specs,
            stages: body.stages,
            is_active: true,
            wins: 0,
            matches: 0,
            card_layout: body.cardLayout
        }
        
        const { data: fighterData, error: fighterError } = await supabaseAdmin
            .from('characters')
            .insert(dbInsert)
            .select()
            .single()
        
        if (fighterError) {
            console.error('Fighter creation error:', fighterError)
            return NextResponse.json({ error: 'Failed to create fighter' }, { status: 500 })
        }
            
        // 4. Deduct Coins
        // Note: In a production app, we would use an RPC to do this transactionally
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ coins: profile.coins - 10 })
            .eq('id', user.id)
        
        if (updateError) {
            console.error('Failed to deduct coins after fighter creation:', updateError)
            // We should probably rollback fighter creation here, but for now we log it
        }
        
        return NextResponse.json({ success: true, fighter: fighterData })
        
    } catch (error) {
        console.error('Error creating fighter:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const user = await getUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const body: Partial<Character> = await request.json()
        
        if (!body.id) {
            return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
        }

        // 1. Get Profile & Group Name
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()
            
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
            
        const groupName = `${profile.username}'s Group`
        
        // 2. Find Group ID
        const { data: group } = await supabaseAdmin
            .from('groups')
            .select('id')
            .eq('name', groupName)
            .single()
            
        if (!group) return NextResponse.json({ error: 'User group not found' }, { status: 404 })

        // 3. Verify Ownership (Check if character belongs to user's group)
        const { data: existingChar } = await supabaseAdmin
            .from('characters')
            .select('id')
            .eq('id', body.id)
            .eq('group_id', group.id)
            .single()

        if (!existingChar) {
            return NextResponse.json({ error: 'Fighter not found or you do not have permission to edit it' }, { status: 403 })
        }

        // 4. Update Fighter
        const dbUpdate = {
            name: body.name,
            alias: body.alias,
            description: body.description,
            // canon_scale: body.canonScale, // Users usually shouldn't change this, but keeping it flexible for now
            specs: body.specs,
            stages: body.stages,
            card_layout: body.cardLayout,
            updated_at: new Date().toISOString()
        }

        const { data: fighterData, error: updateError } = await supabaseAdmin
            .from('characters')
            .update(dbUpdate)
            .eq('id', body.id)
            .select()
            .single()

        if (updateError) {
            console.error('Fighter update error:', updateError)
            return NextResponse.json({ error: 'Failed to update fighter' }, { status: 500 })
        }

        return NextResponse.json({ success: true, fighter: fighterData })

    } catch (error) {
        console.error('Error updating fighter:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await getUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('username, coins')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        const groupName = `${profile.username}'s Group`

        const { data: group } = await supabaseAdmin
            .from('groups')
            .select('id')
            .eq('name', groupName)
            .single()

        if (!group) {
            return NextResponse.json({ error: 'User group not found' }, { status: 404 })
        }

        const { data: fighter } = await supabaseAdmin
            .from('characters')
            .select('id')
            .eq('id', id)
            .eq('group_id', group.id)
            .single()

        if (!fighter) {
            return NextResponse.json({ error: 'Fighter not found or you do not have permission to delete it' }, { status: 403 })
        }

        const { error: deleteError } = await supabaseAdmin
            .from('characters')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Fighter delete error:', deleteError)
            return NextResponse.json({ error: 'Failed to delete fighter' }, { status: 500 })
        }

        const newCoins = (profile.coins || 0) + 10

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ coins: newCoins })
            .eq('id', user.id)

        if (updateError) {
            console.error('Failed to refund coins after fighter deletion:', updateError)
        }

        return NextResponse.json({ success: true, coins: newCoins })
    } catch (error) {
        console.error('Error deleting fighter:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
