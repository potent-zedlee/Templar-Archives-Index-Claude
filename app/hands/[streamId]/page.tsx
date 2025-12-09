import { getStreamAndHands } from '@/app/actions/public-replayer'
import { HandReplayer } from '@/components/features/hand-replayer/HandReplayer'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ streamId: string }>
}

export default async function HandReplayerPage({ params }: PageProps) {
    const { streamId } = await params
    const result = await getStreamAndHands(streamId)

    if (!result.success || !result.data) {
        // Handle error more gracefully?
        console.error(result.error)
        return notFound()
    }

    const { stream, hands } = result.data

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header / Nav could reside in Layout, but we want full screen feel? */}
            <HandReplayer stream={stream} hands={hands} />
        </div>
    )
}
