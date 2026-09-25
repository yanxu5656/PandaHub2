import { supabase } from './supabase'

// ============================================================
// Types
// ============================================================

export type PlatformRole = 'super' | 'creator' | null
export type CircleRole = 'owner' | 'admin' | 'member'

export interface Profile {
  id: string
  nickname: string
  avatar_url: string | null
  role: 'admin' | 'member'
  platform_role?: PlatformRole
  created_at: string
}

export interface Circle {
  id: string
  name: string
  description: string | null
  owner_id: string
  invite_code: string
  created_at: string
}

export interface MyCircle extends Circle {
  my_role: CircleRole
}

export interface CircleMember {
  circle_id: string
  user_id: string
  role: CircleRole
  joined_at: string
  profile?: Profile
}

export interface Presence {
  user_id: string
  last_seen: string
}

export interface Schedule {
  id: string
  user_id: string
  circle_id: string
  week_start: string
  slots: Record<string, boolean>  // key: "day-hour", e.g. "0-9" = Monday 9:00
  updated_at: string
}

export interface Vote {
  id: string
  creator_id: string
  circle_id: string
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
  circle_id: string
  option_index: number
  created_at: string
  user?: Profile
}

export interface Game {
  id: string
  circle_id: string
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
  circle_id: string | null
  type: string
  content: string
  is_read: boolean
  created_at: string
  circle?: { id: string; name: string }
}

// ============================================================
// Profiles (global)
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
// Circles
// ============================================================

/** 我加入的圈子（含我的圈内角色），按创建时间升序 */
export async function getMyCircles(userId: string): Promise<MyCircle[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select('role, circle:circles(*)')
    .eq('user_id', userId)
  if (error) throw error
  const rows = (data ?? [])
    .filter((r: any) => r.circle)
    .map((r: any) => ({ ...(r.circle as Circle), my_role: r.role as CircleRole }))
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return rows
}

export async function getCircleMembers(circleId: string): Promise<CircleMember[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select('*, profile:profiles(*)')
    .eq('circle_id', circleId)
    .order('joined_at')
  if (error) throw error
  return data
}

export async function createCircle(name: string, description?: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_circle', {
    p_name: name,
    p_description: description ?? null,
  })
  if (error) throw error
  return data as string
}

export async function joinCircleByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_circle_by_code', { p_code: code })
  if (error) throw error
  return data as string
}

export async function updateCircle(circleId: string, name: string, description: string | null) {
  const { error } = await supabase.rpc('update_circle', {
    p_cid: circleId,
    p_name: name,
    p_description: description,
  })
  if (error) throw error
}

export async function regenerateInviteCode(circleId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_invite_code', { p_cid: circleId })
  if (error) throw error
  return data as string
}

export async function setCircleRole(circleId: string, userId: string, role: 'admin' | 'member') {
  const { error } = await supabase.rpc('set_circle_role', { p_cid: circleId, p_uid: userId, p_role: role })
  if (error) throw error
}

export async function kickMember(circleId: string, userId: string) {
  const { error } = await supabase.rpc('kick_member', { p_cid: circleId, p_uid: userId })
  if (error) throw error
}

export async function transferOwnership(circleId: string, userId: string) {
  const { error } = await supabase.rpc('transfer_ownership', { p_cid: circleId, p_uid: userId })
  if (error) throw error
}

export async function deleteCircle(circleId: string) {
  const { error } = await supabase.rpc('delete_circle', { p_cid: circleId })
  if (error) throw error
}

export async function setPlatformRole(userId: string, role: 'super' | 'creator' | null) {
  const { error } = await supabase.rpc('set_platform_role', { p_uid: userId, p_role: role })
  if (error) throw error
}

// ============================================================
// Presence (global)
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

export async function getSchedule(userId: string, circleId: string, weekStart: string): Promise<Schedule | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', userId)
    .eq('circle_id', circleId)
    .eq('week_start', weekStart)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getAllSchedules(circleId: string, weekStart: string): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('circle_id', circleId)
    .eq('week_start', weekStart)
  if (error) throw error
  return data
}

