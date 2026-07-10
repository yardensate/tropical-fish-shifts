import { useMemo, useState } from 'react'
import CalendarGrid, { MonthNav } from './CalendarGrid.jsx'
import Modal from './Modal.jsx'
import { Legend } from './EmployeeHome.jsx'
import { CheckIcon, ClockIcon, XIcon } from './icons.jsx'
import { currentMonth, monthRangeKeys, dayLabel } from '../lib/dates.js'
import { getMarksForRange, decideRequest, errorMessage } from '../lib/api.js'
import { markState } from '../lib/status.js'
import { useLoad } from '../lib/useLoad.js'
import { useRefresh } from '../lib/refresh.js'
import { useToast } from './Toast.jsx'

const CHIP_CLASS = { approved: 'chip-ok', pending: 'chip-pending', rejected: 'chip-rejected', dont: 'chip-no' }

// Manager overview: every employee's marks on one calendar, tap a day for details + approval.
export default function BoardTab({ user }) {
  const { tick, bump } = useRefresh()
  const toast = useToast()
  const [ym, setYm] = useState(currentMonth())
  const range = monthRangeKeys(ym.year, ym.month)
  const { data: marks, loading } = useLoad(
    () => getMarksForRange(range.from, range.to),
    [tick, ym.year, ym.month],
  )

  const byDate = useMemo(() => {
    const map = {}
    for (const row of marks || []) (map[row.shift_date] ||= []).push(row)
    return map
  }, [marks])

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

  const renderWeekend = (cell, isToday) => {
    const rows = byDate[cell.key] || []
    const shown = rows.slice(0, 2)
    const approved = rows.filter((r) => r.status === 'approved').length
    const pending = rows.filter((r) => r.status === 'pending').length
    const dont = rows.filter((r) => r.preference === 'dont_want').length
    return (
      <button
        type="button"
        key={cell.key}
        className={`cal-cell is-weekend-cell is-mgr ${isToday ? 'is-today' : ''}`}
        onClick={() => setDayKey(cell.key)}
      >
        <span className="cal-daynum">{cell.date.getDate()}</span>
        <span className="cal-chips">
          {shown.map((row) => (
            <span key={row.id} className={`chip ${CHIP_CLASS[markState(row).kind]}`}>
              {row.employee.first_name} {row.employee.last_name?.[0]}׳
            </span>
          ))}
          {rows.length > shown.length && <span className="chip chip-more">+{rows.length - shown.length}</span>}
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

  return (
    <main className="container">
      <MonthNav ym={ym} onChange={setYm} />
      <Legend />
      {loading && !marks ? (
        <p className="muted-center">טוען נתונים…</p>
      ) : (
        <CalendarGrid year={ym.year} month={ym.month} renderWeekend={renderWeekend} />
      )}
      {dayKey && (
        <Modal title={dayLabel(dayKey)} onClose={() => setDayKey(null)}>
          {dayRows.length === 0 && <p className="empty">אף אחד עדיין לא סימן את היום הזה.</p>}
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
