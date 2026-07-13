import { useEffect, useState } from 'react'
import { ClockIcon } from './icons.jsx'
import { getActiveShift, clockIn, clearActiveShift, saveTimeEntry, errorMessage } from '../lib/api.js'
import { dateKey } from '../lib/dates.js'
import { toHM, fmtElapsed, fmtHM, durationMin, parseTimeToMin } from '../lib/hours.js'
import { useLoad } from '../lib/useLoad.js'
import { useRefresh } from '../lib/refresh.js'
import { useToast } from './Toast.jsx'

// A shift longer than this means someone forgot to clock out — we don't
// auto-save nonsense hours, we ask them to report the day manually.
const FORGOTTEN_MS = 20 * 60 * 60 * 1000

export default function ShiftClock({ user }) {
  const { tick, bump } = useRefresh()
  const toast = useToast()
  const { data: active } = useLoad(() => getActiveShift(user.id), [tick, user.id])
  const [busy, setBusy] = useState(false)

  // re-render every second while the clock is running
  const [, setBeat] = useState(0)
  useEffect(() => {
    if (!active) return undefined
    const t = setInterval(() => setBeat((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [active])

  async function start() {
    setBusy(true)
    try {
      await clockIn(user.id)
      toast('המשמרת התחילה — שעון רץ!')
      bump()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function stop() {
    setBusy(true)
    try {
      const started = new Date(active.started_at)
      const now = new Date()
      const elapsedMs = now.getTime() - started.getTime()
      if (elapsedMs >= FORGOTTEN_MS) {
        await clearActiveShift(user.id)
        toast('המשמרת נמשכה מעל 20 שעות — כנראה שכחתם לסיים. דווחו את השעות ידנית בלחיצה על היום בלוח.', 'error')
      } else {
        const startHM = toHM(started)
        const endHM = toHM(now)
        await saveTimeEntry(user.id, dateKey(started), startHM, endHM)
        await clearActiveShift(user.id)
        const total = durationMin(parseTimeToMin(startHM), parseTimeToMin(endHM))
        toast(`המשמרת נשמרה: ${startHM}–${endHM} (${total ? fmtHM(total) : 'פחות מדקה'})`)
      }
      bump()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!active) {
    return (
      <div className="clock-card">
        <span className="clock-title">
          <ClockIcon size={18} />
          שעון משמרת
        </span>
        <button type="button" className="btn clock-btn clock-start" disabled={busy} onClick={start}>
          התחלת משמרת
        </button>
      </div>
    )
  }

  const started = new Date(active.started_at)
  return (
    <div className="clock-card is-on">
      <span className="clock-live">
        <span className="clock-dot" />
        במשמרת מאז {toHM(started)}
        <strong className="clock-elapsed">{fmtElapsed(Date.now() - started.getTime())}</strong>
      </span>
      <button type="button" className="btn clock-btn clock-stop" disabled={busy} onClick={stop}>
        סיום משמרת
      </button>
    </div>
  )
}
