import { createContext, useContext } from 'react'

// Bumping `tick` re-runs every useLoad in the app (realtime events, window focus, local mutations).
export const RefreshContext = createContext({ tick: 0, bump: () => {} })

export const useRefresh = () => useContext(RefreshContext)
