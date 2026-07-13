import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient.js'
import { countEmployees, getEmployee } from './lib/api.js'
import { loadSession, saveSession, clearSession } from './lib/session.js'
import { FISH_IMAGE_URL } from './config.js'
import { RefreshContext } from './lib/refresh.js'
import { ToastProvider } from './components/Toast.jsx'
import Login from './components/Login.jsx'
import Setup from './components/Setup.jsx'
import Header from './components/Header.jsx'
import EmployeeHome from './components/EmployeeHome.jsx'
import ManagerHome from './components/ManagerHome.jsx'

export default function App() {
  const [phase, setPhase] = useState('boot') // boot | setup | login | app | error
  const [user, setUser] = useState(null)
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => t + 1), [])
  const refreshValue = useMemo(() => ({ tick, bump }), [tick, bump])

  // Boot: restore a remembered session, otherwise decide between first-run setup and login.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const session = loadSession()
        if (session?.employeeId) {
          const employee = await getEmployee(session.employeeId)
          if (!alive) return
          if (employee) {
            setUser(employee)
            setPhase('app')
            return
          }
          clearSession()
        }
        const count = await countEmployees()
        if (alive) setPhase(count === 0 ? 'setup' : 'login')
      } catch (err) {
        console.error(err)
        if (alive) setPhase('error')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Live updates: any change to marks/employees re-renders open views, plus refresh on focus.
  useEffect(() => {
    if (!user) return undefined
    const channel = supabase
      .channel('fish-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fish_shift_requests' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fish_employees' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fish_time_entries' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fish_special_days' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fish_active_shifts' }, bump)
      .subscribe()
    window.addEventListener('focus', bump)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', bump)
    }
  }, [user?.id, bump])

  // Keep the logged-in user's row fresh (role changes, deletion).
  useEffect(() => {
    if (!user) return undefined
    let alive = true
    getEmployee(user.id)
      .then((employee) => {
        if (!alive) return
        if (!employee) {
          clearSession()
          setUser(null)
          setPhase('login')
        } else if (
          employee.is_manager !== user.is_manager ||
          employee.first_name !== user.first_name ||
          employee.last_name !== user.last_name
        ) {
          setUser(employee)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [tick])

  function handleLogin(employee, remember = true) {
    setUser(employee)
    if (remember) saveSession({ employeeId: employee.id })
    setPhase('app')
  }

  function handleLogout() {
    clearSession()
    setUser(null)
    setPhase('login')
  }

  let content
  if (phase === 'boot') {
    content = (
      <div className="screen-center">
        <img src={FISH_IMAGE_URL} alt="" className="hero-fish" />
        <p className="muted">טוען…</p>
      </div>
    )
  } else if (phase === 'error') {
    content = (
      <div className="screen-center">
        <img src={FISH_IMAGE_URL} alt="" className="hero-fish" />
        <h2>לא הצלחנו להתחבר לשרת</h2>
        <p className="muted">בדקו את החיבור לאינטרנט ונסו שוב.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          ניסיון נוסף
        </button>
      </div>
    )
  } else if (phase === 'setup') {
    content = <Setup onDone={(employee) => handleLogin(employee, true)} />
  } else if (phase === 'login') {
    content = <Login onLogin={handleLogin} />
  } else {
    content = (
      <div className="appshell">
        <Header user={user} onLogout={handleLogout} />
        {user.is_manager ? <ManagerHome user={user} /> : <EmployeeHome user={user} />}
      </div>
    )
  }

  return (
    <RefreshContext.Provider value={refreshValue}>
      <ToastProvider>{content}</ToastProvider>
    </RefreshContext.Provider>
  )
}
