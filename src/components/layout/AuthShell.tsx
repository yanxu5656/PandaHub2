import type { ReactNode } from 'react'
import PandaFace from '@/components/ui/PandaFace'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative oversized brand */}
      <p className="absolute -bottom-16 left-1/2 -translate-x-1/2 font-display font-bold italic text-[9rem] leading-none text-[#35323a]/[0.04] select-none pointer-events-none whitespace-nowrap" aria-hidden="true">
        PandaHub
      </p>

      <div className="w-full max-w-md relative animate-fade-up">
        {/* Brand */}
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(83,96,83,0.16)] mb-5">
            <PandaFace size={48} />
          </div>
          <p className="font-display text-3xl font-bold tracking-wide">
            Panda<span className="gold-text">Hub</span>
          </p>
          <p className="eyebrow mt-2">Game Lodge · {subtitle}</p>
        </div>

        <div className="surface rounded-3xl p-8">
          <h1 className="text-2xl font-bold tracking-tight mb-6">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
