import { monthGrid, WEEKDAYS_HE, isWeekendDay, todayKey, monthLabel, compareYM, addMonths } from '../lib/dates.js'
import { ChevronLeftIcon, ChevronRightIcon } from './icons.jsx'

// In RTL time flows right-to-left: previous month = chevron pointing right, next = left.
export function MonthNav({ ym, onChange, min, max }) {
  const prevDisabled = min && compareYM(ym, min) <= 0
  const nextDisabled = max && compareYM(ym, max) >= 0
  return (
    <div className="monthnav">
      <button
        type="button"
        className="navbtn"
        onClick={() => onChange(addMonths(ym, -1))}
        disabled={prevDisabled}
        aria-label="החודש הקודם"
      >
        <ChevronRightIcon />
      </button>
      <h2 className="monthnav-title">{monthLabel(ym.year, ym.month)}</h2>
      <button
        type="button"
        className="navbtn"
        onClick={() => onChange(addMonths(ym, 1))}
        disabled={nextDisabled}
        aria-label="החודש הבא"
      >
        <ChevronLeftIcon />
      </button>
    </div>
  )
}

// Delegates every in-month cell to the caller; Fri-Sat get the wide columns.
export default function CalendarGrid({ year, month, renderDay }) {
  const cells = monthGrid(year, month)
  const tKey = todayKey()
  return (
    <div className="cal">
      <div className="cal-head">
        {WEEKDAYS_HE.map((name, i) => (
          <div key={name} className={`cal-headcell ${isWeekendDay(i) ? 'is-weekend' : ''}`}>
            {name}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((cell) => {
          if (!cell.inMonth) {
            return <div key={cell.key} className="cal-cell is-out" />
          }
          return renderDay(cell, cell.key === tKey)
        })}
      </div>
    </div>
  )
}
