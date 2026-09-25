import type { Profile } from '@/lib/services'

export default function Avatar({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-12 h-12 text-xl' : 'w-10 h-10 text-base'
  const isEmoji = profile.avatar_url && !profile.avatar_url.startsWith('http')
  const initials = (profile.nickname || '?').slice(0, 1)
  return (
    <div className={`${sizeClass} rounded-full bg-bg-hover ring-1 ring-hairline flex items-center justify-center font-medium text-text-secondary shrink-0`}>
      {isEmoji ? (
        <span className="leading-none">{profile.avatar_url}</span>
      ) : profile.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.nickname} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span className="text-accent-deep">{initials}</span>
      )}
    </div>
  )
}
