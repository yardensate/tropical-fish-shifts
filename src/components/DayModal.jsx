import Modal from './Modal.jsx'
import { dayLabel } from '../lib/dates.js'
import { markState } from '../lib/status.js'
import { CheckIcon, XIcon } from './icons.jsx'

export default function DayModal({ dayKey, mark, busy, onPick, onClear, onClose }) {
  const st = markState(mark)
  return (
    <Modal title={dayLabel(dayKey)} onClose={onClose}>
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
    </Modal>
  )
}
