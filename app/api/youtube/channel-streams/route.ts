import { NextRequest, NextResponse } from 'next/server'
import {
  parseChannelIdentifier,
  getChannelIdFromIdentifier,
  getChannelLiveStreams,
  type YouTubeVideo,
} from '@/lib/youtube/youtube-api'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelUrl, maxResults = 25, inputMethod = 'url' } = body

    if (!channelUrl) {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      )
    }

    // Get API key from environment
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY is not set')
      return NextResponse.json(
        { error: 'YouTube API is not configured' },
        { status: 500 }
      )
    }

    let channelId: string

    if (inputMethod === 'id') {
      // Direct channel ID input - no API call needed
      if (!channelUrl.match(/^UC[a-zA-Z0-9_-]{22}$/)) {
        return NextResponse.json(
          { error: 'Invalid channel ID format. Must start with "UC" and be 24 characters long.' },
          { status: 400 }
        )
      }
      channelId = channelUrl
      // Using direct channel ID
    } else {
      // Channel URL - need to resolve to channel ID
      const identifier = parseChannelIdentifier(channelUrl)
      if (!identifier) {
        return NextResponse.json(
          { error: 'Invalid channel URL format' },
          { status: 400 }
        )
      }

      const resolvedChannelId = await getChannelIdFromIdentifier(identifier, apiKey)
      if (!resolvedChannelId) {
        return NextResponse.json(
          { error: 'Channel not found' },
          { status: 404 }
        )
      }
      channelId = resolvedChannelId
      // Resolved channel ID from URL
    }

    // Fetch live streams
    const videos: YouTubeVideo[] = await getChannelLiveStreams(
      channelId,
      apiKey,
      Math.min(maxResults, 500) // Cap at 500
    )

    return NextResponse.json({
      success: true,
      channelId,
      videos,
      count: videos.length,
    })
  } catch (error: any) {
    console.error('Error fetching channel streams:', error)

    // Check for YouTube API specific errors
    if (error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'YouTube API quota exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch channel streams' },
      { status: 500 }
    )
  }
}
