import { Suspense } from 'react'
import { StreamRecorderClient } from '@/components/admin/recorder/StreamRecorderClient'
import { Skeleton } from '@/components/ui/skeleton'

type PageProps = {
    params: Promise<{
        streamId: string
    }>
}

export default async function StreamRecorderPage({ params }: PageProps) {
    const { streamId } = await params

    return (
        <div className="h-screen w-full bg-background overflow-hidden flex flex-col">
            <Suspense fallback={<RecorderSkeleton />}>
                <StreamRecorderClient streamId={streamId} />
            </Suspense>
        </div>
    )
}

function RecorderSkeleton() {
    return (
        <div className="h-full w-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
    )
}
