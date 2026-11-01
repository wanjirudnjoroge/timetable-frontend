import { useEffect, useState } from 'react'
import { api, ApiError } from '../api'
import type { Area, BusyInfo, CountRow, Lesson, Period, Stream, Teacher } from '../types'
import { dayName } from '../utils'

export interface LessonTarget {
  stream: Stream
  day: number
  period: Period
  lesson?: Lesson
}

interface Props {
  target: LessonTarget
  areas: Area[]
  teachers: Teacher[]
  countRows: CountRow[]
  onClose: () => void
  onSaved: () => Promise<void>
}

export default function LessonModal({ target, areas, teachers, countRows, onClose, onSaved }: Props) {
  const { stream, day, period, lesson } = target
  const [areaId, setAreaId] = useState<number | ''>(lesson?.learning_area ?? '')
  const [teacherId, setTeacherId] = useState<number | ''>(lesson?.teacher ?? '')
  const [busy, setBusy] = useState<Record<string, BusyInfo>>({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .availability(stream.id, day, period.id)
      .then((result) => {
        if (!cancelled) {
          setBusy(result.busy)
          setLoaded(true)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setServerError(err instanceof Error ? err.message : 'Could not load availability.')
      })
    return () => {
      cancelled = true
    }
  }, [stream.id, day, period.id])

  const busyInfo = teacherId === '' ? undefined : busy[String(teacherId)]
  const canSave = areaId !== '' && teacherId !== '' && !busyInfo && loaded && !saving
  const countRow = areaId === '' ? undefined : countRows.find((row) => row.learning_area === areaId)
  const selectedArea = areas.find((a) => a.id === areaId)

  async function save() {
    if (areaId === '' || teacherId === '') return
    setSaving(true)
    setServerError('')
    try {
      await api.saveLesson({
        class_stream: stream.id,
        day,
        period: period.id,
        learning_area: areaId,
        teacher: teacherId,
      })
      await onSaved()
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!lesson) return
    setSaving(true)
    try {
      await api.deleteLesson(lesson.id)
      await onSaved()
      onClose()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not delete.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <p className="eyebrow">
          {stream.label} / {dayName(day)} / {period.label} ({period.start_time}-{period.end_time})
        </p>
        <h2>{lesson ? 'Edit lesson' : 'Assign lesson'}</h2>

        <label>
          Learning area
          <select value={areaId} onChange={(e) => setAreaId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Choose a learning area</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.code}  {area.name}
              </option>
            ))}
          </select>
        </label>
        {selectedArea && countRow && (
          <p className="muted small">
            {selectedArea.code} currently has {countRow.assigned} of {countRow.required} required lessons this week.
          </p>
        )}
        {selectedArea && !countRow && (
          <p className="muted small">No weekly requirement is set for {selectedArea.code} in this class.</p>
        )}

        <label>
          Teacher
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={!loaded}
          >
            <option value="">{loaded ? 'Choose a teacher' : 'Checking who is free...'}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.code}  {teacher.display_name}
                {busy[String(teacher.id)] ? '  (busy)' : ''}
              </option>
            ))}
          </select>
        </label>

        {busyInfo && <p className="error-box">{busyInfo.text} Pick another teacher to save.</p>}
        {serverError && <p className="error-box">{serverError}</p>}

        <div className="modal-actions">
          {lesson && (
            <button className="btn danger" onClick={remove} disabled={saving}>
              Clear cell
            </button>
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={!canSave}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
