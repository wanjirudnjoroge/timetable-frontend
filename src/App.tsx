import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, clearToken, getToken } from './api'
import Header, { type View } from './components/Header'
import Login from './components/Login'
import SetupView from './components/SetupView'
import TeachersView from './components/TeachersView'
import TimetableView from './components/TimetableView'
import type { Bootstrap, Clashes, Timetable } from './types'

export default function App() {
  const [authed, setAuthed] = useState<boolean>(Boolean(getToken()))
  const [boot, setBoot] = useState<Bootstrap | null>(null)
  const [sectionId, setSectionId] = useState<number | null>(null)
  const [timetable, setTimetable] = useState<Timetable | null>(null)
  const [clashes, setClashes] = useState<Clashes | null>(null)
  const [view, setView] = useState<View>('timetable')
  const [error, setError] = useState('')

  useEffect(() => {
    const expire = () => setAuthed(false)
    window.addEventListener('tt-auth-expired', expire)
    return () => window.removeEventListener('tt-auth-expired', expire)
  }, [])

  const loadBoot = useCallback(async () => {
    const result = await api.bootstrap()
    setBoot(result)
    setSectionId((current) => current ?? result.sections[0]?.id ?? null)
  }, [])

  const loadClashes = useCallback(async () => {
    setClashes(await api.clashes())
  }, [])

  const loadTimetable = useCallback(async (id: number) => {
    setTimetable(await api.timetable(id))
  }, [])

  // Load shared data once after signing in.
  useEffect(() => {
    if (!authed) return
    Promise.all([loadBoot(), loadClashes()]).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'Could not load data.'),
    )
  }, [authed, loadBoot, loadClashes])

  // Load the timetable whenever the active section changes.
  useEffect(() => {
    if (!authed || sectionId === null) return
    loadTimetable(sectionId).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'Could not load the timetable.'),
    )
  }, [authed, sectionId, loadTimetable])

  // After any change, reload everything that could be affected. Changing a period
  // in one section can create clashes in another, so clashes are always reloaded.
  const refresh = useCallback(async () => {
    try {
      await Promise.all([
        loadBoot(),
        loadClashes(),
        sectionId !== null ? loadTimetable(sectionId) : Promise.resolve(),
      ])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh.')
    }
  }, [loadBoot, loadClashes, loadTimetable, sectionId])

  const clashIds = useMemo(() => new Set(clashes?.lesson_ids ?? []), [clashes])

  function goToClashes() {
    const first = clashes?.by_section[0]
    if (first) {
      setSectionId(first.section_id)
      setView('timetable')
    }
  }

  function logout() {
    clearToken()
    setAuthed(false)
    setBoot(null)
    setTimetable(null)
    setClashes(null)
    setSectionId(null)
  }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  const currentTimetable = timetable && timetable.section.id === sectionId ? timetable : null

  return (
    <div className="app">
      <Header
        sections={boot?.sections ?? []}
        activeSectionId={sectionId}
        onSection={setSectionId}
        view={view}
        onView={setView}
        clashes={clashes}
        onClashClick={goToClashes}
        onLogout={logout}
      />
      <main className="app-main">
        {error && <p className="error-box">{error}</p>}
        {boot && boot.sections.length === 0 && (
          <p className="panel muted">No sections found. Run the seed_sections command on the backend.</p>
        )}
        {view === 'teachers' && boot && <TeachersView teachers={boot.teachers} />}
        {view !== 'teachers' && !currentTimetable && boot && boot.sections.length > 0 && (
          <p className="muted">Loading...</p>
        )}
        {view === 'timetable' && currentTimetable && boot && (
          <TimetableView
            key={currentTimetable.section.id}
            data={currentTimetable}
            areas={boot.areas}
            teachers={boot.teachers}
            clashIds={clashIds}
            onChanged={refresh}
          />
        )}
        {view === 'setup' && currentTimetable && boot && (
          <SetupView
            key={currentTimetable.section.id}
            data={currentTimetable}
            areas={boot.areas}
            teachers={boot.teachers}
            onChanged={refresh}
          />
        )}
      </main>
    </div>
  )
}
