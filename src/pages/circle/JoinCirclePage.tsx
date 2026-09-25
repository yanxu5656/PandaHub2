import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '@/components/ui/Card'
import PandaFace from '@/components/ui/PandaFace'
import { useAuthStore } from '@/stores/authStore'
import { useCircleStore } from '@/stores/circleStore'
import { joinCircleByCode, createCircle } from '@/lib/services'

export default function JoinCirclePage() {
  const { code: codeParam } = useParams()
  const { user } = useAuthStore()
  const { platformRole, load, setCurrent } = useCircleStore()
  const navigate = useNavigate()

  const canCreate = platformRole === 'super' || platformRole === 'creator'

  const [code, setCode] = useState(codeParam ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (codeParam) setCode(codeParam)
  }, [codeParam])

  const handleJoin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!user) return
    const trimmed = code.trim()
    if (!trimmed) { setError('请输入邀请码'); return }
    setError('')
    setBusy(true)
    try {
      const circleId = await joinCircleByCode(trimmed)
      await load(user.id)
      setCurrent(circleId)
      navigate('/')
    } catch (err: any) {
      setError(err?.message ?? '加入失败，请检查邀请码')
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!user) return
    const trimmed = newName.trim()
    if (!trimmed) { setCreateError('请填写圈子名称'); return }
    setCreateError('')
    setCreating(true)
    try {
      const circleId = await createCircle(trimmed, newDesc.trim() || undefined)
      await load(user.id)
      setCurrent(circleId)
      navigate('/')
    } catch (err: any) {
      setCreateError(err?.message ?? '创建失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page-wrap max-w-xl mx-auto">
      <div className="text-center mb-8 animate-fade-up">
        <div className="flex justify-center mb-4"><PandaFace size={64} /></div>
        <p className="eyebrow mb-2">Join a Circle</p>
        <h1 className="text-3xl font-semibold tracking-tight">加入圈子</h1>
        <p className="text-text-secondary mt-2">输入圈主分享的邀请码，进入对应的小窝</p>
      </div>

      <div className="space-y-8">
        <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
          <Card eyebrow="Invite Code" title="用邀请码加入">
            <form onSubmit={handleJoin} className="space-y-5">
              {error && (
                <div className="px-4 py-3 rounded-lg bg-danger-dim border border-danger/25 text-danger text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm text-text-secondary mb-2">邀请码</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="input num tracking-[0.3em] text-center text-lg font-bold uppercase"
                  placeholder="8 位邀请码"
                  maxLength={16}
                  autoFocus
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-full text-[15px] font-bold cursor-pointer bg-linear-to-b from-accent-hover to-accent-deep text-white shadow-[0_4px_14px_rgba(108,191,135,0.35)] hover:brightness-105 active:translate-y-px transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? '加入中...' : '加入圈子'}
              </button>
            </form>
          </Card>
        </div>

        {canCreate && (
          <div className="animate-fade-up" style={{ animationDelay: '140ms' }}>
            <Card eyebrow="New Circle" title="创建新圈子">
              <form onSubmit={handleCreate} className="space-y-5">
                {createError && (
                  <div className="px-4 py-3 rounded-lg bg-danger-dim border border-danger/25 text-danger text-sm">{createError}</div>
                )}
                <div>
                  <label className="block text-sm text-text-secondary mb-2">圈子名称</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input"
                    placeholder="例如：周末开黑小分队"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">简介（可选）</label>
                  <input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="input"
                    placeholder="一句话介绍这个圈子"
                    maxLength={60}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 rounded-full text-[15px] font-bold cursor-pointer bg-white/70 text-text-primary border border-border hover:border-accent/50 hover:bg-accent-dim transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? '创建中...' : '创建圈子'}
                </button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
