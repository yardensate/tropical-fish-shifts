import { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import HoursReport from './HoursReport.jsx'
import { MonthNav } from './CalendarGrid.jsx'
import { ClockIcon, DownloadIcon } from './icons.jsx'
import { currentMonth, monthRangeKeys, dayLabel, parseKey } from '../lib/dates.js'
import { getTimeEntriesForRange, getSpecialDays, listEmployees } from '../lib/api.js'
import { dayInfo, entryBreakdown, sumBreakdowns, fmtHM, trimTime } from '../lib/hours.js'
import { useLoad } from '../lib/useLoad.js'
import { useRefresh } from '../lib/refresh.js'

// Manager payroll view: per-employee monthly hour totals split into 100%/125%/150%.
export default function HoursTab() {
  const { tick } = useRefresh()
  const [ym, setYm] = useState(currentMonth())
  const range = monthRangeKeys(ym.year, ym.month)

  const { data, loading } = useLoad(async () => {
    const [entries, specials, employees] = await Promise.all([
      getTimeEntriesForRange(range.from, range.to),
      getSpecialDays(range.from, range.to),
      listEmployees(),
    ])
    return { entries, specials, employees }
  }, [tick, ym.year, ym.month])

  const specialsBy = useMemo(
    () => Object.fromEntries((data?.specials || []).map((s) => [s.day, s])),
    [data],
  )

  const perEmployee = useMemo(() => {
    const map = new Map()
    for (const e of data?.entries || []) {
      const key = e.employee?.id || e.employee_id
      if (!map.has(key)) map.set(key, { employee: e.employee, rows: [] })
      map.get(key).rows.push({
        ...e,
        bd: entryBreakdown(e, dayInfo(e.work_date, parseKey(e.work_date).getDay(), specialsBy).payClass),
      })
    }
    const list = [...map.values()].map((g) => ({
      ...g,
      sum: sumBreakdowns(g.rows.map((r) => r.bd)),
    }))
    list.sort((a, b) =>
      (a.employee?.first_name || '').localeCompare(b.employee?.first_name || '', 'he'),
    )
    return list
  }, [data, specialsBy])

  const grand = useMemo(() => sumBreakdowns(perEmployee.map((g) => g.sum)), [perEmployee])
  const [open, setOpen] = useState(null)
  const [showReport, setShowReport] = useState(false)

  return (
    <main className="container">
      <div className="pagehead pagehead-row">
        <div>
          <h1 className="pagehead-title">דיווחי שעות</h1>
          <p className="pagehead-sub">
            שעות העבודה שהעובדים דיווחו, עם פירוק לשעות רגילות, 125% ו־150%. לחיצה על עובד פותחת
            פירוט יומי.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={perEmployee.length === 0}
          onClick={() => setShowReport(true)}
        >
          <DownloadIcon size={16} /> דוח PDF
        </button>
      </div>
      <MonthNav ym={ym} onChange={setYm} />
      {loading && !data ? (
        <p className="muted-center">טוען נתונים…</p>
      ) : perEmployee.length === 0 ? (
        <div className="empty">
          <ClockIcon size={28} />
          <p>אין דיווחי שעות בחודש הזה עדיין.</p>
        </div>
      ) : (
        <>
          <div className="hours-summary">
            <span>סה״כ החודש: {fmtHM(grand.total)}</span>
            <span className="hs-bd">
              100%: {fmtHM(grand.base)} · 125%: {fmtHM(grand.ot125)} · 150%: {fmtHM(grand.ot150)}
            </span>
          </div>
          <div className="list">
            {perEmployee.map((g) => (
              <button type="button" className="row row-click" key={g.employee?.id} onClick={() => setOpen(g)}>
                <span className="avatar">
                  {g.employee?.first_name?.[0]}
                  {g.employee?.last_name?.[0]}
                </span>
                <div className="row-main">
                  <span className="row-name">
                    {g.employee?.first_name} {g.employee?.last_name}
                  </span>
                  <span className="row-sub">
                    {g.rows.length} ימים · סה״כ {fmtHM(g.sum.total)}
                  </span>
                </div>
                <div className="bd-tags">
                  <span className="status-tag st-approved">100% · {fmtHM(g.sum.base)}</span>
                  <span className="status-tag st-pending">125% · {fmtHM(g.sum.ot125)}</span>
                  <span className="status-tag st-dont">150% · {fmtHM(g.sum.ot150)}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {showReport && (
        <HoursReport
          ym={ym}
          perEmployee={perEmployee}
          grand={grand}
          specialsBy={specialsBy}
          allEmployees={data?.employees}
          onClose={() => setShowReport(false)}
        />
      )}
      {open && (
        <Modal
          title={`${open.employee?.first_name} ${open.employee?.last_name} · פירוט שעות`}
          onClose={() => setOpen(null)}
        >
          <div className="list">
            {open.rows.map((r) => (
              <div className="row" key={r.id}>
                <div className="row-main">
                  <span className="row-name">{dayLabel(r.work_date)}</span>
                  <span className="row-sub" dir="ltr">
                    {trimTime(r.start_time)}–{trimTime(r.end_time)}
                  </span>
                </div>
                <div className="bd-tags">
                  <span className="status-tag st-approved">{fmtHM(r.bd.base)}</span>
                  {r.bd.ot125 > 0 && (
                    <span className="status-tag st-pending">125% · {fmtHM(r.bd.ot125)}</span>
                  )}
                  {r.bd.ot150 > 0 && (
                    <span className="status-tag st-dont">150% · {fmtHM(r.bd.ot150)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </main>
  )
}
