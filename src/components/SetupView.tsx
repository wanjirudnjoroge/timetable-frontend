import { useState } from 'react'
import { api } from '../api'
import type { Area, Period, Teacher, Timetable } from '../types'
import { addMinutes } from '../utils'

interface Props {
  data: Timetable
  areas: Area[]
  teachers: Teacher[]
  onChanged: () => Promise<void>
}

type Tab = 'periods' | 'classes' | 'areas' | 'teachers' | 'requirements'

function useRunner(onChanged: () => Promise<void>) {
  const [error, setError] = useState('')
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    try {
      await action()
      setError('')
      await onChanged()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      return false
    }
  }
  return { error, run }
}

export default function SetupView({ data, areas, teachers, onChanged }: Props) {
  const [tab, setTab] = useState<Tab>('periods')
  const tabs: { id: Tab; label: string }[] = [
    { id: 'periods', label: 'Periods and breaks' },
    { id: 'classes', label: 'Classes' },
    { id: 'requirements', label: 'Lessons per week' },
    { id: 'areas', label: 'Learning areas' },
    { id: 'teachers', label: 'Teachers' },
  ]

  return (
    <div>
      <div className="view-head">
        <div>
          <p className="eyebrow">Setup / {data.section.name}</p>
          <h2 className="view-title">Configure this section</h2>
        </div>
      </div>
      <div className="subtabs">
        {tabs.map((item) => (
          <button key={item.id} className={`subtab${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'periods' && <PeriodsEditor data={data} onChanged={onChanged} />}
      {tab === 'classes' && <ClassesEditor data={data} onChanged={onChanged} />}
      {tab === 'requirements' && <RequirementsEditor data={data} areas={areas} onChanged={onChanged} />}
      {tab === 'areas' && <AreasEditor areas={areas} onChanged={onChanged} />}
      {tab === 'teachers' && <TeachersEditor teachers={teachers} onChanged={onChanged} />}
    </div>
  )
}

/* ------------------------------------------------------------ periods */

function PeriodsEditor({ data, onChanged }: { data: Timetable; onChanged: () => Promise<void> }) {
  const { error, run } = useRunner(onChanged)
  const last = data.periods[data.periods.length - 1]
  const [label, setLabel] = useState('')
  const [start, setStart] = useState(last ? last.end_time : '08:00')
  const [end, setEnd] = useState(last ? addMinutes(last.end_time, 40) : '08:40')
  const [isBreak, setIsBreak] = useState(false)

  async function add() {
    const ok = await run(() =>
      api.createPeriod({ section_id: data.section.id, label, start_time: start, end_time: end, is_break: isBreak }),
    )
    if (ok) {
      setLabel('')
      setStart(end)
      setEnd(addMinutes(end, 40))
      setIsBreak(false)
    }
  }

  return (
    <section className="panel">
      <h3>Periods and breaks</h3>
      <p className="muted small">
        Every section has its own times. Clash checks compare real clock times across all sections. Changing a time here
        can create clashes, which the counter at the top will show.
      </p>
      {error && <p className="error-box">{error}</p>}
      <table className="setup-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Start</th>
            <th>End</th>
            <th>Break</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.periods.map((period) => (
            <PeriodRow
              key={`${period.id}-${period.label}-${period.start_time}-${period.end_time}-${period.is_break}`}
              period={period}
              run={run}
            />
          ))}
          <tr className="add-row">
            <td>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="P9 or Break" />
            </td>
            <td>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </td>
            <td>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </td>
            <td>
              <input type="checkbox" checked={isBreak} onChange={(e) => setIsBreak(e.target.checked)} />
            </td>
            <td>
              <button className="btn primary" onClick={add} disabled={!label.trim()}>
                Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

function PeriodRow({ period, run }: { period: Period; run: (a: () => Promise<unknown>) => Promise<boolean> }) {
  const [label, setLabel] = useState(period.label)
  const [start, setStart] = useState(period.start_time)
  const [end, setEnd] = useState(period.end_time)
  const [isBreak, setIsBreak] = useState(period.is_break)
  const changed =
    label !== period.label || start !== period.start_time || end !== period.end_time || isBreak !== period.is_break

  return (
    <tr className={isBreak ? 'break-row' : ''}>
      <td>
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </td>
      <td>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
      </td>
      <td>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </td>
      <td>
        <input type="checkbox" checked={isBreak} onChange={(e) => setIsBreak(e.target.checked)} />
      </td>
      <td className="row-actions">
        <button
          className="btn"
          disabled={!changed}
          onClick={() =>
            run(() => api.updatePeriod(period.id, { label, start_time: start, end_time: end, is_break: isBreak }))
          }
        >
          Save
        </button>
        <button
          className="btn danger"
          onClick={() => {
            if (window.confirm(`Delete ${period.label}? Any lessons placed in it will be removed.`)) {
              void run(() => api.deletePeriod(period.id))
            }
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------ classes */

function ClassesEditor({ data, onChanged }: { data: Timetable; onChanged: () => Promise<void> }) {
  const { error, run } = useRunner(onChanged)
  const [grade, setGrade] = useState('')
  const [stream, setStream] = useState('')

  async function add() {
    const ok = await run(() => api.createStream({ section_id: data.section.id, grade: grade.trim(), stream: stream.trim() }))
    if (ok) setStream('')
  }

  return (
    <section className="panel">
      <h3>Classes</h3>
      {error && <p className="error-box">{error}</p>}
      <table className="setup-table">
        <thead>
          <tr>
            <th>Grade</th>
            <th>Stream</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.streams.map((item) => (
            <tr key={item.id}>
              <td>{item.grade}</td>
              <td>{item.stream || 'Single'}</td>
              <td className="row-actions">
                <button
                  className="btn danger"
                  onClick={() => {
                    if (window.confirm(`Delete ${item.label}? Its lessons will be removed.`)) {
                      void run(() => api.deleteStream(item.id))
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          <tr className="add-row">
            <td>
              <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade 7" />
            </td>
            <td>
              <input value={stream} onChange={(e) => setStream(e.target.value)} placeholder="East" />
            </td>
            <td>
              <button className="btn primary" onClick={add} disabled={!grade.trim()}>
                Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/* ------------------------------------------------- lessons per week */

function RequirementsEditor({
  data,
  areas,
  onChanged,
}: {
  data: Timetable
  areas: Area[]
  onChanged: () => Promise<void>
}) {
  const { error, run } = useRunner(onChanged)
  const required = new Map<string, number>()
  data.requirements.forEach((r) => required.set(`${r.class_stream}-${r.learning_area}`, r.lessons_per_week))
  const slotsPerWeek = data.periods.filter((p) => !p.is_break).length * 5

  return (
    <section className="panel">
      <h3>Lessons per week</h3>
      <p className="muted small">
        Set how many lessons each learning area needs per week in each class. Leave 0 for none. The timetable flags any
        class that has fewer or more. A class has {slotsPerWeek} lesson slots per week in this section.
      </p>
      {error && <p className="error-box">{error}</p>}
      <div className="grid-wrap">
        <table className="setup-table">
          <thead>
            <tr>
              <th>Class</th>
              {areas.map((area) => (
                <th key={area.id} className="mono">
                  {area.code}
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.streams.map((stream) => {
              const total = areas.reduce((sum, area) => sum + (required.get(`${stream.id}-${area.id}`) ?? 0), 0)
              return (
                <tr key={stream.id}>
                  <td>{stream.label}</td>
                  {areas.map((area) => (
                    <td key={area.id}>
                      <NumberCell
                        value={required.get(`${stream.id}-${area.id}`) ?? 0}
                        onCommit={(n) => run(() => api.setRequirement(stream.id, area.id, n))}
                      />
                    </td>
                  ))}
                  <td className={total > slotsPerWeek ? 'error-text' : ''}>{total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function NumberCell({ value, onCommit }: { value: number; onCommit: (n: number) => Promise<boolean> }) {
  const [text, setText] = useState(String(value))
  function commit() {
    const n = Math.max(0, Math.min(40, Math.floor(Number(text) || 0)))
    setText(String(n))
    if (n !== value) void onCommit(n)
  }
  return (
    <input
      className="num"
      type="number"
      min={0}
      max={40}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

/* ------------------------------------------------------ learning areas */

function AreasEditor({ areas, onChanged }: { areas: Area[]; onChanged: () => Promise<void> }) {
  const { error, run } = useRunner(onChanged)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  async function add() {
    const ok = await run(() => api.createArea({ code: code.trim().toUpperCase(), name: name.trim() }))
    if (ok) {
      setCode('')
      setName('')
    }
  }

  return (
    <section className="panel">
      <h3>Learning areas</h3>
      {error && <p className="error-box">{error}</p>}
      <table className="setup-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {areas.map((area) => (
            <tr key={area.id}>
              <td className="mono">{area.code}</td>
              <td>{area.name}</td>
              <td className="row-actions">
                <button
                  className="btn danger"
                  onClick={() => {
                    if (window.confirm(`Delete ${area.code}?`)) void run(() => api.deleteArea(area.id))
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          <tr className="add-row">
            <td>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH" />
            </td>
            <td>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics" />
            </td>
            <td>
              <button className="btn primary" onClick={add} disabled={!code.trim() || !name.trim()}>
                Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/* ------------------------------------------------------------ teachers */

function TeachersEditor({ teachers, onChanged }: { teachers: Teacher[]; onChanged: () => Promise<void> }) {
  const { error, run } = useRunner(onChanged)
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('Mr.')
  const [fullName, setFullName] = useState('')

  async function add() {
    const ok = await run(() => api.createTeacher({ code: code.trim().toUpperCase(), title, full_name: fullName.trim() }))
    if (ok) {
      setCode('')
      setFullName('')
    }
  }

  return (
    <section className="panel">
      <h3>Teachers</h3>
      <p className="muted small">Teachers are shared by every section, which is what lets the clash check work across them.</p>
      {error && <p className="error-box">{error}</p>}
      <table className="setup-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher) => (
            <tr key={teacher.id}>
              <td className="mono">{teacher.code}</td>
              <td>{teacher.display_name}</td>
              <td className="row-actions">
                <button
                  className="btn danger"
                  onClick={() => {
                    if (window.confirm(`Delete ${teacher.display_name}?`)) void run(() => api.deleteTeacher(teacher.id))
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          <tr className="add-row">
            <td>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="T-141" />
            </td>
            <td className="name-inputs">
              <select value={title} onChange={(e) => setTitle(e.target.value)}>
                <option>Mr.</option>
                <option>Mrs.</option>
                <option>Ms.</option>
                <option>Dr.</option>
              </select>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Kamau" />
            </td>
            <td>
              <button className="btn primary" onClick={add} disabled={!code.trim() || !fullName.trim()}>
                Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
