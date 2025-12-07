/**
 * YouTube Data API v3 Utilities
 * Fetch live streams from YouTube channels
 */

export interface YouTubeVideo {
  id: string
  title: string
  url: string
  thumbnail: string
  publishedAt: string
  duration?: string
  description?: string
}

/**
 * Parse YouTube channel ID from various URL formats
 * Supports:
 * - https://www.youtube.com/@channelname
 * - https://www.youtube.com/channel/UC...
 * - https://www.youtube.com/c/channelname
 * - Direct channel ID (UC...)
 */
export function parseChannelIdentifier(input: string): { type: 'id' | 'username' | 'custom', value: string } | null {
  try {
    // Remove whitespace
    input = input.trim()

    // Direct channel ID (starts with UC)
    if (input.startsWith('UC') && input.length === 24) {
      return { type: 'id', value: input }
    }

    // Try to parse as URL
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
      const url = new URL(input.startsWith('http') ? input : `https://${input}`)

      // @username format
      const atMatch = url.pathname.match(/^\/@(.+)/)
      if (atMatch) {
        return { type: 'username', value: atMatch[1] }
      }

      // /channel/ID format
      const channelMatch = url.pathname.match(/^\/channel\/([^\/]+)/)
      if (channelMatch) {
        return { type: 'id', value: channelMatch[1] }
      }

      // /c/customname format
      const customMatch = url.pathname.match(/^\/c\/([^\/]+)/)
      if (customMatch) {
        return { type: 'custom', value: customMatch[1] }
      }

      // /user/username format
      const userMatch = url.pathname.match(/^\/user\/([^\/]+)/)
      if (userMatch) {
        return { type: 'username', value: userMatch[1] }
      }
    }

    // Assume it's a username if no format matched
    if (input.length > 0 && !input.includes('/')) {
      return { type: 'username', value: input }
    }

    return null
  } catch (error) {
    console.error('Error parsing channel identifier:', error)
    return null
  }
}

/**
 * Get channel ID from username or custom URL
 */
export async function getChannelIdFromIdentifier(
  identifier: { type: 'id' | 'username' | 'custom', value: string },
  apiKey: string
): Promise<string | null> {
  // If already an ID, return it
  if (identifier.type === 'id') {
    return identifier.value
  }

  try {
    // Try forHandle parameter for @username format (most accurate)
    if (identifier.type === 'username') {
      // Remove @ if present
      const handle = identifier.value.replace(/^@/, '')
      const handleResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?` +
        `part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
      )

      if (handleResponse.ok) {
        const handleData = await handleResponse.json()
        if (handleData.items && handleData.items.length > 0) {
          console.log('Found channel via forHandle:', handleData.items[0].id)
          return handleData.items[0].id
        }
      }

      // Also try forUsername parameter
      const usernameResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?` +
        `part=id&forUsername=${encodeURIComponent(identifier.value)}&key=${apiKey}`
      )

      if (usernameResponse.ok) {
        const usernameData = await usernameResponse.json()
        if (usernameData.items && usernameData.items.length > 0) {
          console.log('Found channel via forUsername:', usernameData.items[0].id)
          return usernameData.items[0].id
        }
      }
    }

    // Fallback: Search for channel by name (less accurate)
    const searchQuery = identifier.type === 'username' ? identifier.value : identifier.value
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&q=${encodeURIComponent(searchQuery)}&type=channel&maxResults=5&key=${apiKey}`
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('YouTube API error:', errorData)
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.items && data.items.length > 0) {
      // Log all found channels for debugging
      console.log('Search results:', data.items.map((item: any) => ({
        title: item.snippet.title,
        channelId: item.snippet.channelId
      })))

      // Return the first result
      return data.items[0].snippet.channelId || data.items[0].id?.channelId
    }

    console.log('No channel found for identifier:', identifier)
    return null
  } catch (error) {
    console.error('Error getting channel ID:', error)
    return null
  }
}

/**
 * Fetch completed live streams from a YouTube channel with pagination support
 */
export async function getChannelLiveStreams(
  channelId: string,
  apiKey: string,
  maxResults: number = 50
): Promise<YouTubeVideo[]> {
  try {
    const allVideos: YouTubeVideo[] = []
    let nextPageToken: string | undefined = undefined
    const perPage = 50 // YouTube API max per request

    // Fetch pages until we have enough videos
    while (allVideos.length < maxResults) {
      const remaining = maxResults - allVideos.length
      const pageSize = Math.min(remaining, perPage)

      const url = new URL('https://www.googleapis.com/youtube/v3/search')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('channelId', channelId)
      url.searchParams.set('eventType', 'completed')
      url.searchParams.set('type', 'video')
      url.searchParams.set('order', 'date')
      url.searchParams.set('maxResults', pageSize.toString())
      url.searchParams.set('key', apiKey)

      if (nextPageToken) {
        url.searchParams.set('pageToken', nextPageToken)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || `YouTube API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.items || data.items.length === 0) {
        break // No more videos
      }

      // Transform and add to collection
      const videos: YouTubeVideo[] = data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
        publishedAt: item.snippet.publishedAt,
        description: item.snippet.description,
      }))

      allVideos.push(...videos)

      // Check if there are more pages
      if (!data.nextPageToken) {
        break // No more pages
      }

      nextPageToken = data.nextPageToken
    }

    return allVideos
  } catch (error) {
    console.error('Error fetching live streams:', error)
    throw error
  }
}

/**
 * Fetch all videos from a channel's uploads playlist
 * This gets ALL videos, not just live streams
 */
export async function getChannelUploads(
  channelId: string,
  apiKey: string,
  maxResults: number = 50
): Promise<YouTubeVideo[]> {
  try {
    // First, get the channel's uploads playlist ID
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?` +
      `part=contentDetails&id=${channelId}&key=${apiKey}`
    )

    if (!channelResponse.ok) {
      throw new Error(`YouTube API error: ${channelResponse.status}`)
    }

    const channelData = await channelResponse.json()

    if (!channelData.items || channelData.items.length === 0) {
      return []
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // Fetch videos from uploads playlist
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?` +
      `part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`
    )

    if (!playlistResponse.ok) {
      throw new Error(`YouTube API error: ${playlistResponse.status}`)
    }

    const playlistData = await playlistResponse.json()

    if (!playlistData.items || playlistData.items.length === 0) {
      return []
    }

    // Transform to our format
    const videos: YouTubeVideo[] = playlistData.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
    }))

    return videos
  } catch (error) {
    console.error('Error fetching channel uploads:', error)
    throw error
  }
}
