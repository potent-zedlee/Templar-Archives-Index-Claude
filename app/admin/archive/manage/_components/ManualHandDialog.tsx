'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ManualHandRecorder } from '@/components/features/hand-recorder/ManualHandRecorder'

interface ManualHandDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    streamId: string
    streamName: string
}

export function ManualHandDialog({
    open,
    onOpenChange,
    streamId,
    streamName,
}: ManualHandDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-4">
                <DialogHeader>
                    <DialogTitle>Record Hand - {streamName}</DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    <ManualHandRecorder streamId={streamId} streamName={streamName} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
