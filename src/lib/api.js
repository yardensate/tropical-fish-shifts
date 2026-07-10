import { supabase } from './supabaseClient.js'

export const normalizePhone = (s) => (s || '').replace(/\D/g, '')
export const normalizeName = (s) => (s || '').trim().replace(/\s+/g, ' ')

export function formatPhone(phone) {
  const p = normalizePhone(phone)
  return p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3)}` : p
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Manager PINs are stored hashed, never as plain text.
const pinHash = (pin) => sha256Hex(`tropical-fish:${pin}`)

export function errorMessage(e) {
  if (e?.code === '23505') return 'מספר הטלפון הזה כבר קיים במערכת'
  if (String(e?.message || '').toLowerCase().includes('fetch')) {
    return 'שגיאת תקשורת — בדקו את החיבור לאינטרנט ונסו שוב'
  }
  return 'משהו השתבש. נסו שוב.'
}

// ---------- employees ----------

export async function countEmployees() {
  const { count, error } = await supabase
    .from('fish_employees')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function getEmployee(id) {
  const { data, error } = await supabase.from('fish_employees').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function findByPhone(phone) {
  const { data, error } = await supabase
    .from('fish_employees')
    .select('*')
    .eq('phone', normalizePhone(phone))
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listEmployees() {
  const { data, error } = await supabase
    .from('fish_employees')
    .select('*')
    .order('is_manager', { ascending: false })
    .order('first_name')
  if (error) throw error
  return data
}

export async function createEmployee({ firstName, lastName, phone, isManager = false, pin = null }) {
  const row = {
    first_name: normalizeName(firstName),
    last_name: normalizeName(lastName),
    phone: normalizePhone(phone),
    is_manager: isManager,
    pin_hash: isManager && pin ? await pinHash(pin) : null,
  }
  const { data, error } = await supabase.from('fish_employees').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateEmployee(id, { firstName, lastName, phone, isManager, pin }) {
  const patch = {
    first_name: normalizeName(firstName),
    last_name: normalizeName(lastName),
    phone: normalizePhone(phone),
    is_manager: isManager,
  }
  if (!isManager) patch.pin_hash = null
  else if (pin) patch.pin_hash = await pinHash(pin)
  const { data, error } = await supabase.from('fish_employees').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteEmployee(id) {
  const { error } = await supabase.from('fish_employees').delete().eq('id', id)
  if (error) throw error
}

// ---------- login ----------

export async function login({ first, last, phone }) {
  const employee = await findByPhone(phone)
  if (!employee) return { ok: false, reason: 'not_found' }
  const nameMatches =
    employee.first_name === normalizeName(first) && employee.last_name === normalizeName(last)
  if (!nameMatches) return { ok: false, reason: 'name_mismatch' }
  return { ok: true, employee }
}

export async function verifyPin(employee, pin) {
  return (await pinHash(pin)) === employee.pin_hash
}

// ---------- shift marks ----------

export async function getMarksForEmployee(employeeId, from, to) {
  const { data, error } = await supabase
    .from('fish_shift_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('shift_date', from)
    .lte('shift_date', to)
  if (error) throw error
  return data
}

// Two FKs point at fish_employees, so the join must name the constraint explicitly.
const EMPLOYEE_JOIN = 'employee:fish_employees!fish_shift_requests_employee_id_fkey(id, first_name, last_name)'

export async function getMarksForRange(from, to) {
  const { data, error } = await supabase
    .from('fish_shift_requests')
    .select(`*, ${EMPLOYEE_JOIN}`)
    .gte('shift_date', from)
    .lte('shift_date', to)
    .order('shift_date')
  if (error) throw error
  return data
}

export async function getPendingRequests() {
  const { data, error } = await supabase
    .from('fish_shift_requests')
    .select(`*, ${EMPLOYEE_JOIN}`)
    .eq('status', 'pending')
    .eq('preference', 'want')
    .order('shift_date')
  if (error) throw error
  return data
}

// Marking "want" opens a request for manager approval; "dont_want" is informational only.
export async function setMark(employeeId, shiftDate, preference) {
  const row = {
    employee_id: employeeId,
    shift_date: shiftDate,
    preference,
    status: preference === 'want' ? 'pending' : 'noted',
    decided_by: null,
    decided_at: null,
  }
  const { error } = await supabase
    .from('fish_shift_requests')
    .upsert(row, { onConflict: 'employee_id,shift_date' })
  if (error) throw error
}

export async function clearMark(employeeId, shiftDate) {
  const { error } = await supabase
    .from('fish_shift_requests')
    .delete()
    .eq('employee_id', employeeId)
    .eq('shift_date', shiftDate)
  if (error) throw error
}

export async function decideRequest(requestId, status, managerId) {
  const { error } = await supabase
    .from('fish_shift_requests')
    .update({ status, decided_by: managerId, decided_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}
