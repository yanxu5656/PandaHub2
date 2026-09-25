import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Skeleton from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useCircleStore } from '@/stores/circleStore'
import { useRealtime } from '@/hooks/useRealtime'
import {
  getCircleMembers,
  updateCircle,
  regenerateInviteCode,
  setCircleRole,
  kickMember,
  transferOwnership,
  deleteCircle,
  type CircleMember,
  type Profile,
} from '@/lib/services'

const ROLE_LABEL: Record<string, string> = { owner: '圈主', admin: '管理员', member: '成员' }

function MemberAvatar({ profile }: { profile?: Profile }) {
  const isEmoji = profile?.avatar_url && !profile.avatar_url.startsWith('http')
  return (
    <div className="w-10 h-10 rounded-full bg-bg-hover ring-1 ring-hairline flex items-center justify-center shrink-0 overflow-hidden">
      {isEmoji ? (
        <span className="text-lg leading-none">{profile?.avatar_url}</span>
      ) : profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.nickname} className="w-full h-full object-cover" />
      ) : (
        <span className="text-accent-deep font-medium">{(profile?.nickname || '?').slice(0, 1)}</span>
      )}
    </div>
  )
}

export default function CircleSettingsPage() {
  const { user } = useAuthStore()
  const { circles, currentId, platformRole, load } = useCircleStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const circle = circles.find(c => c.id === currentId) ?? null
  const isOwner = circle?.my_role === 'owner' || platformRole === 'super'
  const isAdmin = circle?.my_role === 'owner' || circle?.my_role === 'admin' || platformRole === 'super'

  const [name, setName] = useState(circle?.name ?? '')
  const [description, setDescription] = useState(circle?.description ?? '')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')

  // 同步 store → 本地表单（切圈时）
  const [syncedId, setSyncedId] = useState<string | null>(null)
  if (circle && circle.id !== syncedId) {
    setSyncedId(circle.id)
    setName(circle.name)
    setDescription(circle.description ?? '')
  }

  const { data: members, isLoading } = useQuery({
    queryKey: ['circle-members', currentId],
    queryFn: () => getCircleMembers(currentId!),
    enabled: !!currentId,
  })

  useRealtime('circle_members', '*', () => {
    queryClient.invalidateQueries({ queryKey: ['circle-members', currentId] })
    if (user) load(user.id)
  })

  const flash = (text: string, ok = true) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2500)
    if (!ok) console.warn(text)
  }

  const run = async (fn: () => Promise<void>, okText: string) => {
    setBusy(true)
    try {
      await fn()
      flash(okText)
    } catch (err: any) {
      flash(err?.message ?? '操作失败', false)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      flash('复制失败，请手动选择文本', false)
    }
  }

  if (!circle) {
    return (
      <div className="page-wrap">
        <p className="text-text-muted text-center py-20">未选择圈子</p>
      </div>
    )
  }

  const inviteLink = `${window.location.origin}/join/${circle.invite_code}`

  const handleSaveInfo = () => run(async () => {
    await updateCircle(circle.id, name.trim(), description.trim() || null)
    if (user) await load(user.id)
  }, '圈子信息已更新')

  const handleRegenerate = () => {
    if (!window.confirm('重置后旧邀请码和旧链接立即失效，确定继续？')) return
    run(async () => {
      await regenerateInviteCode(circle.id)
      if (user) await load(user.id)
    }, '邀请码已重置')
  }

  const handleRole = (m: CircleMember, role: 'admin' | 'member') =>
    run(() => setCircleRole(circle.id, m.user_id, role), `已将 ${m.profile?.nickname ?? '成员'} 设为${ROLE_LABEL[role]}`)

  const handleKick = (m: CircleMember) => {
    if (!window.confirm(`确定把 ${m.profile?.nickname ?? '该成员'} 移出圈子？其在本圈的时间表也会一并清除。`)) return
    run(async () => {
      await kickMember(circle.id, m.user_id)
      await queryClient.invalidateQueries({ queryKey: ['circle-members', circle.id] })
    }, '已移出圈子')
  }

  const handleTransfer = (m: CircleMember) => {
    if (!window.confirm(`确定把圈主转让给 ${m.profile?.nickname ?? '该成员'}？你将变为普通成员。`)) return
    run(async () => {
      await transferOwnership(circle.id, m.user_id)
      if (user) await load(user.id)
    }, '圈主已转让')
  }

  const handleDelete = () => {
    if (!window.confirm(`确定删除圈子「${circle.name}」？圈内所有时间表、投票、游戏库、对局都会永久删除，且无法恢复。`)) return
    run(async () => {
      await deleteCircle(circle.id)
      if (user) await load(user.id)
      navigate('/')
    }, '圈子已删除')
  }

  return (
    <div className="page-wrap [--page-cap:52rem]">
      <PageHeader
        eyebrow="Circle Settings"
        title={circle.name}
        desc={
          <>
            你在本圈的身份：
            <span className="pill pill-blush ml-1">{ROLE_LABEL[circle.my_role]}</span>
            {platformRole === 'super' && <span className="pill pill-gold ml-1.5">平台超管</span>}
          </>
        }
      />

      {msg && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-accent-dim border border-accent/25 text-accent-deep text-sm animate-fade-in">{msg}</div>
      )}

      <div className="space-y-8">
        {/* 圈子信息 */}
        <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <Card eyebrow="Info" title="圈子信息">
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-text-secondary mb-2">名称</label>
                <input value={name} onChange={e => setName(e.target.value)} disabled={!isOwner || busy} className="input" placeholder="圈子名称" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">简介</label>
                <input value={description} onChange={e => setDescription(e.target.value)} disabled={!isOwner || busy} className="input" placeholder="一句话介绍这个圈子" />
              </div>
              {isOwner ? (
                <div className="flex justify-end">
                  <Button onClick={handleSaveInfo} disabled={busy}>保存</Button>
                </div>
              ) : (
                <p className="text-sm text-text-muted">只有圈主可以修改圈子信息</p>
              )}
            </div>
          </Card>
        </div>

        {/* 邀请 */}
        <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
          <Card eyebrow="Invite" title="邀请成员">
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-text-secondary mb-2">邀请码</label>
                <div className="flex items-center gap-3">
                  <code className="flex-1 num tracking-[0.3em] text-lg font-bold text-accent-deep bg-accent-dim/50 border border-accent/20 rounded-xl px-4 py-3 text-center">
                    {circle.invite_code}
                  </code>
                  <Button variant="secondary" onClick={() => copy(circle.invite_code, 'code')} disabled={busy}>
                    {copied === 'code' ? '已复制' : '复制'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">邀请链接</label>
                <div className="flex items-center gap-3">
                  <input value={inviteLink} readOnly onFocus={e => e.target.select()} className="input num text-sm" />
                  <Button variant="secondary" onClick={() => copy(inviteLink, 'link')} disabled={busy}>
                    {copied === 'link' ? '已复制' : '复制'}
                  </Button>
                </div>
              </div>
              {isOwner ? (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-sm text-text-muted">邀请码永不过期；重置后旧码立即失效</p>
                  <Button variant="ghost" onClick={handleRegenerate} disabled={busy}>重置邀请码</Button>
                </div>
              ) : (
                <p className="text-sm text-text-muted">只有圈主可以重置邀请码</p>
              )}
            </div>
          </Card>
        </div>

        {/* 成员 */}
        <div className="animate-fade-up" style={{ animationDelay: '180ms' }}>
          <Card eyebrow="Members" title={`成员（${members?.length ?? 0}）`}>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-hairline">
                {members?.map(m => {
                  const isMe = m.user_id === user?.id
                  const isMemberOwner = m.role === 'owner'
                  const canManage = isAdmin && !isMemberOwner && !isMe
                  return (
                    <div key={m.user_id} className="flex items-center gap-4 py-3.5">
                      <MemberAvatar profile={m.profile} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium truncate">
                          {m.profile?.nickname ?? '未知用户'}
                          {isMe && <span className="text-text-muted ml-2 text-sm font-normal">(我)</span>}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">加入于 {new Date(m.joined_at).toLocaleDateString('zh-CN')}</p>
                      </div>
                      <span className={`pill shrink-0 ${
                        m.role === 'owner' ? 'pill-blush' :
                        m.role === 'admin' ? 'pill-accent' :
                        'pill-muted'
                      }`}>
                        {ROLE_LABEL[m.role]}
                      </span>

                      {canManage && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isOwner && m.role === 'member' && (
                            <button onClick={() => handleRole(m, 'admin')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-medium text-accent-deep bg-accent-dim hover:bg-accent/25 transition-colors cursor-pointer disabled:opacity-50">设为管理员</button>
                          )}
                          {isOwner && m.role === 'admin' && (
                            <button onClick={() => handleRole(m, 'member')} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary bg-bg-hover hover:bg-border/40 transition-colors cursor-pointer disabled:opacity-50">取消管理员</button>
                          )}
                          {isOwner && (
                            <button onClick={() => handleTransfer(m)} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary bg-bg-hover hover:bg-border/40 transition-colors cursor-pointer disabled:opacity-50">转让圈主</button>
                          )}
                          <button onClick={() => handleKick(m)} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-medium text-danger bg-danger-dim hover:bg-danger/20 transition-colors cursor-pointer disabled:opacity-50">移出</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* 危险区 */}
        {isOwner && (
          <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
            <Card eyebrow="Danger Zone" title="删除圈子">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <p className="flex-1 text-sm text-text-secondary">
                  删除后，圈内所有数据（时间表、投票、游戏库、小游戏对局、通知）将永久清除，无法恢复。
                </p>
                <Button variant="danger" onClick={handleDelete} disabled={busy}>删除「{circle.name}」</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
