import { useEffect } from 'react'
import { consumeAuthRedirect, supabase } from '../lib/supabase'
import { flushSyncQueue, startAutoSync } from '../lib/sync'

export function AppBootstrap() {
  useEffect(() => {
    void consumeAuthRedirect()
    const stopSync = startAutoSync()

    const authSubscription = supabase?.auth.onAuthStateChange((_event) => {
      // Trigger a sync attempt on auth transitions (sign-in/sign-out/session refresh).
      void flushSyncQueue()
    })

    return () => {
      stopSync()
      authSubscription?.data.subscription.unsubscribe()
    }
  }, [])

  return null
}
