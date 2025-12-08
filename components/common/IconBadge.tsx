"use client"

import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface IconBadgeProps {
    icon: LucideIcon
    value: number | string
    label?: string
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function IconBadge({
    icon: Icon,
    value,
    label,
    variant = 'default',
    size = 'md',
    className
}: IconBadgeProps) {
    const variantStyles = {
        default: 'bg-muted text-muted-foreground',
        primary: 'bg-primary/10 text-primary',
        success: 'bg-green-500/10 text-green-600 dark:text-green-400',
        warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        destructive: 'bg-destructive/10 text-destructive'
    }

    const sizeStyles = {
        sm: 'px-1.5 py-0.5 text-xs gap-1',
        md: 'px-2 py-1 text-sm gap-1.5',
        lg: 'px-3 py-1.5 text-base gap-2'
    }

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-3.5 w-3.5',
        lg: 'h-4 w-4'
    }

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full font-medium',
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
            title={label}
        >
            <Icon className={iconSizes[size]} />
            <span>{value}</span>
            {label && size === 'lg' && (
                <span className="text-xs opacity-70">{label}</span>
            )}
        </div>
    )
}
