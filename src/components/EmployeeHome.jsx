import { useMemo, useState } from 'react'
import CalendarGrid, { MonthNav } from './CalendarGrid.jsx'
import DayModal from './DayModal.jsx'
import { CheckIcon, ClockIcon, XIcon, PlusIcon } from './icons.jsx'
import { currentMonth, addMonths, monthRangeKeys, isPastKey } from '../lib/dates.js'
import { getMarksForEmployee, setMark, clearMark, errorMessage } from '../lib/api.js'
import { markState } from '../lib/status.js'
import { useLoad } from '../lib/useLoad.js'
import { useRefresh } from '../lib/refresh.js'
import { useToast } from './Toast.jsx'

const STATE_ICONS = {
  approved: <CheckIcon />,
  pending: <ClockIcon />,
  rejected: <XIcon />,
  dont: <XIcon />,
}

export function Legend() {
  return (
    <div className="legend">
      <span className="legend-item"><span className="dot dot-ok" />מאושר</span>
      <span className="legend-item"><span className="dot dot-pending" />ממתין לאישור</span>
      <span className="legend-item"><span className="dot dot-no" />לא רוצה</span>
      <span className="legend-item"><span className="dot dot-gray" />ימי חול</span>
    </div>
  )
}

// The employee's calendar: current month by default, may peek one month ahead.
export default function EmployeeHome({ user, embedded = false }) {
  const { tick, bump } = useRefresh()
  const toast = useToast()
  const [ym, setYm] = useState(currentMonth())
  const minYM = currentMonth()
  const maxYM = addMonths(minYM, 1)
  const range = monthRangeKeys(ym.year, ym.month)

  const { data: marks, loading } = useLoad(
    () => getMarksForEmployee(user.id, range.from, range.to),
    [tick, ym.year, ym.month, user.id],
  )
  const byDate = useMemo(
    () => Object.fromEntries((marks || []).map((m) => [m.shift_date, m])),
    [marks],
  )

  const [selectedKey, setSelectedKey] = useState(null)
  const [busy, setBusy] = useState(false)

  async function pick(preference) {
    setBusy(true)
    try {
      await setMark(user.id, selectedKey, preference)
      toast(preference === 'want' ? 'הבקשה נשלחה לאישור המנהל' : 'הסימון נשמר')
      setSelectedKey(null)
      bump()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    try {
      await clearMark(user.id, selectedKey)
      toast('הסימון הוסר')
      setSelectedKey(null)
      bump()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const renderWeekend = (cell, isToday) => {
    const mark = byDate[cell.key]
    const st = markState(mark)
    const past = isPastKey(cell.key)
    return (
      <button
        type="button"
        key={cell.key}
        className={[
          'cal-cell',
          'is-weekend-cell',
          st ? `st-${st.kind}` : '',
          isToday ? 'is-today' : '',
          past ? 'is-past' : '',
        ].join(' ')}
        onClick={() => setSelectedKey(cell.key)}
        disabled={past}
      >
        <span className="cal-daynum">{cell.date.getDate()}</span>
        {st ? (
          <span className={`cal-status st-${st.kind}`}>
            {STATE_ICONS[st.kind]}
            {st.label}
          </span>
        ) : !past ? (
          <span className="cal-hint">
            <PlusIcon size={12} />
            סימון
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <main className="container">
      {!embedded && (
        <div className="pagehead">
          <h1 className="pagehead-title">שלום, {user.first_name}!</h1>
          <p className="pagehead-sub">
            לחצו על יום שישי או שבת וסמנו אם אתם רוצים לעבוד. סימון ״רוצה״ נשלח לאישור מנהל.
          </p>
        </div>
      )}
      <MonthNav ym={ym} onChange={setYm} min={minYM} max={maxYM} />
      <Legend />
      {loading && !marks ? (
        <p className="muted-center">טוען נתונים…</p>
      ) : (
        <CalendarGrid year={ym.year} month={ym.month} renderWeekend={renderWeekend} />
      )}
      {selectedKey && (
        <DayModal
          dayKey={selectedKey}
          mark={byDate[selectedKey]}
          busy={busy}
          onPick={pick}
          onClear={clear}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </main>
  )
}
