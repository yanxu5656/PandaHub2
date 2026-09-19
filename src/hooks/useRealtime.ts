import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export function useRealtime(
  table: string,
  event: RealtimeEvent,
  callback: (payload: any) => void,
  enabled = true,
) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(`rt-${table}-${event}`)
      .on(
        'postgres_changes',
        { event: event === '*' ? '*' : event, schema: 'public', table },
        (payload) => cbRef.current(payload),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, event, enabled])
}
