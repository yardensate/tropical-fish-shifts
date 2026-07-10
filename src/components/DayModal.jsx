import { useState } from 'react'
import Modal from './Modal.jsx'
import { dayLabel } from '../lib/dates.js'
import { markState } from '../lib/status.js'
import { CheckIcon, XIcon, ClockIcon } from './icons.jsx'
import {
  PAY_CLASSES,
  parseTimeToMin,
  durationMin,
  calcBreakdown,
  trimTime,
  fmtHM,
} from '../lib/hours.js'

function HoursSection({ info, entry, busy, onSave, onDelete }) {
  const [start, setStart] = useState(entry ? trimTime(entry.start_time) : '08:00')
  const [end, setEnd] = useState(entry ? trimTime(entry.end_time) : '18:00')
  const startMin = parseTimeToMin(start)
  const endMin = parseTimeToMin(end)
  const total = durationMin(startMin, endMin)
  const breakdown = total != null ? calcBreakdown(total, info.payClass) : null
  const overnight = startMin != null && endMin != null && endMin < startMin
  const cls = PAY_CLASSES[info.payClass]

  return (
    <div className="hours-sec">
      <h4 className="section-title center">דיווח שעות עבודה</h4>
      <p className="hours-base">
        בסיס ליום זה: {cls.baseHours} שעות ({cls.label}) · מעבר לכך: שעתיים ב־125% ואז 150%
      </p>
      <div className="time-row">
        <label>
          משעה
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          עד שעה
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      {overnight && <p className="hint-line">המשמרת חוצה חצות (מסתיימת למחרת)</p>}
      {breakdown && (
        <div className="bd">
          <div className="bd-item">
            <span>סה״כ</span>
            <strong>{fmtHM(breakdown.total)}</strong>
          </div>
          <div className="bd-item">
            <span>100%</span>
            <strong>{fmtHM(breakdown.base)}</strong>
          </div>
          <div className="bd-item bd-125">
            <span>125%</span>
            <strong>{fmtHM(breakdown.ot125)}</strong>
          </div>
          <div className="bd-item bd-150">
            <span>150%</span>
            <strong>{fmtHM(breakdown.ot150)}</strong>
          </div>
        </div>
      )}
      <div className="modal-actions center">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !breakdown}
          onClick={() => onSave(start, end)}
        >
          <ClockIcon size={16} />
          {entry ? 'עדכון הדיווח' : 'שמירת הדיווח'}
        </button>
        {entry && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onDelete}>
            מחיקת הדיווח
          </button>
        )}
      </div>
    </div>
  )
}

export default function DayModal({
  dayKey,
  info,
  mark,
  entry,
  canVolunteer,
  canReport,
  busy,
  onPick,
  onClear,
  onSaveHours,
  onDeleteHours,
  onClose,
}) {
  const st = markState(mark)
  return (
    <Modal title={dayLabel(dayKey)} onClose={onClose}>
      {info.name && (
        <p className="holiday-line">
          ★ {info.name} · {PAY_CLASSES[info.payClass].label}
        </p>
      )}

      {canVolunteer && (
        <>
          {st && (
            <p className={`current-line st-text-${st.kind}`}>
              הסימון הנוכחי: <strong>{st.label}</strong>
            </p>
          )}
          <div className="bigbtns">
            <button
              type="button"
              className="bigbtn bigbtn-ok"
              disabled={busy || mark?.preference === 'want'}
              onClick={() => onPick('want')}
            >
              <CheckIcon size={20} />
              אני רוצה לעבוד
            </button>
            <button
              type="button"
              className="bigbtn bigbtn-no"
              disabled={busy || mark?.preference === 'dont_want'}
              onClick={() => onPick('dont_want')}
            >
              <XIcon size={20} />
              אני לא רוצה לעבוד
            </button>
          </div>
          <p className="hint-line">סימון ״רוצה לעבוד״ נשלח לאישור מנהל.</p>
          {mark && (
            <button type="button" className="link-btn" disabled={busy} onClick={onClear}>
              הסרת הסימון מהיום הזה
            </button>
          )}
        </>
      )}

      {!canVolunteer && st && (
        <p className={`current-line st-text-${st.kind}`}>
          הסימון שלך ליום זה: <strong>{st.label}</strong>
        </p>
      )}

      {canVolunteer && canReport && <hr className="divider" />}

      {canReport && (
        <HoursSection
          key={dayKey}
          info={info}
          entry={entry}
          busy={busy}
          onSave={onSaveHours}
          onDelete={onDeleteHours}
        />
      )}
    </Modal>
  )
}
