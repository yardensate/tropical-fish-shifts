import { useState } from 'react'
import { login, verifyPin, normalizePhone, errorMessage } from '../lib/api.js'
import { FISH_IMAGE_URL } from '../config.js'

export default function Login({ onLogin }) {
  const [step, setStep] = useState('details') // details | pin
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [remember, setRemember] = useState(true)
  const [pin, setPin] = useState('')
  const [candidate, setCandidate] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submitDetails(e) {
    e.preventDefault()
    setError('')
    if (!first.trim() || !last.trim()) return setError('נא למלא שם פרטי ושם משפחה')
    if (normalizePhone(phone).length < 9) return setError('נא להזין מספר טלפון תקין')
    setBusy(true)
    try {
      const res = await login({ first, last, phone })
      if (!res.ok) {
        setError(
          res.reason === 'not_found'
            ? 'מספר הטלפון לא נמצא במערכת. בקשו מהמנהל להוסיף אתכם.'
            : 'השם לא תואם למספר הטלפון. בדקו את הפרטים ונסו שוב.',
        )
        return
      }
      if (res.employee.is_manager) {
        setCandidate(res.employee)
        setPin('')
        setStep('pin')
      } else {
        onLogin(res.employee, remember)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function submitPin(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{4}$/.test(pin)) return setError('הקוד הוא 4 ספרות')
    setBusy(true)
    try {
      if (await verifyPin(candidate, pin)) onLogin(candidate, remember)
      else setError('קוד שגוי. נסו שוב.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hero">
      <div className="hero-brand">
        <img src={FISH_IMAGE_URL} alt="טרופיקל פיש" className="hero-fish" />
        <h1 className="hero-title">טרופיקל פיש</h1>
        <p className="hero-sub">מערכת משמרות סופ״ש · בריכות נוי, מזרקות ואקווריומים</p>
      </div>

      {step === 'details' && (
        <form className="authcard" onSubmit={submitDetails}>
          <h2 className="authcard-title">כניסה למערכת</h2>
          <div className="field">
            <label htmlFor="first">שם פרטי</label>
            <input
              id="first"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              autoComplete="given-name"
              placeholder="לדוגמה: דנה"
            />
          </div>
          <div className="field">
            <label htmlFor="last">שם משפחה</label>
            <input
              id="last"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              autoComplete="family-name"
              placeholder="לדוגמה: לוי"
            />
          </div>
          <div className="field">
            <label htmlFor="phone">מספר טלפון</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="050-0000000"
              className="input-center"
            />
          </div>
          <label className="check-row">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            זכור אותי במכשיר הזה
          </label>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'רק רגע…' : 'כניסה'}
          </button>
          <p className="authcard-note">עובדים חדשים? בקשו מהמנהל להוסיף אתכם למערכת.</p>
        </form>
      )}

      {step === 'pin' && (
        <form className="authcard" onSubmit={submitPin}>
          <h2 className="authcard-title">שלום {candidate.first_name}!</h2>
          <p className="authcard-note">הזינו קוד מנהל (4 ספרות)</p>
          <div className="field">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              dir="ltr"
              maxLength={4}
              className="pin-input"
              autoFocus
              aria-label="קוד מנהל"
              placeholder="••••"
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'רק רגע…' : 'אישור'}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setStep('details')
              setError('')
            }}
          >
            חזרה
          </button>
        </form>
      )}
    </div>
  )
}
