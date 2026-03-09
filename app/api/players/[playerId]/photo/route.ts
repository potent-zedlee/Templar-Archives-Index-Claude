/**
 * Player Photo API Route (Supabase Version)
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin/server'

interface RouteParams {
  params: Promise<{ playerId: string }>
}

const BUCKET_NAME = 'player-photos'

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { playerId } = await params
    const admin = createAdminClient()

    const { data: player } = await admin.from('players').select('id').eq('id', playerId).single()
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${playerId}-${Date.now()}.${fileExt}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { data: uploadData, error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = admin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName)

    await admin.from('players').update({
      photo_url: publicUrl,
      updated_at: new Date().toISOString()
    }).eq('id', playerId)

    return NextResponse.json({ success: true, photoUrl: publicUrl })
  } catch (error: any) {
    console.error('[Player Photo Upload] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
