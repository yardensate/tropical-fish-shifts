// Pure date helpers for a Sunday-first Hebrew calendar.
// Date keys are local-timezone 'YYYY-MM-DD' strings — never toISOString(), which shifts by the UTC offset.

export const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const pad2 = (n) => String(n).padStart(2, '0')

export function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayKey() {
  return dateKey(new Date())
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Full Sunday..Saturday weeks covering the given month (month is 0-based).
export function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7)
  const cells = []
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(year, month, 1 - first.getDay() + i)
    cells.push({ date: d, key: dateKey(d), inMonth: d.getMonth() === month, weekday: d.getDay() })
  }
  return cells
}

export const isWeekendDay = (weekday) => weekday === 5 || weekday === 6

export function monthLabel(year, month) {
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))
}

export function dayLabel(key) {
  const d = parseKey(key)
  const monthName = new Intl.DateTimeFormat('he-IL', { month: 'long' }).format(d)
  return `יום ${WEEKDAYS_HE[d.getDay()]}, ${d.getDate()} ב${monthName}`
}

export function currentMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function addMonths(ym, n) {
  const d = new Date(ym.year, ym.month + n, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function compareYM(a, b) {
  return a.year * 12 + a.month - (b.year * 12 + b.month)
}

export function monthRangeKeys(year, month) {
  return { from: dateKey(new Date(year, month, 1)), to: dateKey(new Date(year, month + 1, 0)) }
}

export function isPastKey(key) {
  return key < todayKey()
}
