import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  primary:
    'bg-linear-to-b from-accent-hover to-accent-deep text-[#161207] font-semibold shadow-[0_2px_12px_rgba(201,168,76,0.25)] hover:shadow-[0_4px_20px_rgba(201,168,76,0.4)] hover:brightness-110 active:translate-y-px',
  secondary:
    'bg-bg-elevated/70 text-text-primary border border-hairline hover:border-border-light hover:bg-bg-hover',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/80',
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
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
