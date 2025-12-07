import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none active:scale-95',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white shadow-sm hover:shadow-glow hover:-translate-y-0.5 border border-gold-400/20',
        primary:
          'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
        secondary:
          'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gold-300/50 shadow-sm hover:shadow-md dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800 dark:hover:bg-gray-800',
        outline:
          'bg-transparent border border-gray-300 text-gray-700 hover:bg-gold-50 hover:text-gold-700 hover:border-gold-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gold-400',
        ghost:
          'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md',
        link: 'text-primary underline-offset-4 hover:underline',
        glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-sm',
      },
      size: {
        default: 'h-10 px-4 py-2 rounded-xl text-sm',
        sm: 'h-8 px-3 text-xs rounded-lg',
        lg: 'h-12 px-8 text-base rounded-2xl',
        icon: 'h-10 w-10 p-2 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
