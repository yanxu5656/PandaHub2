import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthShell from '@/components/layout/AuthShell'
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
    <AuthShell title="加入 PandaHub" subtitle="创建新账号">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-danger-dim border border-danger/25 text-danger text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm text-text-secondary mb-2">昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            autoComplete="nickname"
            className="input"
            placeholder="你的昵称"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-2">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-2">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="input"
            placeholder="至少 6 位"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg text-[15px] font-semibold cursor-pointer bg-linear-to-b from-accent-hover to-accent-deep text-[#161207] shadow-[0_2px_12px_rgba(201,168,76,0.25)] hover:shadow-[0_4px_20px_rgba(201,168,76,0.4)] hover:brightness-110 active:translate-y-px transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="text-center text-[15px] text-text-secondary mt-7">
        已有账号？{' '}
        <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
          登录
        </Link>
      </p>
    </AuthShell>
  )
}
