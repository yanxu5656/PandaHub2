import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, nickname)
      navigate('/')
    } catch (err: any) {
      setError(err.message ?? '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <circle cx="12" cy="12" r="10" />
              <circle cx="9" cy="10" r="1.5" fill="currentColor" />
              <circle cx="15" cy="10" r="1.5" fill="currentColor" />
              <ellipse cx="12" cy="14" rx="3" ry="2" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">PandaHub</h1>
          <p className="text-text-secondary text-sm mt-1">创建新账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-md bg-danger-dim text-danger text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-md bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="你的昵称"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-md bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-md bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="至少 6 位"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-accent text-bg-primary text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          已有账号？{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
            登录
          </Link>
        </p>
      </div>
    </div>
  )
}
