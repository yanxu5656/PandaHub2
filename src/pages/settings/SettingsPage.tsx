import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { updateProfile } from '@/lib/services'

const avatarOptions = ['🐼', '🐻', '', '🦊', '🐰', '🐱', '🐶', '🐴']

export default function SettingsPage() {
  const { user, updateProfile: updateAuthProfile } = useAuthStore()
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
      setMessage('保存成功')
      setTimeout(() => setMessage(''), 2000)
    } catch (err: any) {
      setMessage(err.message ?? '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-text-secondary text-sm mt-1">个人资料</p>
      </div>

      <Card>
        <div className="space-y-6">
          {/* Avatar */}
          <div>
            <label className="block text-sm text-text-secondary mb-3">头像</label>
            <div className="flex flex-wrap gap-2">
              {avatarOptions.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
                    avatar === a ? 'bg-accent-dim ring-1 ring-accent' : 'bg-bg-hover hover:bg-border'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">昵称</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="你的昵称"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">邮箱</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full px-4 py-2.5 rounded-md bg-bg-secondary border border-border text-sm text-text-muted cursor-not-allowed"
            />
          </div>

          {/* Message */}
          {message && (
            <div className={`px-4 py-2 rounded text-sm ${
              message === '保存成功' ? 'bg-success/15 text-success' : 'bg-danger-dim text-danger'
            }`}>
              {message}
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
