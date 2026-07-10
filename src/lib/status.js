// Maps a shift mark row to what the UI shows.
export function markState(mark) {
  if (!mark) return null
  if (mark.preference === 'dont_want') return { kind: 'dont', label: 'לא רוצה' }
  if (mark.status === 'approved') return { kind: 'approved', label: 'מאושר' }
  if (mark.status === 'rejected') return { kind: 'rejected', label: 'לא אושר' }
  return { kind: 'pending', label: 'ממתין לאישור' }
}
