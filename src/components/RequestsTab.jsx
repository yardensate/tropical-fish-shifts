import { useMemo, useState } from 'react'
import { CheckIcon } from './icons.jsx'
import { dayLabel } from '../lib/dates.js'
import { decideRequest, errorMessage } from '../lib/api.js'
import { useRefresh } from '../lib/refresh.js'
import { useToast } from './Toast.jsx'

// Pending "want" requests, grouped by shift date, with one-tap approve/reject.
export default function RequestsTab({ user, requests }) {
  const { bump } = useRefresh()
  const toast = useToast()
  const [busyId, setBusyId] = useState(null)

  const groups = useMemo(() => {
    const map = new Map()
    for (const row of requests) {
      if (!map.has(row.shift_date)) map.set(row.shift_date, [])
      map.get(row.shift_date).push(row)
    }
    return [...map.entries()]
  }, [requests])

  async function decide(requestId, status) {
    setBusyId(requestId)
    try {
      await decideRequest(requestId, status, user.id)
      toast(status === 'approved' ? 'הבקשה אושרה' : 'הבקשה נדחתה')
      bump()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="container">
      <div className="pagehead">
        <h1 className="pagehead-title">בקשות שממתינות לאישור</h1>
        <p className="pagehead-sub">עובדים שסימנו ״רוצה לעבוד״ ומחכים לתשובה שלך.</p>
      </div>
      {groups.length === 0 && (
        <div className="empty">
          <CheckIcon size={28} />
          <p>אין בקשות שממתינות לאישור. הכול מטופל!</p>
        </div>
      )}
      {groups.map(([date, rows]) => (
        <section key={date} className="day-group">
          <h3 className="day-group-title">{dayLabel(date)}</h3>
          <div className="list">
            {rows.map((row) => (
              <div className="row" key={row.id}>
                <div className="row-main">
                  <span className="row-name">
                    {row.employee.first_name} {row.employee.last_name}
                  </span>
                  <span className="status-tag st-pending">רוצה לעבוד</span>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="pillbtn pillbtn-ok"
                    disabled={busyId === row.id}
                    onClick={() => decide(row.id, 'approved')}
                  >
                    אשר
                  </button>
                  <button
                    type="button"
                    className="pillbtn pillbtn-no"
                    disabled={busyId === row.id}
                    onClick={() => decide(row.id, 'rejected')}
                  >
                    דחה
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
