import { supabase } from './supabase'

// ============================================================
// Types
// ============================================================

export interface Profile {
  id: string
  nickname: string
  avatar_url: string | null
  role: 'admin' | 'member'
  created_at: string
}

export interface Presence {
  user_id: string
  last_seen: string
}

export interface Schedule {
  id: string
  user_id: string
  week_start: string
  slots: Record<string, boolean>  // key: "day-hour", e.g. "0-9" = Monday 9:00
  updated_at: string
}

export interface Vote {
  id: string
  creator_id: string
  title: string
  options: { text: string }[]
  status: 'active' | 'closed'
  created_at: string
  expires_at: string | null
  creator?: Profile
  records?: VoteRecord[]
}

export interface VoteRecord {
  id: string
  vote_id: string
  user_id: string
  option_index: number
  created_at: string
  user?: Profile
}

export interface Game {
  id: string
  steam_app_id: number | null
  name: string
  cover_url: string | null
  genres: string[]
  platform: string
  created_at: string
  owners?: Profile[]
  owner_count?: number
}

export interface Notification {
  id: string
  user_id: string
  type: string
  content: string
  is_read: boolean
  created_at: string
}

// ============================================================
// Profiles
// ============================================================

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'nickname' | 'avatar_url'>>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}

// ============================================================
// Presence
// ============================================================

export async function updatePresence() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('presence')
    .upsert({ user_id: user.id, last_seen: new Date().toISOString() })
  if (error) throw error
}

export async function getOnlineUserIds(thresholdMinutes = 5): Promise<string[]> {
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('presence')
    .select('user_id')
    .gt('last_seen', threshold)
  if (error) throw error
  return data.map(d => d.user_id)
}

// ============================================================
// Schedules
// ============================================================

export function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  // 本地时区格式化；toISOString 在 UTC+8 会把日期整体前移一天
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dd}`
}

export async function getSchedule(userId: string, weekStart: string): Promise<Schedule | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getAllSchedules(weekStart: string): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('week_start', weekStart)
  if (error) throw error
  return data
}

export async function upsertSchedule(userId: string, weekStart: string, slots: Record<string, boolean>) {
  const pruned = Object.fromEntries(Object.entries(slots).filter(([, v]) => v))
  const { error } = await supabase
    .from('schedules')
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        slots: pruned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' },
    )
  if (error) throw error
}

// ============================================================
// Votes
// ============================================================

export async function getVotes(status?: 'active' | 'closed'): Promise<Vote[]> {
  let query = supabase
    .from('votes')
    .select('*, creator:profiles(*)')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getVoteById(voteId: string): Promise<Vote | null> {
  const { data, error } = await supabase
    .from('votes')
    .select('*, creator:profiles(*), records:vote_records(*, user:profiles(*))')
    .eq('id', voteId)
    .single()
  if (error) throw error
  return data
}

export async function createVote(title: string, options: string[], expiresAt?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')
  const nickname = user.user_metadata?.nickname ?? user.email?.split('@')[0] ?? '某人'

  const { data, error } = await supabase
    .from('votes')
    .insert({
      creator_id: user.id,
      title,
      options: options.map(text => ({ text })),
      expires_at: expiresAt ?? null,
    })
    .select()
    .single()
  if (error) throw error

  const { data: members } = await supabase
    .from('profiles')
    .select('id')
    .neq('id', user.id)
  if (members) {
    await Promise.allSettled(
      members.map(m =>
        supabase.from('notifications').insert({
          user_id: m.id,
          type: 'vote_created',
          content: `${nickname} 发起了新投票：${title}`,
        })
      )
    )
  }

  return data
}

export async function submitVote(voteId: string, optionIndex: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data: vote } = await supabase
    .from('votes')
    .select('title, creator_id, options')
    .eq('id', voteId)
    .single()

  const { error } = await supabase
    .from('vote_records')
    .upsert({
      vote_id: voteId,
      user_id: user.id,
      option_index: optionIndex,
    })
  if (error) throw error

  if (vote && vote.creator_id && vote.creator_id !== user.id) {
    const nickname = user.user_metadata?.nickname ?? user.email?.split('@')[0] ?? '某人'
    const optionText = vote.options[optionIndex]?.text ?? ''
    await supabase.from('notifications').insert({
      user_id: vote.creator_id,
      type: 'vote_cast',
      content: `${nickname} 在「${vote.title}」中投了「${optionText}」`,
    })
  }
}

export async function closeVote(voteId: string) {
  const { data: vote } = await supabase
    .from('votes')
    .select('title')
    .eq('id', voteId)
    .single()

  const { error } = await supabase
    .from('votes')
    .update({ status: 'closed' })
    .eq('id', voteId)
  if (error) throw error

  if (vote) {
    const { data: records } = await supabase
      .from('vote_records')
      .select('user_id')
      .eq('vote_id', voteId)
    if (records) {
      await Promise.allSettled(
        records.map(r =>
          supabase.from('notifications').insert({
            user_id: r.user_id,
            type: 'vote_closed',
            content: `投票「${vote.title}」已结束`,
          })
        )
      )
    }
  }
}

// ============================================================
// Games
// ============================================================

export async function getGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*, owners:game_owners(user:profiles(*))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as any[]).map((g: any) => ({
    ...g,
    owner_count: g.owners?.length ?? 0,
    owners: g.owners?.map((o: any) => o.user) ?? [],
  }))
}

export async function addGame(name: string, steamAppId?: number, coverUrl?: string, genres?: string[]) {
  const { data, error } = await supabase
    .from('games')
    .insert({
      name,
      steam_app_id: steamAppId ?? null,
      cover_url: coverUrl ?? null,
      genres: genres ?? [],
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteGame(gameId: string) {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId)
  if (error) throw error
}

export async function claimGame(gameId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')
  const { error } = await supabase
    .from('game_owners')
    .upsert({ game_id: gameId, user_id: user.id })
  if (error) throw error
}

export async function unclaimGame(gameId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')
  const { error } = await supabase
    .from('game_owners')
    .delete()
    .eq('game_id', gameId)
    .eq('user_id', user.id)
  if (error) throw error
}

// ============================================================
// Notifications
// ============================================================

export async function getNotifications(limit = 20): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  if (error) throw error
}

export async function createNotification(userId: string, type: string, content: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, content })
  if (error) throw error
}
