import { useMemo, useState } from 'react'
import CalendarGrid, { MonthNav } from './CalendarGrid.jsx'
import Modal from './Modal.jsx'
import { Legend } from './EmployeeHome.jsx'
import { CheckIcon, ClockIcon, XIcon } from './icons.jsx'
import { currentMonth, monthRangeKeys, dayLabel, parseKey } from '../lib/dates.js'
import {
  getMarksForRange,
  getSpecialDays,
  decideRequest,
  addSpecialDay,
  deleteSpecialDay,
  errorMessage,
} from '../lib/api.js'
import { markState } from '../lib/status.js'
import { dayInfo, PAY_CLASSES } from '../lib/hours.js'
import { useLoad } from '../lib/useLoad.js'
import { useRefresh } from '../lib/refresh.js'
import { useToast } from './Toast.jsx'

const CHIP_CLASS = { approved: 'chip-ok', pending: 'chip-pending', rejected: 'chip-rejected', dont: 'chip-no' }

const CLASS_OPTIONS = [
  { id: 'regular', label: 'יום רגיל (9 ש׳)' },
  { id: 'friday', label: 'כמו ערב חג (7 ש׳)' },
  { id: 'saturday', label: 'כמו חג/שבת (8 ש׳)' },
]

// Manager control inside the day modal: name a custom volunteer day or remove a special day.
function SpecialDaySection({ dayKey, info, user, onChanged }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [payClass, setPayClass] = useState('regular')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim()) {
      toast('תנו שם ליום (למשל: אירוע חברה)', 'error')
      return
    }
    setBusy(true)
    try {
      await addSpecialDay({ day: dayKey, name, payClass, createdBy: user.id })
      toast('היום הוגדר כיום התנדבות')
      onChanged()
    } catch (err) {
      toast(err?.code ? errorMessage(err) : err.message || 'שגיאה', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteSpecialDay(info.special.id)
      toast('היום המיוחד הוסר')
      onChanged()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (info.special) {
    return (
      <div className="special-box">
        <span>
          ★ <strong>{info.special.name}</strong> · {PAY_CLASSES[info.payClass].label}
          {info.special.source === 'holiday' ? ' · חג מהלוח' : ''}
        </span>
        <button type="button" className="pillbtn pillbtn-danger" disabled={busy} onClick={remove}>
          הסרה
        </button>
      </div>
    )
  }

  return (
    <div className="addspecial">
      <h4 className="section-title">הגדרת היום כיום התנדבות / חג</h4>
      <input
        className="text-input"
        placeholder="שם היום (למשל: מבצע אביב)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="pills">
        {CLASS_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`pill-radio ${payClass === o.id ? 'active' : ''}`}
            onClick={() => setPayClass(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={add}>
        הוספה כיום התנדבות
      </button>
    </div>
  )
}

// Manager overview: everyone's marks on one calendar; tap any day for details,
// approval actions and special-day management.
export default function BoardTab({ user }) {
  const { tick, bump } = useRefresh()
  const toast = useToast()
  const [ym, setYm] = useState(currentMonth())
  const range = monthRangeKeys(ym.year, ym.month)

  const { data, loading } = useLoad(async () => {
    const [marks, specials] = await Promise.all([
      getMarksForRange(range.from, range.to),
      getSpecialDays(range.from, range.to),
    ])
    return { marks, specials }
  }, [tick, ym.year, ym.month])

  const byDate = useMemo(() => {
    const map = {}
    for (const row of data?.marks || []) (map[row.shift_date] ||= []).push(row)
    return map
  }, [data])
  const specialsBy = useMemo(
    () => Object.fromEntries((data?.specials || []).map((s) => [s.day, s])),
    [data],
  )

  const [dayKey, setDayKey] = useState(null)

  async function decide(requestId, status) {
    try {
      await decideRequest(requestId, status, user.id)
      toast(status === 'approved' ? 'הבקשה אושרה' : 'הבקשה נדחתה')
      bump()
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const renderDay = (cell, isToday) => {
    const info = dayInfo(cell.key, cell.weekday, specialsBy)
    const rows = byDate[cell.key] || []

    if (!info.volunteerable) {
      return (
        <button
          type="button"
          key={cell.key}
          className={`cal-cell is-weekday is-clickable ${isToday ? 'is-today' : ''}`}
          onClick={() => setDayKey(cell.key)}
        >
          <span className="cal-daynum">{cell.date.getDate()}</span>
        </button>
      )
    }

    const shown = rows.slice(0, 2)
    const approved = rows.filter((r) => r.status === 'approved').length
    const pending = rows.filter((r) => r.status === 'pending').length
    const dont = rows.filter((r) => r.preference === 'dont_want').length
    return (
      <button
        type="button"
        key={cell.key}
        className={`cal-cell is-weekend-cell is-mgr ${info.special ? 'is-holiday' : ''} ${isToday ? 'is-today' : ''}`}
        onClick={() => setDayKey(cell.key)}
      >
        <span className="cal-daynum">{cell.date.getDate()}</span>
        {info.name && <span className="day-tag">{info.name}</span>}
        <span className="cal-chips">
          {shown.map((row) => (
            <span key={row.id} className={`chip ${CHIP_CLASS[markState(row).kind]}`}>
              {row.employee.first_name} {row.employee.last_name?.[0]}׳
            </span>
          ))}
          {rows.length > shown.length && (
            <span className="chip chip-more">+{rows.length - shown.length}</span>
          )}
        </span>
        {(approved > 0 || pending > 0 || dont > 0) && (
          <span className="cellstats">
            {approved > 0 && <span className="stat stat-ok"><CheckIcon size={11} />{approved}</span>}
            {pending > 0 && <span className="stat stat-pending"><ClockIcon size={11} />{pending}</span>}
            {dont > 0 && <span className="stat stat-no"><XIcon size={11} />{dont}</span>}
          </span>
        )}
      </button>
    )
  }

  const dayRows = dayKey ? byDate[dayKey] || [] : []
  const wants = dayRows.filter((r) => r.preference === 'want')
  const donts = dayRows.filter((r) => r.preference === 'dont_want')
  const dayKeyInfo = dayKey ? dayInfo(dayKey, parseKey(dayKey).getDay(), specialsBy) : null

  return (
    <main className="container">
      <MonthNav ym={ym} onChange={setYm} />
      <Legend />
      {loading && !data ? (
        <p className="muted-center">טוען נתונים…</p>
      ) : (
        <CalendarGrid year={ym.year} month={ym.month} renderDay={renderDay} />
      )}
      {dayKey && (
        <Modal title={dayLabel(dayKey)} onClose={() => setDayKey(null)}>
          <SpecialDaySection dayKey={dayKey} info={dayKeyInfo} user={user} onChanged={bump} />
          {dayRows.length === 0 && dayKeyInfo.volunteerable && (
            <p className="empty">אף אחד עדיין לא סימן את היום הזה.</p>
          )}
          {wants.length > 0 && (
            <>
              <h4 className="section-title">רוצים לעבוד ({wants.length})</h4>
              <div className="list">
                {wants.map((row) => {
                  const st = markState(row)
                  return (
                    <div className="row" key={row.id}>
                      <div className="row-main">
                        <span className="row-name">
                          {row.employee.first_name} {row.employee.last_name}
                        </span>
                        <span className={`status-tag st-${st.kind}`}>{st.label}</span>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="pillbtn pillbtn-ok"
                          disabled={row.status === 'approved'}
                          onClick={() => decide(row.id, 'approved')}
                        >
                          אשר
                        </button>
                        <button
                          type="button"
                          className="pillbtn pillbtn-no"
                          disabled={row.status === 'rejected'}
                          onClick={() => decide(row.id, 'rejected')}
                        >
                          דחה
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {donts.length > 0 && (
            <>
              <h4 className="section-title">לא רוצים לעבוד ({donts.length})</h4>
              <div className="list">
                {donts.map((row) => (
                  <div className="row" key={row.id}>
                    <div className="row-main">
                      <span className="row-name">
                        {row.employee.first_name} {row.employee.last_name}
                      </span>
                      <span className="status-tag st-dont">לא רוצה</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </main>
  )
}
