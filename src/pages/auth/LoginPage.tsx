import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthShell from '@/components/layout/AuthShell'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message ?? '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="欢迎回来" subtitle="登录你的账号">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-danger-dim border border-danger/25 text-danger text-sm">{error}</div>
        )}

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
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg text-[15px] font-semibold cursor-pointer bg-linear-to-b from-accent-hover to-accent-deep text-[#161207] shadow-[0_2px_12px_rgba(201,168,76,0.25)] hover:shadow-[0_4px_20px_rgba(201,168,76,0.4)] hover:brightness-110 active:translate-y-px transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="text-center text-[15px] text-text-secondary mt-7">
        没有账号？{' '}
        <Link to="/register" className="text-accent hover:text-accent-hover transition-colors">
          注册
        </Link>
      </p>
    </AuthShell>
  )
}
