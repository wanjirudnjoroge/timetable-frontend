import type {
  Area,
  Bootstrap,
  BusyInfo,
  Clashes,
  Lesson,
  LessonPayload,
  Period,
  PeriodPayload,
  Stream,
  Teacher,
  TeacherLookup,
  Timetable,
} from './types'

const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000').replace(/\/$/, '')
const TOKEN_KEY = 'tt_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/login/') {
      clearToken()
      window.dispatchEvent(new Event('tt-auth-expired'))
    }
    const message = (data as { error?: string } | null)?.error ?? `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return data as T
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; username: string }>('/login/', 'POST', { username, password }),
  bootstrap: () => request<Bootstrap>('/bootstrap/'),
  timetable: (sectionId: number) => request<Timetable>(`/sections/${sectionId}/timetable/`),
  clashes: () => request<Clashes>('/clashes/'),
  availability: (stream: number, day: number, period: number) =>
    request<{ busy: Record<string, BusyInfo> }>(`/availability/?stream=${stream}&day=${day}&period=${period}`),
  saveLesson: (payload: LessonPayload) => request<Lesson>('/lessons/', 'POST', payload),
  deleteLesson: (id: number) => request<{ ok: boolean }>(`/lessons/${id}/`, 'DELETE'),
  lookup: (code: string) => request<TeacherLookup>(`/teachers/lookup/?code=${encodeURIComponent(code)}`),

  createPeriod: (payload: PeriodPayload) => request<Period>('/periods/', 'POST', payload),
  updatePeriod: (id: number, payload: PeriodPayload) => request<Period>(`/periods/${id}/`, 'PATCH', payload),
  deletePeriod: (id: number) => request<{ ok: boolean }>(`/periods/${id}/`, 'DELETE'),

  createStream: (payload: { section_id: number; grade: string; stream: string }) =>
    request<Stream>('/streams/', 'POST', payload),
  deleteStream: (id: number) => request<{ ok: boolean }>(`/streams/${id}/`, 'DELETE'),

  createArea: (payload: { code: string; name: string }) => request<Area>('/areas/', 'POST', payload),
  deleteArea: (id: number) => request<{ ok: boolean }>(`/areas/${id}/`, 'DELETE'),

  createTeacher: (payload: { code: string; title: string; full_name: string }) =>
    request<Teacher>('/teachers/', 'POST', payload),
  deleteTeacher: (id: number) => request<{ ok: boolean }>(`/teachers/${id}/`, 'DELETE'),

  setRequirement: (class_stream: number, learning_area: number, lessons_per_week: number) =>
    request<{ ok: boolean }>('/requirements/', 'PUT', { class_stream, learning_area, lessons_per_week }),
}

/** PDF links are plain anchors, so the login token travels in the query string. */
export function exportUrl(
  kind: 'section' | 'stream' | 'teacher',
  key: string | number,
  params: Record<string, string> = {},
): string {
  const query = new URLSearchParams({ ...params, token: getToken() ?? '' })
  return `${BASE}/api/export/${kind}/${encodeURIComponent(String(key))}/?${query.toString()}`
}
