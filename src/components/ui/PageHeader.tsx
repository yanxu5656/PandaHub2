import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: ReactNode
  desc?: ReactNode
  side?: ReactNode
}

export default function PageHeader({ eyebrow, title, desc, side }: PageHeaderProps) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6 animate-fade-up">
      <div className="min-w-0">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.15] text-text-primary">{title}</h1>
        {desc && <p className="text-text-secondary text-[15px] lg:text-base mt-2.5">{desc}</p>}
      </div>
      {side && <div className="shrink-0 flex items-center gap-2 pb-1">{side}</div>}
    </div>
  )
}