export async function upsertSchedule(userId: string, circleId: string, weekStart: string, slots: Record<string, boolean>) {
  const pruned = Object.fromEntries(Object.entries(slots).filter(([, v]) => v))
  const { error } = await supabase
    .from('schedules')
    .upsert(
      {
        user_id: userId,
        circle_id: circleId,
        week_start: weekStart,
        slots: pruned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'circle_id,user_id,week_start' },
    )
  if (error) throw error
}

/** 管理员清除某成员本周的时间安排 */
export async function deleteMemberSchedule(circleId: string, userId: string, weekStart: string) {
  const { data, error } = await supabase
    .from('schedules')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('清除失败：无记录或无权限')
}

// ============================================================
// Votes
// ============================================================

export async function getVotes(circleId: string, status?: 'active' | 'closed'): Promise<Vote[]> {
  let query = supabase
    .from('votes')
    .select('*, creator:profiles(*), records:vote_records(id)')
    .eq('circle_id', circleId)
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

export async function createVote(circleId: string, title: string, options: string[], expiresAt?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')
  const nickname = user.user_metadata?.nickname ?? user.email?.split('@')[0] ?? '某人'

  const { data, error } = await supabase
    .from('votes')
    .insert({
      creator_id: user.id,
      circle_id: circleId,
      title,
      options: options.map(text => ({ text })),
      expires_at: expiresAt ?? null,
    })
    .select()
    .single()
  if (error) throw error

  // 通知本圈其他成员
  const { data: members } = await supabase
    .from('circle_members')
    .select('user_id')
    .eq('circle_id', circleId)
    .neq('user_id', user.id)
  if (members) {
    await Promise.allSettled(
      members.map(m =>
        supabase.from('notifications').insert({
          user_id: m.user_id,
          circle_id: circleId,
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

  const { data: vote, error: voteErr } = await supabase
    .from('votes')
    .select('title, creator_id, circle_id, options, status, expires_at')
    .eq('id', voteId)
    .single()
  if (voteErr || !vote) throw new Error('投票不存在')
  if (vote.status !== 'active') throw new Error('投票已结束，无法投票')
  if (vote.expires_at && new Date(vote.expires_at) < new Date()) throw new Error('投票已过期，无法投票')
  if (optionIndex < 0 || optionIndex >= (vote.options?.length ?? 0)) throw new Error('无效的选项')

  const { error } = await supabase
    .from('vote_records')
    .upsert({
      vote_id: voteId,
      user_id: user.id,
      circle_id: vote.circle_id,
      option_index: optionIndex,
    })
  if (error) throw error

  if (vote.creator_id && vote.creator_id !== user.id) {
    const nickname = user.user_metadata?.nickname ?? user.email?.split('@')[0] ?? '某人'
    const optionText = vote.options[optionIndex]?.text ?? ''
    await supabase.from('notifications').insert({
      user_id: vote.creator_id,
      circle_id: vote.circle_id,
      type: 'vote_cast',
      content: `${nickname} 在「${vote.title}」中投了「${optionText}」`,
    })
  }
}

export async function closeVote(voteId: string) {
  const { data: vote } = await supabase
    .from('votes')
    .select('title, circle_id')
    .eq('id', voteId)
    .single()

  const { data: closed, error } = await supabase
    .from('votes')
    .update({ status: 'closed' })
    .eq('id', voteId)
    .select('id')
  if (error) throw error
  if (!closed?.length) throw new Error('只有发起人或管理员可以结束投票')

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
            circle_id: vote.circle_id,
            type: 'vote_closed',
            content: `投票「${vote.title}」已结束`,
          })
        )
      )
    }
  }
}

export async function deleteVote(voteId: string) {
  const { data, error } = await supabase
    .from('votes')
    .delete()
    .eq('id', voteId)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('删除失败：无权限或投票不存在')
}

// ============================================================
// Games
// ============================================================

export async function getGames(circleId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*, owners:game_owners(user:profiles(*))')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as any[]).map((g: any) => ({
    ...g,
    owner_count: g.owners?.length ?? 0,
    owners: g.owners?.map((o: any) => o.user) ?? [],
  }))
}

