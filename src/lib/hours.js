// Pay-relevant day classification and hours math (company rules):
//   regular day (Sun-Thu)          - 9 base hours
//   Friday / holiday eve           - 7 base hours
//   Saturday / holiday (shabbaton) - 8 base hours
// Overtime beyond the base: first 2 hours at 125%, anything above at 150%.

export const PAY_CLASSES = {
  regular: { label: 'יום רגיל', baseHours: 9 },
  friday: { label: 'שישי / ערב חג', baseHours: 7 },
  saturday: { label: 'שבת / חג', baseHours: 8 },
}

const CLASS_RANK = { regular: 0, friday: 1, saturday: 2 }

export function weekdayPayClass(weekday) {
  if (weekday === 5) return 'friday'
  if (weekday === 6) return 'saturday'
  return 'regular'
}

// Effective info for a calendar day. A special day never downgrades the weekday
// (a holiday eve that falls on Saturday still pays like Saturday).
export function dayInfo(dateKey, weekday, specialByDate) {
  const special = (specialByDate && specialByDate[dateKey]) || null
  const wdClass = weekdayPayClass(weekday)
  const payClass =
    special && CLASS_RANK[special.pay_class] > CLASS_RANK[wdClass] ? special.pay_class : wdClass
  return {
    payClass,
    special,
    name: special ? special.name : null,
    volunteerable: weekday === 5 || weekday === 6 || Boolean(special),
  }
}

export function parseTimeToMin(t) {
  if (!/^\d{2}:\d{2}$/.test(t || '')) return null
  const [h, m] = t.split(':').map(Number)
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

export function minToTime(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

// Postgres `time` columns come back as HH:MM:SS.
export const trimTime = (t) => (t || '').slice(0, 5)

// Shift length; an end earlier than the start means the shift crossed midnight.
export function durationMin(startMin, endMin) {
  if (startMin == null || endMin == null) return null
  const d = endMin - startMin
  if (d === 0) return null
  return d > 0 ? d : d + 24 * 60
}

export function calcBreakdown(totalMin, payClass) {
  const baseMin = PAY_CLASSES[payClass].baseHours * 60
  return {
    total: totalMin,
    base: Math.min(totalMin, baseMin),
    ot125: Math.min(Math.max(totalMin - baseMin, 0), 120),
    ot150: Math.max(totalMin - baseMin - 120, 0),
  }
}

export function entryBreakdown(entry, payClass) {
  const total = durationMin(
    parseTimeToMin(trimTime(entry.start_time)),
    parseTimeToMin(trimTime(entry.end_time)),
  )
  return calcBreakdown(total ?? 0, payClass)
}

export function sumBreakdowns(items) {
  return items.reduce(
    (acc, b) => ({
      total: acc.total + b.total,
      base: acc.base + b.base,
      ot125: acc.ot125 + b.ot125,
      ot150: acc.ot150 + b.ot150,
    }),
    { total: 0, base: 0, ot125: 0, ot150: 0 },
  )
}

// 570 -> '9:30'
export function fmtHM(min) {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}
