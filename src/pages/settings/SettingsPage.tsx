import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { updateProfile } from '@/lib/services'

const avatarOptions = ['🐼', '🐻', '🐲', '🦊', '🐰', '🐱', '🐶', '🐴', '🐵', '🐷', '🐸', '🐯', '🦁', '🐮', '🐔', '🐧', '🦄', '🐝', '🐳', '🦋', '🐙', '🦀', '🐢', '🦉']

export default function SettingsPage() {
  const { user, updateProfile: updateAuthProfile } = useAuthStore()
  const queryClient = useQueryClient()
  const [nickname, setNickname] = useState(user?.user_metadata?.nickname ?? '')
  const [avatar, setAvatar] = useState(user?.user_metadata?.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMessage('')
    try {
      await Promise.all([
        updateAuthProfile({ nickname, avatar_url: avatar || undefined }),
        updateProfile(user.id, { nickname, avatar_url: avatar || null }),
      ])
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setMessage('保存成功')
      setTimeout(() => setMessage(''), 2000)
    } catch (err: any) {
      setMessage(err.message ?? '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-wrap [--page-cap:42rem]">
      <div className="mb-10 animate-fade-up">
        <p className="eyebrow mb-3">Settings</p>
        <h1 className="text-4xl font-semibold tracking-tight">设置</h1>
        <p className="text-text-secondary text-base mt-2">个人资料</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
      <Card eyebrow="Profile" title="个人资料">
        <div className="space-y-9">
          {/* Preview */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1.5 rounded-full bg-accent/10 blur-lg pointer-events-none" />
              <div className="relative w-20 h-20 rounded-full bg-bg-hover ring-1 ring-accent/25 flex items-center justify-center text-4xl">
                {avatar ? avatar : <span className="font-display italic text-accent-deep">{(nickname || '?').slice(0, 1)}</span>}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold truncate">{nickname || '未命名玩家'}</p>
              <p className="text-sm text-text-muted truncate mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="hairline" />

          {/* Avatar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-base text-text-secondary">头像</label>
              {avatar && (
                <button
                  onClick={() => setAvatar('')}
                  className="text-sm text-text-muted hover:text-danger transition-colors cursor-pointer"
                >
                  移除头像
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {avatarOptions.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  aria-label={`选择头像 ${a}`}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                    avatar === a
                      ? 'bg-accent-dim ring-2 ring-accent scale-105'
                      : 'bg-bg-elevated/60 border border-hairline hover:bg-bg-hover hover:scale-105'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-base text-text-secondary mb-2">昵称</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="input !text-base !py-3 !px-5"
              placeholder="你的昵称"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-base text-text-secondary mb-2">邮箱</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="input !text-base !py-3 !px-5"
            />
          </div>

          {/* Message */}
          {message && (
            <div className={`px-5 py-3 rounded-lg text-base animate-fade-in ${
              message === '保存成功' ? 'bg-success/12 text-success border border-success/25' : 'bg-danger-dim text-danger border border-danger/25'
            }`}>
              {message}
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Card>
      </div>
    </div>
  )
}
