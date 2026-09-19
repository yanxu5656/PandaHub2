export default function PandaFace({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="16" cy="14" r="9" fill="#3a3640" />
      <circle cx="48" cy="14" r="9" fill="#3a3640" />
      <circle cx="16" cy="14" r="4.5" fill="#f487a6" opacity="0.55" />
      <circle cx="48" cy="14" r="4.5" fill="#f487a6" opacity="0.55" />
      <circle cx="32" cy="36" r="23" fill="#ffffff" stroke="#e5e2da" strokeWidth="1.5" />
      <ellipse cx="22.5" cy="33" rx="5.6" ry="7.2" fill="#3a3640" transform="rotate(14 22.5 33)" />
      <ellipse cx="41.5" cy="33" rx="5.6" ry="7.2" fill="#3a3640" transform="rotate(-14 41.5 33)" />
      <circle cx="24" cy="31.5" r="2.1" fill="#ffffff" />
      <circle cx="40" cy="31.5" r="2.1" fill="#ffffff" />
      <circle cx="24.7" cy="30.8" r="0.8" fill="#3a3640" />
      <circle cx="40.7" cy="30.8" r="0.8" fill="#3a3640" />
      <ellipse cx="32" cy="43" rx="3.4" ry="2.4" fill="#3a3640" />
      <path d="M32 45.4v2.6M32 48c-1.8 1.8-4.4 1.8-6 0.4M32 48c1.8 1.8 4.4 1.8 6 0.4" stroke="#3a3640" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="13.5" cy="41" rx="4" ry="2.6" fill="#ffb3c6" opacity="0.85" />
      <ellipse cx="50.5" cy="41" rx="4" ry="2.6" fill="#ffb3c6" opacity="0.85" />
    </svg>
  )
}
