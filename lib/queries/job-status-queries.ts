import { useEffect, useState } from 'react'
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'

export interface JobStatus {
    id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    result?: any
    errorMessage?: string
    startedAt?: any
    completedAt?: any
    createdAt: any
    updatedAt: any
    handsFound?: number
}

export function useJobStatus(jobId: string | null) {
    const [job, setJob] = useState<JobStatus | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!jobId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (job) setJob(null) // Only update if currently has value
            return
        }

        setLoading(true)
        const jobRef = doc(firestore, COLLECTION_PATHS.ANALYSIS_JOBS, jobId)

        const unsubscribe = onSnapshot(
            jobRef,
            (docIs) => {
                setLoading(false)
                if (docIs.exists()) {
                    setJob({ id: docIs.id, ...docIs.data() } as JobStatus)
                } else {
                    setError('Job not found')
                    setJob(null)
                }
            },
            (err) => {
                setLoading(false)
                console.error('Error fetching job status:', err)
                setError(err.message)
            }
        )

        return () => unsubscribe()
    }, [jobId, job])

    return { job, loading, error }
}

export function useStreamAnalysisStatus(streamId: string) {
    const [job, setJob] = useState<JobStatus | null>(null)
    const [loading, setLoading] = useState(() => !!streamId)

    useEffect(() => {
        if (!streamId) {
            // setLoading(false) // Handled by initializer
            return
        }

        const jobsRef = collection(firestore, COLLECTION_PATHS.ANALYSIS_JOBS)
        const q = query(
            jobsRef,
            where('streamId', '==', streamId),
            where('status', 'in', ['pending', 'processing']),
            orderBy('createdAt', 'desc'),
            limit(1)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0]
                const data = doc.data()
                setJob({
                    id: doc.id,
                    status: data.status,
                    progress: data.progress || 0,
                    handsFound: data.result?.totalHands || 0,
                    errorMessage: data.errorMessage,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt
                } as JobStatus)
            } else {
                setJob(null)
            }
            setLoading(false)
        }, (error) => {
            console.error('Error subscribing to analysis jobs:', error)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [streamId])

    return { job, loading }
}
