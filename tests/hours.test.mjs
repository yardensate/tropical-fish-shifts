import test from 'node:test'
import assert from 'node:assert/strict'
import {
  weekdayPayClass,
  dayInfo,
  parseTimeToMin,
  minToTime,
  trimTime,
  durationMin,
  calcBreakdown,
  entryBreakdown,
  sumBreakdowns,
  fmtHM,
  toHM,
  fmtElapsed,
  PAY_CLASSES,
} from '../src/lib/hours.js'

test('weekday classification', () => {
  assert.equal(weekdayPayClass(0), 'regular') // Sunday
  assert.equal(weekdayPayClass(4), 'regular') // Thursday
  assert.equal(weekdayPayClass(5), 'friday')
  assert.equal(weekdayPayClass(6), 'saturday')
})

test('base hours per class match the spec', () => {
  assert.equal(PAY_CLASSES.regular.baseHours, 9)
  assert.equal(PAY_CLASSES.friday.baseHours, 7)
  assert.equal(PAY_CLASSES.saturday.baseHours, 8)
})

test('dayInfo: plain days', () => {
  const tue = dayInfo('2026-07-14', 2, {})
  assert.equal(tue.payClass, 'regular')
  assert.equal(tue.volunteerable, false)
  const fri = dayInfo('2026-07-10', 5, {})
  assert.equal(fri.payClass, 'friday')
  assert.equal(fri.volunteerable, true)
})

test('dayInfo: holiday on a weekday becomes volunteerable with its class', () => {
  const specials = { '2026-09-21': { name: 'יום כיפור', pay_class: 'saturday' } }
  const info = dayInfo('2026-09-21', 1, specials) // Monday
  assert.equal(info.payClass, 'saturday')
  assert.equal(info.volunteerable, true)
  assert.equal(info.name, 'יום כיפור')
})

test('dayInfo: a special day never downgrades the weekday class', () => {
  // eve-classed special that falls on Saturday keeps Saturday pay
  const specials = { '2026-09-12': { name: 'ערב כלשהו', pay_class: 'friday' } }
  assert.equal(dayInfo('2026-09-12', 6, specials).payClass, 'saturday')
  // custom 'regular' volunteer day on a Tuesday stays regular but volunteerable
  const custom = { '2026-07-14': { name: 'יום התנדבות', pay_class: 'regular' } }
  const info = dayInfo('2026-07-14', 2, custom)
  assert.equal(info.payClass, 'regular')
  assert.equal(info.volunteerable, true)
})

test('time parsing and formatting', () => {
  assert.equal(parseTimeToMin('08:00'), 480)
  assert.equal(parseTimeToMin('23:59'), 1439)
  assert.equal(parseTimeToMin('24:00'), null)
  assert.equal(parseTimeToMin('8:00'), null)
  assert.equal(parseTimeToMin(''), null)
  assert.equal(minToTime(480), '08:00')
  assert.equal(trimTime('08:30:00'), '08:30')
  assert.equal(fmtHM(0), '0:00')
  assert.equal(fmtHM(90), '1:30')
  assert.equal(fmtHM(600), '10:00')
})

test('durationMin: normal, overnight, invalid', () => {
  assert.equal(durationMin(480, 1080), 600) // 08:00-18:00 = 10h
  assert.equal(durationMin(1320, 360), 480) // 22:00-06:00 overnight = 8h
  assert.equal(durationMin(480, 480), null)
  assert.equal(durationMin(null, 480), null)
})

test('calcBreakdown: regular day (9h base)', () => {
  assert.deepEqual(calcBreakdown(9 * 60, 'regular'), { total: 540, base: 540, ot125: 0, ot150: 0 })
  assert.deepEqual(calcBreakdown(10 * 60, 'regular'), { total: 600, base: 540, ot125: 60, ot150: 0 })
  assert.deepEqual(calcBreakdown(12 * 60, 'regular'), { total: 720, base: 540, ot125: 120, ot150: 60 })
  assert.deepEqual(calcBreakdown(5 * 60, 'regular'), { total: 300, base: 300, ot125: 0, ot150: 0 })
})

test('calcBreakdown: friday/eve (7h base)', () => {
  assert.deepEqual(calcBreakdown(8 * 60, 'friday'), { total: 480, base: 420, ot125: 60, ot150: 0 })
  assert.deepEqual(calcBreakdown(11 * 60, 'friday'), { total: 660, base: 420, ot125: 120, ot150: 120 })
})

test('calcBreakdown: saturday/shabbaton (8h base)', () => {
  assert.deepEqual(calcBreakdown(8 * 60, 'saturday'), { total: 480, base: 480, ot125: 0, ot150: 0 })
  assert.deepEqual(calcBreakdown(11 * 60, 'saturday'), { total: 660, base: 480, ot125: 120, ot150: 60 })
})

test('entryBreakdown reads DB time strings', () => {
  const entry = { start_time: '08:00:00', end_time: '18:00:00' } // 10h
  assert.deepEqual(entryBreakdown(entry, 'regular'), { total: 600, base: 540, ot125: 60, ot150: 0 })
})

test('toHM formats a local Date as HH:MM', () => {
  assert.equal(toHM(new Date(2026, 6, 13, 8, 3)), '08:03')
  assert.equal(toHM(new Date(2026, 6, 13, 23, 59)), '23:59')
  assert.equal(toHM(new Date(2026, 6, 13, 0, 0)), '00:00')
})

test('fmtElapsed formats a running duration', () => {
  assert.equal(fmtElapsed(0), '0:00:00')
  assert.equal(fmtElapsed(61000), '0:01:01')
  assert.equal(fmtElapsed(3661000), '1:01:01')
  assert.equal(fmtElapsed(10 * 3600 * 1000 + 5000), '10:00:05')
  assert.equal(fmtElapsed(-500), '0:00:00')
})

test('sumBreakdowns aggregates', () => {
  const sum = sumBreakdowns([
    calcBreakdown(600, 'regular'), // 540/60/0
    calcBreakdown(660, 'saturday'), // 480/120/60
  ])
  assert.deepEqual(sum, { total: 1260, base: 1020, ot125: 180, ot150: 60 })
})
