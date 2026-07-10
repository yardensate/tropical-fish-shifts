import { useState } from 'react'
import { createEmployee, normalizePhone, errorMessage } from '../lib/api.js'
import { FISH_IMAGE_URL } from '../config.js'

// First run: no employees exist yet, so whoever opens the app creates the first manager.
export default function Setup({ onDone }) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!first.trim() || !last.trim()) return setError('נא למלא שם פרטי ושם משפחה')
    if (normalizePhone(phone).length < 9) return setError('נא להזין מספר טלפון תקין')
    if (!/^\d{4}$/.test(pin)) return setError('קוד המנהל חייב להיות 4 ספרות')
    if (pin !== pin2) return setError('הקודים לא זהים')
    setBusy(true)
    try {
      const employee = await createEmployee({
        firstName: first,
        lastName: last,
        phone,
        isManager: true,
        pin,
      })
      onDone(employee)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="hero">
      <div className="hero-brand">
        <img src={FISH_IMAGE_URL} alt="Tropical Fish" className="hero-fish" />
        <h1 className="hero-title">Tropical Fish</h1>
        <p className="hero-sub">מערכת משמרות סופ״ש · בריכות דגים ומים</p>
      </div>
      <form className="authcard" onSubmit={submit}>
        <h2 className="authcard-title">הגדרה ראשונית</h2>
        <p className="authcard-note">ברוכים הבאים! ניצור עכשיו את חשבון המנהל הראשון של המערכת.</p>
        <div className="field">
          <label htmlFor="s-first">שם פרטי</label>
          <input id="s-first" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
        </div>
        <div className="field">
          <label htmlFor="s-last">שם משפחה</label>
          <input id="s-last" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
        </div>
        <div className="field">
          <label htmlFor="s-phone">מספר טלפון</label>
          <input
            id="s-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            dir="ltr"
            placeholder="050-0000000"
            className="input-center"
          />
        </div>
        <div className="field">
          <label htmlFor="s-pin">קוד מנהל (4 ספרות)</label>
          <input
            id="s-pin"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            dir="ltr"
            maxLength={4}
            className="pin-input"
          />
        </div>
        <div className="field">
          <label htmlFor="s-pin2">אימות קוד</label>
          <input
            id="s-pin2"
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            dir="ltr"
            maxLength={4}
            className="pin-input"
          />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'יוצר חשבון…' : 'יצירת חשבון מנהל'}
        </button>
      </form>
    </div>
  )
}