export async function addGame(circleId: string, name: string, steamAppId?: number, coverUrl?: string, genres?: string[]) {
  const { data, error } = await supabase
    .from('games')
    .insert({
      circle_id: circleId,
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

export async function updateGame(gameId: string, updates: { name?: string; genres?: string[] }) {
  const { error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId)
  if (error) throw error
}

export async function deleteGame(gameId: string) {
  const { data, error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('删除失败：仅管理员可删除游戏')
}

export async function claimGame(circleId: string, gameId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')
  const { error } = await supabase
    .from('game_owners')
    .upsert({ game_id: gameId, user_id: user.id, circle_id: circleId })
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
// Game Sessions (小游戏)
// ============================================================

export interface GameSession {
  id: string
  circle_id: string
  kind: 'tictactoe' | 'gomoku'
  status: 'waiting' | 'playing' | 'done' | 'cancelled'
  board: Record<string, string>
  creator_id: string
  opponent_id: string | null
  turn_user_id: string | null
  winner_id: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  opponent?: Profile
}

export async function getGameSessions(circleId: string): Promise<GameSession[]> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*, creator:profiles!game_sessions_creator_id_fkey(*), opponent:profiles!game_sessions_opponent_id_fkey(*)')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function createGameSession(circleId: string, kind: GameSession['kind']): Promise<GameSession> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ circle_id: circleId, kind, creator_id: user.id, board: {} })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGameSession(
  id: string,
  updates: Partial<Pick<GameSession, 'board' | 'status' | 'opponent_id' | 'turn_user_id' | 'winner_id'>>,
) {
  const { data, error } = await supabase
    .from('game_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('对局更新失败：可能已被他人加入，或数据库策略未更新（请重新执行 004 迁移）')
}

export async function deleteGameSession(id: string) {
  const { data, error } = await supabase
    .from('game_sessions')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('删除失败：无权限')
}

// ============================================================
// Rides (开黑车)
// ============================================================

export interface RideMember {
  user_id: string
  joined_at: string
  profile?: Profile
}

export interface Ride {
  id: string
  circle_id: string
  driver_id: string
  ride_date: string   // 'YYYY-MM-DD'
  start_hour: number
  end_hour: number
  game_ids: string[]
  capacity: number    // 总座位数（含司机），0 = 不限
  note: string | null
  status: 'recruiting' | 'driving' | 'ended' | 'cancelled'
  created_at: string
  updated_at: string
  driver?: Profile
  ride_members?: RideMember[]
}

export async function getRides(circleId: string): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select(`
      *,
      driver:profiles!rides_driver_id_fkey(*),
      ride_members(user_id, joined_at, profile:profiles!ride_members_user_id_fkey(*))
    `)
    .eq('circle_id', circleId)
    .order('ride_date', { ascending: true })
    .order('start_hour', { ascending: true })
  if (error) throw error
  return data
}

export async function createRide(
  circleId: string,
  opts: { date: string; startHour: number; endHour: number; gameIds: string[]; capacity: number; note?: string },
): Promise<string> {
  const { data, error } = await supabase.rpc('create_ride', {
    p_circle_id: circleId,
    p_date: opts.date,
    p_start: opts.startHour,
    p_end: opts.endHour,
    p_games: opts.gameIds,
    p_capacity: opts.capacity,
    p_note: opts.note ?? null,
  })
  if (error) throw error
  return data as string
}

export async function joinRide(rideId: string) {
  const { error } = await supabase.rpc('join_ride', { p_ride_id: rideId })
  if (error) throw error
}

export async function leaveRide(rideId: string) {
  const { error } = await supabase.rpc('leave_ride', { p_ride_id: rideId })
  if (error) throw error
}

export async function kickRideMember(rideId: string, userId: string) {
  const { error } = await supabase.rpc('kick_ride_member', { p_ride_id: rideId, p_uid: userId })
  if (error) throw error
}

export async function updateRideStatus(rideId: string, status: Ride['status']) {
  const { data, error } = await supabase
    .from('rides')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', rideId)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('操作失败：无权限')
}

export async function deleteRide(rideId: string) {
  const { data, error } = await supabase
    .from('rides')
    .delete()
    .eq('id', rideId)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('删除失败：无权限')
}

// ============================================================
// Notifications
// ============================================================

export async function getNotifications(limit = 30): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*, circle:circles(id,name)')
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

export async function createNotification(userId: string, circleId: string, type: string, content: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, circle_id: circleId, type, content })
  if (error) throw error
}
