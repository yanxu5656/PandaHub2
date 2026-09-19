import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  primary:
    'bg-linear-to-b from-accent-hover to-accent-deep text-white font-bold shadow-[0_4px_14px_rgba(108,191,135,0.35)] hover:shadow-[0_6px_22px_rgba(108,191,135,0.5)] hover:brightness-105 active:translate-y-px',
  secondary:
    'bg-white/70 text-text-primary border border-border hover:border-accent/50 hover:bg-accent-dim',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
  danger: 'bg-danger-dim text-danger hover:bg-danger/20',
}

const sizes = {
  sm: 'px-4 py-2 text-sm min-h-9',
  md: 'px-6 py-2.5 text-[15px] min-h-11',
  lg: 'px-8 py-3 text-base min-h-12',
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
