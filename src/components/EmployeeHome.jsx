import { useMemo, useState } from 'react'
import CalendarGrid, { MonthNav } from './CalendarGrid.jsx'
import DayModal from './DayModal.jsx'
import { CheckIcon, ClockIcon, XIcon, PlusIcon } from './icons.jsx'
import { currentMonth, addMonths, monthRangeKeys, isPastKey, parseKey } from '../lib/dates.js'
import {
  getMarksForEmployee,
  getTimeEntriesForEmployee,
  getSpecialDays,
  setMark,
  clearMark,
  saveTimeEntry,
  deleteTimeEntry,
  errorMessage,
} from '../lib/api.js'
import { markState } from '../lib/status.js'
import { dayInfo, entryBreakdown, sumBreakdowns, fmtHM } from '../lib/hours.js'
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
      <span className="legend-item"><span className="dot dot-holiday" />חג / יום מיוחד</span>
    </div>
  )
}

// The employee's calendar: previous month (for hours reporting) up to next month.
export default function EmployeeHome({ user, embedded = false }) {
  const { tick, bump } = useRefresh()
  const toast = useToast()
  const [ym, setYm] = useState(currentMonth())
  const minYM = addMonths(currentMonth(), -1)
  const maxYM = addMonths(currentMonth(), 1)
  const range = monthRangeKeys(ym.year, ym.month)

  const { data, loading } = useLoad(async () => {
    const [marks, entries, specials] = await Promise.all([
      getMarksForEmployee(user.id, range.from, range.to),
      getTimeEntriesForEmployee(user.id, range.from, range.to),
      getSpecialDays(range.from, range.to),
    ])
    return { marks, entries, specials }
  }, [tick, ym.year, ym.month, user.id])

  const marksBy = useMemo(
    () => Object.fromEntries((data?.marks || []).map((m) => [m.shift_date, m])),
    [data],
  )
  const entriesBy = useMemo(
    () => Object.fromEntries((data?.entries || []).map((e) => [e.work_date, e])),
    [data],
  )
  const specialsBy = useMemo(
    () => Object.fromEntries((data?.specials || []).map((s) => [s.day, s])),
    [data],
  )

  const [selectedKey, setSelectedKey] = useState(null)
  const [busy, setBusy] = useState(false)

  async function run(fn, message) {
    setBusy(true)
    try {
      await fn()
      toast(message)
      setSelectedKey(null)
      bump()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const pick = (preference) =>
    run(
      () => setMark(user.id, selectedKey, preference),
      preference === 'want' ? 'הבקשה נשלחה לאישור המנהל' : 'הסימון נשמר',
    )
  const clear = () => run(() => clearMark(user.id, selectedKey), 'הסימון הוסר')
  const saveHours = (start, end) =>
    run(() => saveTimeEntry(user.id, selectedKey, start, end), 'דיווח השעות נשמר')
  const deleteHours = () => run(() => deleteTimeEntry(user.id, selectedKey), 'דיווח השעות נמחק')

  // Hours can be reported on ANY day of the week — past, today or ahead of time.
  const renderDay = (cell, isToday) => {
    const info = dayInfo(cell.key, cell.weekday, specialsBy)
    const mark = marksBy[cell.key]
    const entry = entriesBy[cell.key]
    const st = markState(mark)
    const past = isPastKey(cell.key)
    const canVolunteer = info.volunteerable && !past

    if (!info.volunteerable) {
      return (
        <button
          type="button"
          key={cell.key}
          className={`cal-cell is-weekday is-clickable ${isToday ? 'is-today' : ''}`}
          onClick={() => setSelectedKey(cell.key)}
        >
          <span className="cal-daynum">{cell.date.getDate()}</span>
          {entry ? (
            <span className="cal-entry">
              <ClockIcon size={11} />
              {fmtHM(entryBreakdown(entry, info.payClass).total)}
            </span>
          ) : (
            <span className="cal-hint">
              <PlusIcon size={12} />
              <span className="hint-word">שעות</span>
            </span>
          )}
        </button>
      )
    }

    return (
      <button
        type="button"
        key={cell.key}
        className={[
          'cal-cell',
          'is-weekend-cell',
          info.special ? 'is-holiday' : '',
          st ? `st-${st.kind}` : '',
          isToday ? 'is-today' : '',
          past ? 'is-past' : '',
        ].join(' ')}
        onClick={() => setSelectedKey(cell.key)}
      >
        <span className="cal-daynum">
          {cell.date.getDate()}
          {entry && (
            <span className="mini-clock">
              <ClockIcon size={11} />
            </span>
          )}
        </span>
        {info.name && <span className="day-tag">{info.name}</span>}
        {st ? (
          <span className={`cal-status st-${st.kind}`}>
            {STATE_ICONS[st.kind]}
            {st.label}
          </span>
        ) : canVolunteer ? (
          <span className="cal-hint">
            <PlusIcon size={12} />
            סימון
          </span>
        ) : null}
      </button>
    )
  }

  const monthTotal = useMemo(() => {
    const entries = data?.entries || []
    if (!entries.length) return null
    const sum = sumBreakdowns(
      entries.map((e) =>
        entryBreakdown(e, dayInfo(e.work_date, parseKey(e.work_date).getDay(), specialsBy).payClass),
      ),
    )
    return { days: entries.length, sum }
  }, [data, specialsBy])

  const selInfo = selectedKey
    ? dayInfo(selectedKey, parseKey(selectedKey).getDay(), specialsBy)
    : null

  return (
    <main className="container">
      {!embedded && (
        <div className="pagehead">
          <h1 className="pagehead-title">שלום, {user.first_name}!</h1>
          <p className="pagehead-sub">
            לחצו על כל יום כדי לדווח שעות עבודה. בימי שישי, שבת וחג אפשר גם לסמן ״רוצה / לא רוצה
            לעבוד״ — סימון ״רוצה״ נשלח לאישור מנהל.
          </p>
        </div>
      )}
      <MonthNav ym={ym} onChange={setYm} min={minYM} max={maxYM} />
      <Legend />
      {loading && !data ? (
        <p className="muted-center">טוען נתונים…</p>
      ) : (
        <CalendarGrid year={ym.year} month={ym.month} renderDay={renderDay} />
      )}
      {monthTotal && (
        <div className="hours-summary">
          <span>
            שעות החודש: {monthTotal.days} ימים · {fmtHM(monthTotal.sum.total)}
          </span>
          <span className="hs-bd">
            100%: {fmtHM(monthTotal.sum.base)} · 125%: {fmtHM(monthTotal.sum.ot125)} · 150%:{' '}
            {fmtHM(monthTotal.sum.ot150)}
          </span>
        </div>
      )}
      {selectedKey && (
        <DayModal
          dayKey={selectedKey}
          info={selInfo}
          mark={marksBy[selectedKey]}
          entry={entriesBy[selectedKey]}
          canVolunteer={selInfo.volunteerable && !isPastKey(selectedKey)}
          canReport
          busy={busy}
          onPick={pick}
          onClear={clear}
          onSaveHours={saveHours}
          onDeleteHours={deleteHours}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </main>
  )
}
