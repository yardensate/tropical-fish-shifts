import { useEffect, useState } from 'react'

// Tiny data loader: keeps previous data while refreshing so the UI never flickers.
export function useLoad(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: s.data == null, error: null }))
    fn().then(
      (data) => alive && setState({ loading: false, data, error: null }),
      (error) => alive && setState((s) => ({ loading: false, data: s.data, error })),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}
