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
          <div className="relative w-14 h-14 rounded-2xl mx-auto mb-5">
            <div className="absolute inset-0 rounded-2xl bg-accent/25 blur-xl -z-10" />
            <div className="w-full h-full rounded-2xl border border-accent/30 bg-linear-to-b from-accent/15 to-accent/[0.03] flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
                <circle cx="12" cy="12" r="9.5" />
                <circle cx="9" cy="10" r="1.4" fill="currentColor" />
                <circle cx="15" cy="10" r="1.4" fill="currentColor" />
                <ellipse cx="12" cy="14" rx="2.8" ry="1.8" />
              </svg>
            </div>
          </div>
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
