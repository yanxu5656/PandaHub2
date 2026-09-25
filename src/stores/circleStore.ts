import { create } from 'zustand'
import { getMyCircles, getProfile, type MyCircle, type PlatformRole } from '@/lib/services'

const LS_KEY = 'ph_circle_id'

interface CircleState {
  circles: MyCircle[]
  currentId: string | null
  platformRole: PlatformRole
  loaded: boolean
  loading: boolean
  load: (userId: string) => Promise<void>
  setCurrent: (id: string) => void
  reset: () => void
}

export const useCircleStore = create<CircleState>((set) => ({
  circles: [],
  currentId: null,
  platformRole: null,
  loaded: false,
  loading: false,

  load: async (userId) => {
    set({ loading: true })
    try {
      const [circles, profile] = await Promise.all([
        getMyCircles(userId),
        getProfile(userId).catch(() => null),
      ])
      const saved = localStorage.getItem(LS_KEY)
      const valid = saved && circles.some(c => c.id === saved) ? saved : null
      set({
        circles,
        currentId: valid ?? circles[0]?.id ?? null,
        platformRole: profile?.platform_role ?? null,
        loaded: true,
        loading: false,
      })
    } catch (error) {
      console.error('加载圈子失败:', error)
      set({ loaded: true, loading: false })
    }
  },

  setCurrent: (id) => {
    localStorage.setItem(LS_KEY, id)
    set({ currentId: id })
  },

  reset: () => {
    set({ circles: [], currentId: null, platformRole: null, loaded: false, loading: false })
  },
}))

export function currentCircle(): MyCircle | null {
  const { circles, currentId } = useCircleStore.getState()
  return circles.find(c => c.id === currentId) ?? null
}

export function myCircleRole() {
  return currentCircle()?.my_role ?? null
}

export function isCircleAdmin() {
  const role = myCircleRole()
  return role === 'owner' || role === 'admin'
}
