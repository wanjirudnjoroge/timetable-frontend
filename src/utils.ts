export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function dayName(day: number): string {
  return DAY_NAMES[day - 1] ?? ''
}

/** Accepts "T-106", "t106" or "106" and returns "T-106". Mirrors the backend. */
export function normaliseCode(raw: string): string {
  let code = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (/^\d+$/.test(code)) code = `T-${code}`
  else if (/^T\d+$/.test(code)) code = `T-${code.slice(1)}`
  return code
}

/** Adds minutes to an "HH:MM" string, staying within the same day. */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes)
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}
