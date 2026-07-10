import test from 'node:test'
import assert from 'node:assert/strict'
import {
  monthGrid,
  dateKey,
  parseKey,
  isWeekendDay,
  monthRangeKeys,
  addMonths,
  compareYM,
  isPastKey,
} from '../src/lib/dates.js'

test('dateKey pads and uses local time', () => {
  assert.equal(dateKey(new Date(2026, 6, 1)), '2026-07-01')
  assert.equal(dateKey(new Date(2026, 0, 9)), '2026-01-09')
})

test('monthGrid covers full weeks starting Sunday', () => {
  for (const [y, m] of [[2026, 6], [2026, 7], [2026, 1], [2024, 1], [2026, 11]]) {
    const grid = monthGrid(y, m)
    assert.equal(grid.length % 7, 0)
    assert.equal(grid[0].date.getDay(), 0)
    assert.equal(grid.at(-1).date.getDay(), 6)
    const inMonth = grid.filter((c) => c.inMonth)
    assert.equal(inMonth.length, new Date(y, m + 1, 0).getDate())
    assert.equal(inMonth[0].date.getDate(), 1)
  }
})

test('February 2026 fits exactly 4 weeks', () => {
  assert.equal(monthGrid(2026, 1).length, 28)
})

test('August 2026 needs 6 weeks', () => {
  assert.equal(monthGrid(2026, 7).length, 42)
})

test('weekend detection: Friday and Saturday only', () => {
  assert.ok(isWeekendDay(5))
  assert.ok(isWeekendDay(6))
  for (const d of [0, 1, 2, 3, 4]) assert.ok(!isWeekendDay(d))
  assert.equal(new Date(2026, 6, 10).getDay(), 5) // known Friday
})

test('monthRangeKeys spans the whole month', () => {
  assert.deepEqual(monthRangeKeys(2026, 6), { from: '2026-07-01', to: '2026-07-31' })
  assert.deepEqual(monthRangeKeys(2026, 1), { from: '2026-02-01', to: '2026-02-28' })
})

test('addMonths rolls over years', () => {
  assert.deepEqual(addMonths({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 })
  assert.deepEqual(addMonths({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 })
})

test('compareYM orders months', () => {
  assert.ok(compareYM({ year: 2026, month: 6 }, { year: 2026, month: 7 }) < 0)
  assert.ok(compareYM({ year: 2027, month: 0 }, { year: 2026, month: 11 }) > 0)
  assert.equal(compareYM({ year: 2026, month: 6 }, { year: 2026, month: 6 }), 0)
})

test('parseKey round-trips with dateKey', () => {
  assert.equal(dateKey(parseKey('2026-07-10')), '2026-07-10')
})

test('isPastKey compares against today, today itself is not past', () => {
  assert.equal(isPastKey('1999-01-01'), true)
  assert.equal(isPastKey('2999-01-01'), false)
  assert.equal(isPastKey(dateKey(new Date())), false)
})
