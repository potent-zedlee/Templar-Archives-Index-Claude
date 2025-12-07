"use client"

import { useState, useRef, ChangeEvent } from "react"
import Image from "next/image"
import { Camera, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
    currentImageUrl?: string
    nickname: string
    onUpload: (file: File) => Promise<string>
    className?: string
}

export function AvatarUpload({
    currentImageUrl,
    nickname,
    onUpload,
    className,
}: AvatarUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)

        try {
            setIsUploading(true)
            await onUpload(file)
            // Preview will be replaced by the actual new URL from parent update, 
            // but we keep it for immediate feedback until then
        } catch (error) {
            console.error("Upload failed", error)
            toast.error("Failed to upload image. Please try again.")
            // Revert preview on error
            setPreviewUrl(null)
        } finally {
            setIsUploading(false)
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const handleClick = () => {
        if (isUploading) return
        fileInputRef.current?.click()
    }

    const displayUrl = previewUrl || currentImageUrl

    return (
        <div className={cn("relative group cursor-pointer", className)} onClick={handleClick}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/png, image/jpeg, image/webp, image/gif"
                className="hidden"
                disabled={isUploading}
            />

            {/* Avatar Container */}
            <div className="relative h-24 w-24 rounded-full border-2 border-gold-500/50 overflow-hidden bg-background shadow-lg transition-all duration-300 group-hover:border-gold-400 group-hover:shadow-glow">
                {displayUrl ? (
                    <Image
                        src={displayUrl}
                        alt={nickname}
                        fill
                        className={cn(
                            "object-cover transition-opacity duration-300",
                            isUploading ? "opacity-50" : "opacity-100"
                        )}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                        <span className="text-3xl font-bold text-muted-foreground">
                            {nickname.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Overlay */}
                <div className={cn(
                    "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200",
                    isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    {isUploading ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                        <Camera className="h-6 w-6 text-white drop-shadow-md" />
                    )}
                </div>
            </div>

            {/* Helper text */}
            <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1.5 border border-border shadow-sm group-hover:border-gold-400 group-hover:text-gold-600">
                <Upload className="h-3 w-3" />
            </div>
        </div>
    )
}
