import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}

export default function Card({ children, className = '', title, action }: CardProps) {
  return (
    <div className={`bg-bg-card border border-border rounded-lg ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
