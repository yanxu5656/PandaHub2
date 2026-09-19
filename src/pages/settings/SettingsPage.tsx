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
    <div className="p-6 lg:p-10 max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold">设置</h1>
        <p className="text-text-secondary text-base mt-2">个人资料</p>
      </div>

      <Card>
        <div className="space-y-8">
          {/* Avatar */}
          <div>
            <label className="block text-base text-text-secondary mb-4">头像</label>
            <div className="flex items-center gap-5 mb-5">
              <div className="w-16 h-16 rounded-full bg-bg-hover flex items-center justify-center text-3xl shrink-0">
                {avatar ? avatar : (nickname || '?').slice(0, 1)}
              </div>
              {avatar && (
                <button
                  onClick={() => setAvatar('')}
                  className="text-sm text-text-muted hover:text-danger transition-colors"
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
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${
                    avatar === a ? 'bg-accent-dim ring-2 ring-accent' : 'bg-bg-hover hover:bg-border'
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
              className="w-full px-5 py-3 rounded-xl bg-bg-secondary border border-border text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="你的昵称"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-base text-text-secondary mb-2">邮箱</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full px-5 py-3 rounded-xl bg-bg-secondary border border-border text-base text-text-muted cursor-not-allowed"
            />
          </div>

          {/* Message */}
          {message && (
            <div className={`px-5 py-3 rounded-xl text-base ${
              message === '保存成功' ? 'bg-success/15 text-success' : 'bg-danger-dim text-danger'
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
  )
}
