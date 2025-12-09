import { notFound } from 'next/navigation'
import { getStreamAndHands } from '@/app/actions/public-replayer'
import { HandReplayer } from '@/components/features/hand-replayer/HandReplayer'

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function HandReplayerPage({ params }: PageProps) {
    const { id } = await params

    const { success, data, error } = await getStreamAndHands(id)

    if (!success || !data) {
        if (error === 'Stream not found') {
            notFound()
        }
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Error Loading Replayer</h1>
                    <p className="text-muted-foreground">{error || 'Unknown error occurred'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-full bg-background text-foreground overflow-hidden">
            <HandReplayer
                stream={data.stream}
                hands={data.hands}
            />
        </div>
    )
}
