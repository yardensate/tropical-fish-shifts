import { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { PlusIcon } from './icons.jsx'
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  formatPhone,
  normalizePhone,
  errorMessage,
} from '../lib/api.js'
import { useLoad } from '../lib/useLoad.js'
import { useRefresh } from '../lib/refresh.js'
import { useToast } from './Toast.jsx'

function EmployeeForm({ initial, managersCount, isSelf, onSave, onClose }) {
  const editing = Boolean(initial)
  const wasManager = Boolean(initial?.is_manager)
  const [first, setFirst] = useState(initial?.first_name || '')
  const [last, setLast] = useState(initial?.last_name || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [isManager, setIsManager] = useState(wasManager)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!first.trim() || !last.trim()) return setError('נא למלא שם פרטי ושם משפחה')
    if (normalizePhone(phone).length < 9) return setError('נא להזין מספר טלפון תקין')
    if (isManager && !wasManager && !/^\d{4}$/.test(pin)) return setError('למנהל נדרש קוד בן 4 ספרות')
    if (isManager && pin && !/^\d{4}$/.test(pin)) return setError('הקוד חייב להיות בדיוק 4 ספרות')
    if (editing && wasManager && !isManager && managersCount <= 1) {
      return setError('חייב להישאר לפחות מנהל אחד במערכת')
    }
    setBusy(true)
    try {
      await onSave({ firstName: first, lastName: last, phone, isManager, pin: pin || null })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={editing ? 'עריכת עובד' : 'הוספת עובד'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="e-first">שם פרטי</label>
          <input id="e-first" value={first} onChange={(e) => setFirst(e.target.value)} autoFocus={!editing} />
        </div>
        <div className="field">
          <label htmlFor="e-last">שם משפחה</label>
          <input id="e-last" value={last} onChange={(e) => setLast(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e-phone">מספר טלפון</label>
          <input
            id="e-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            dir="ltr"
            placeholder="050-0000000"
            className="input-center"
          />
        </div>
        <label className={`check-row ${isSelf ? 'is-disabled' : ''}`}>
          <input
            type="checkbox"
            checked={isManager}
            disabled={isSelf}
            onChange={(e) => setIsManager(e.target.checked)}
          />
          מנהל (יכול לאשר בקשות ולנהל עובדים)
        </label>
        {isSelf && <p className="hint-line">לא ניתן לשנות הרשאות לעצמך.</p>}
        {isManager && (
          <div className="field">
            <label htmlFor="e-pin">
              {wasManager ? 'קוד מנהל חדש (השאירו ריק כדי לא לשנות)' : 'קוד מנהל (4 ספרות)'}
            </label>
            <input
              id="e-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              dir="ltr"
              maxLength={4}
              className="pin-input"
              placeholder="••••"
            />
          </div>
        )}
        {error && <p className="field-error">{error}</p>}
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'שומר…' : 'שמירה'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            ביטול
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Manage the team: add, edit, promote to manager, remove.
export default function PeopleTab({ user }) {
  const { tick, bump } = useRefresh()
  const toast = useToast()
  const { data: employees, loading } = useLoad(() => listEmployees(), [tick])
  const managersCount = useMemo(
    () => (employees || []).filter((e) => e.is_manager).length,
    [employees],
  )

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  async function saveNew(values) {
    await createEmployee(values)
    toast('העובד נוסף בהצלחה')
    setAdding(false)
    bump()
  }

  async function saveEdit(values) {
    await updateEmployee(editing.id, values)
    toast('הפרטים נשמרו')
    setEditing(null)
    bump()
  }

  async function doDelete() {
    setBusy(true)
    try {
      await deleteEmployee(deleting.id)
      toast('העובד הוסר מהמערכת')
      setDeleting(null)
      bump()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  function askDelete(employee) {
    if (employee.is_manager && managersCount <= 1) {
      toast('אי אפשר למחוק את המנהל האחרון במערכת', 'error')
      return
    }
    setDeleting(employee)
  }

  return (
    <main className="container">
      <div className="pagehead pagehead-row">
        <div>
          <h1 className="pagehead-title">עובדים</h1>
          <p className="pagehead-sub">{employees ? `${employees.length} עובדים במערכת` : ''}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          <PlusIcon size={16} /> הוספת עובד
        </button>
      </div>

      {loading && !employees && <p className="muted-center">טוען נתונים…</p>}

      <div className="list">
        {(employees || []).map((employee) => (
          <div className="row" key={employee.id}>
            <span className="avatar">
              {employee.first_name?.[0]}
              {employee.last_name?.[0]}
            </span>
            <div className="row-main">
              <span className="row-name">
                {employee.first_name} {employee.last_name}
                {employee.is_manager && <span className="role-tag">מנהל</span>}
                {employee.id === user.id && <span className="role-tag role-me">אני</span>}
              </span>
              <span className="row-sub" dir="ltr">{formatPhone(employee.phone)}</span>
            </div>
            <div className="row-actions">
              <button type="button" className="pillbtn pillbtn-ghost" onClick={() => setEditing(employee)}>
                עריכה
              </button>
              {employee.id !== user.id && (
                <button type="button" className="pillbtn pillbtn-danger" onClick={() => askDelete(employee)}>
                  מחיקה
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <EmployeeForm managersCount={managersCount} isSelf={false} onSave={saveNew} onClose={() => setAdding(false)} />
      )}
      {editing && (
        <EmployeeForm
          initial={editing}
          managersCount={managersCount}
          isSelf={editing.id === user.id}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <Modal title="הסרת עובד" onClose={() => setDeleting(null)}>
          <p>
            להסיר את <strong>{deleting.first_name} {deleting.last_name}</strong> מהמערכת?
            כל הסימונים שלו יימחקו.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-danger" disabled={busy} onClick={doDelete}>
              {busy ? 'מוחק…' : 'הסרה'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
              ביטול
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}
