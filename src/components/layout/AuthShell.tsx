import type { ReactNode } from 'react'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative oversized brand */}
      <p className="absolute -bottom-16 left-1/2 -translate-x-1/2 font-display italic text-[9rem] leading-none text-white/[0.02] select-none pointer-events-none whitespace-nowrap" aria-hidden="true">
        PandaHub
      </p>

      <div className="w-full max-w-md relative animate-fade-up">
        {/* Brand */}
        <div className="text-center mb-9">
          <p className="font-display text-3xl tracking-wide">
            Panda<span className="gold-text italic">Hub</span>
          </p>
          <p className="eyebrow mt-2">Game Lodge · {subtitle}</p>
        </div>

        <div className="surface rounded-2xl p-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-6">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
