import { useEffect, useState } from 'react'
import { api, exportUrl } from '../api'
import type { Teacher, TeacherLookup } from '../types'
import { DAY_NAMES, normaliseCode } from '../utils'

interface Props {
  teachers: Teacher[]
}

export default function TeachersView({ teachers }: Props) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<TeacherLookup | null>(null)
  const [error, setError] = useState('')

  async function search(value: string) {
    if (!value.trim()) return
    try {
      setResult(await api.lookup(value))
      setError('')
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Lookup failed.')
    }
  }

  // As soon as the typed text matches a known teacher code, load that teacher.
  useEffect(() => {
    const normalised = normaliseCode(code)
    if (teachers.some((t) => t.code === normalised)) {
      void search(normalised)
    } else {
      setResult(null)
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, teachers])

  const perDay = (day: number) => (result ? result.lessons.filter((l) => l.day === day) : [])
  const maxRows = Math.max(1, ...[1, 2, 3, 4, 5].map((d) => perDay(d).length))

  return (
    <div>
      <div className="view-head">
        <div>
          <p className="eyebrow">Teacher lookup</p>
          <h2 className="view-title">Weekly schedule across every class</h2>
        </div>
        {result && (
          <div className="actions no-print">
            <button className="btn" onClick={() => window.print()}>
              Print
            </button>
            <a className="btn primary" href={exportUrl('teacher', result.teacher.code)} target="_blank" rel="noreferrer">
              Download PDF
            </a>
          </div>
        )}
      </div>

      <div className="filters no-print">
        <label>
          Teacher code
          <input
            list="teacher-codes"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void search(code)
            }}
            placeholder="T-106"
          />
          <datalist id="teacher-codes">
            {teachers.map((t) => (
              <option key={t.id} value={t.code}>
                {t.display_name}
              </option>
            ))}
          </datalist>
        </label>
        <button className="btn" onClick={() => void search(code)}>
          Look up
        </button>
      </div>

      {error && <p className="error-box">{error}</p>}

      {result && (
        <section className="panel">
          <h3 className="teacher-name">
            <span className="mono">{result.teacher.code}</span> {result.teacher.display_name}
          </h3>
          <p className="muted small">{result.total} lesson{result.total === 1 ? '' : 's'} per week</p>
          <div className="grid-wrap">
            <table className="grid teacher-grid">
              <thead>
                <tr>
                  {DAY_NAMES.map((name) => (
                    <th key={name}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {[1, 2, 3, 4, 5].map((day) => {
                      const item = perDay(day)[rowIndex]
                      return (
                        <td key={day} className={item ? 'teacher-cell' : 'teacher-cell none'}>
                          {item && (
                            <>
                              <div className="mono small">
                                {item.start_time}-{item.end_time}
                              </div>
                              <div>
                                <strong>{item.area_code}</strong> {item.class_label}
                              </div>
                              <div className="muted small">{item.section}</div>
                            </>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {!result && !error && <p className="muted">Type a teacher code such as T-106 to see the full name and schedule.</p>}
    </div>
  )
}
