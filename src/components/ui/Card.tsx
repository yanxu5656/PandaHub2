import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  eyebrow?: string
  action?: ReactNode
}

export default function Card({ children, className = '', title, eyebrow, action }: CardProps) {
  return (
    <section className={`surface rounded-xl ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 px-7 py-5 border-b border-hairline">
          <div>
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            {title && <h3 className="text-base font-semibold tracking-tight">{title}</h3>}
          </div>
          {action && <div>{action}</div>}
        </header>
      )}
      <div className="p-7">{children}</div>
    </section>
  )
}
