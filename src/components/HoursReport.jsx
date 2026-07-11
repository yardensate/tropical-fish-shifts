import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { monthLabel, parseKey, WEEKDAYS_HE } from '../lib/dates.js'
import { dayInfo, fmtHM, trimTime } from '../lib/hours.js'

// Printable monthly hours report. "Download PDF" = the browser's print dialog
// with Save-as-PDF — the only way to get correct Hebrew/RTL in a PDF without
// shipping font files and a PDF engine.
export default function HoursReport({ ym, perEmployee, grand, specialsBy, allEmployees, onClose }) {
  useEffect(() => {
    document.body.classList.add('report-open')
    const t = setTimeout(() => window.print(), 600)
    return () => {
      document.body.classList.remove('report-open')
      clearTimeout(t)
    }
  }, [])

  const reportedIds = new Set(perEmployee.map((g) => g.employee?.id))
  const missing = (allEmployees || []).filter((e) => !reportedIds.has(e.id))
  const totalDays = perEmployee.reduce((acc, g) => acc + g.rows.length, 0)

  return createPortal(
    <div className="report-overlay" dir="rtl" lang="he">
      <div className="report-toolbar no-print">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          הדפסה / שמירה כ־PDF
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          סגירה
        </button>
      </div>

      <header className="report-head">
        <h1>טרופיקל פיש · דוח שעות עבודה</h1>
        <p>
          {monthLabel(ym.year, ym.month)} · הופק בתאריך {new Date().toLocaleDateString('he-IL')}
        </p>
      </header>

      <section className="report-sec">
        <h2>סיכום כללי</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>עובד</th>
              <th>ימים</th>
              <th>סה״כ</th>
              <th>רגילות (100%)</th>
              <th>נוספות 125%</th>
              <th>נוספות 150%</th>
            </tr>
          </thead>
          <tbody>
            {perEmployee.map((g) => (
              <tr key={g.employee?.id}>
                <td>
                  {g.employee?.first_name} {g.employee?.last_name}
                </td>
                <td className="num">{g.rows.length}</td>
                <td className="num strong">{fmtHM(g.sum.total)}</td>
                <td className="num">{fmtHM(g.sum.base)}</td>
                <td className="num">{fmtHM(g.sum.ot125)}</td>
                <td className="num">{fmtHM(g.sum.ot150)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>סה״כ כללי</td>
              <td className="num">{totalDays}</td>
              <td className="num strong">{fmtHM(grand.total)}</td>
              <td className="num">{fmtHM(grand.base)}</td>
              <td className="num">{fmtHM(grand.ot125)}</td>
              <td className="num">{fmtHM(grand.ot150)}</td>
            </tr>
          </tbody>
        </table>
        {missing.length > 0 && (
          <p className="report-note">
            ללא דיווחים החודש: {missing.map((e) => `${e.first_name} ${e.last_name}`).join(', ')}
          </p>
        )}
      </section>

      {perEmployee.map((g) => (
        <section className="report-sec report-emp" key={g.employee?.id}>
          <h2>
            {g.employee?.first_name} {g.employee?.last_name}
          </h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>תאריך</th>
                <th>יום</th>
                <th>שעות</th>
                <th>סה״כ</th>
                <th>100%</th>
                <th>125%</th>
                <th>150%</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => {
                const d = parseKey(r.work_date)
                const info = dayInfo(r.work_date, d.getDay(), specialsBy)
                return (
                  <tr key={r.id}>
                    <td className="num">
                      {d.getDate()}.{d.getMonth() + 1}
                    </td>
                    <td>
                      {WEEKDAYS_HE[d.getDay()]}
                      {info.name ? ` · ${info.name}` : ''}
                    </td>
                    <td className="num" dir="ltr">
                      {trimTime(r.start_time)}–{trimTime(r.end_time)}
                    </td>
                    <td className="num strong">{fmtHM(r.bd.total)}</td>
                    <td className="num">{fmtHM(r.bd.base)}</td>
                    <td className="num">{r.bd.ot125 ? fmtHM(r.bd.ot125) : '—'}</td>
                    <td className="num">{r.bd.ot150 ? fmtHM(r.bd.ot150) : '—'}</td>
                  </tr>
                )
              })}
              <tr className="total-row">
                <td colSpan={3}>סה״כ · {g.rows.length} ימים</td>
                <td className="num strong">{fmtHM(g.sum.total)}</td>
                <td className="num">{fmtHM(g.sum.base)}</td>
                <td className="num">{fmtHM(g.sum.ot125)}</td>
                <td className="num">{fmtHM(g.sum.ot150)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      ))}

      <footer className="report-foot">
        טרופיקל פיש · מערכת משמרות סופ״ש · שעות בסיס: יום רגיל 9 · שישי/ערב חג 7 · שבת/חג 8 ·
        מעבר לבסיס: שעתיים 125% ואז 150%
      </footer>
    </div>,
    document.body,
  )
}
