import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  setSession: (session: Session | null) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, nickname: string) => Promise<void>
  updateProfile: (updates: { nickname?: string; avatar_url?: string }) => Promise<void>
  signOut: () => Promise<void>
  init: () => Promise<void>
}

let authListenerBound = false

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  setSession: (session) => set({ session, user: session?.user ?? null, loading: false }),

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  signUp: async (email, password, nickname) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } },
    })
    if (error) throw error
  },

  updateProfile: async (updates: { nickname?: string; avatar_url?: string }) => {
    const { data, error } = await supabase.auth.updateUser({ data: updates })
    if (error) throw error
    if (data.user) set({ user: data.user })
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    set({ user: null, session: null })
  },

  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null, loading: false })

      if (!authListenerBound) {
        authListenerBound = true
        supabase.auth.onAuthStateChange((_event, session) => {
          set({ session, user: session?.user ?? null, loading: false })
        })
      }
    } catch (error) {
      console.error('Auth init failed:', error)
      set({ loading: false })
    }
  },
}))
