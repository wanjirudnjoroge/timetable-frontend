import { useMemo, useState, type KeyboardEvent } from 'react'
import { exportUrl } from '../api'
import type { Area, Lesson, Period, Stream, Teacher, Timetable } from '../types'
import { DAY_NAMES } from '../utils'
import CountsPanel from './CountsPanel'
import LessonModal, { type LessonTarget } from './LessonModal'

interface Props {
  data: Timetable
  areas: Area[]
  teachers: Teacher[]
  clashIds: Set<number>
  onChanged: () => Promise<void>
}

interface Row {
  day: number
  stream: Stream
  dayFirst: boolean
  gradeFirst: boolean
  gradeSpan: number
}

export default function TimetableView({ data, areas, teachers, clashIds, onChanged }: Props) {
  const [day, setDay] = useState(0) // 0 means the full week
  const [classId, setClassId] = useState(0) // 0 means every class
  const [target, setTarget] = useState<LessonTarget | null>(null)

  const lessonMap = useMemo(() => {
    const map = new Map<string, Lesson>()
    data.lessons.forEach((lesson) => map.set(`${lesson.class_stream}-${lesson.day}-${lesson.period}`, lesson))
    return map
  }, [data.lessons])

  const streams = classId ? data.streams.filter((s) => s.id === classId) : data.streams
  const days = day ? [day] : [1, 2, 3, 4, 5]

  const rows: Row[] = []
  days.forEach((d) => {
    streams.forEach((stream, index) => {
      const gradeFirst = index === 0 || streams[index - 1].grade !== stream.grade
      let gradeSpan = 0
      if (gradeFirst) {
        for (let j = index; j < streams.length && streams[j].grade === stream.grade; j++) gradeSpan++
      }
      rows.push({ day: d, stream, dayFirst: index === 0, gradeFirst, gradeSpan })
    })
  })

  const pdfUrl = classId
    ? exportUrl('stream', classId)
    : exportUrl('section', data.section.id, day ? { day: String(day) } : {})

  function renderCell(stream: Stream, d: number, period: Period) {
    if (period.is_break) {
      return (
        <td key={period.id} className="break-cell">
          {period.label}
        </td>
      )
    }
    const lesson = lessonMap.get(`${stream.id}-${d}-${period.id}`)
    const open = () => setTarget({ stream, day: d, period, lesson })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') open()
    }
    if (!lesson) {
      return (
        <td key={period.id} className="cell empty" onClick={open} onKeyDown={onKey} tabIndex={0} role="button">
          +
        </td>
      )
    }
    const clash = clashIds.has(lesson.id)
    return (
      <td
        key={period.id}
        className={`cell filled${clash ? ' clash' : ''}`}
        onClick={open}
        onKeyDown={onKey}
        tabIndex={0}
        role="button"
        title={clash ? 'This teacher is double booked at this time' : undefined}
      >
        <span className="area">{lesson.area_code}</span>
        <span className="tcode">{lesson.teacher_code}</span>
      </td>
    )
  }

  const ready = data.periods.length > 0 && data.streams.length > 0
  const countRows = target ? (data.counts.find((c) => c.class_stream === target.stream.id)?.rows ?? []) : []

  return (
    <div>
      <div className="view-head">
        <div>
          <p className="eyebrow">{data.section.name} / weekly schedule</p>
          <h2 className="view-title">Day-by-day timetable</h2>
        </div>
        <div className="actions no-print">
          <button className="btn" onClick={() => window.print()}>
            Print
          </button>
          <a className="btn primary" href={pdfUrl} target="_blank" rel="noreferrer">
            Download PDF
          </a>
        </div>
      </div>

      <div className="filters no-print">
        <label>
          Day
          <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
            <option value={0}>Full week</option>
            {DAY_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Class
          <select value={classId} onChange={(e) => setClassId(Number(e.target.value))}>
            <option value={0}>All grades and streams</option>
            {data.streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.label}
              </option>
            ))}
          </select>
        </label>
        <span className="muted small">
          {days.length} day{days.length === 1 ? '' : 's'} / {streams.length} class{streams.length === 1 ? '' : 'es'}
        </span>
        <span className="muted small">PDF: {classId ? 'this class' : day ? 'this day for the section' : 'whole section'}</span>
      </div>

      {!ready ? (
        <p className="panel muted">
          This section needs periods and classes first. Open the Setup tab to add them.
        </p>
      ) : (
        <div className="grid-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Day</th>
                <th>Grade</th>
                <th>Stream</th>
                {data.periods.map((period) => (
                  <th key={period.id} className={period.is_break ? 'break-head' : ''}>
                    <div>{period.label}</div>
                    <div className="time">
                      {period.start_time}-{period.end_time}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.day}-${row.stream.id}`} className={row.dayFirst ? 'day-start' : ''}>
                  {row.dayFirst && (
                    <td className="day-cell" rowSpan={streams.length}>
                      <strong>{DAY_NAMES[row.day - 1]}</strong>
                    </td>
                  )}
                  {row.gradeFirst && (
                    <td className="grade-cell" rowSpan={row.gradeSpan}>
                      <strong>{row.stream.grade}</strong>
                    </td>
                  )}
                  <td className="stream-cell">{row.stream.stream || 'Single'}</td>
                  {data.periods.map((period) => renderCell(row.stream, row.day, period))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small no-print">
        Each cell shows the learning area code above the teacher code. Select a cell to edit it. A red cell means the
        teacher is double booked.
      </p>

      <CountsPanel counts={data.counts} />

      {target && (
        <LessonModal
          target={target}
          areas={areas}
          teachers={teachers}
          countRows={countRows}
          onClose={() => setTarget(null)}
          onSaved={onChanged}
        />
      )}
    </div>
  )
}
