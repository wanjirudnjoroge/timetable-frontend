import type { Clashes, Section } from '../types'

export type View = 'timetable' | 'teachers' | 'setup'

interface Props {
  sections: Section[]
  activeSectionId: number | null
  onSection: (id: number) => void
  view: View
  onView: (view: View) => void
  clashes: Clashes | null
  onClashClick: () => void
  onLogout: () => void
}

export default function Header({
  sections,
  activeSectionId,
  onSection,
  view,
  onView,
  clashes,
  onClashClick,
  onLogout,
}: Props) {
  const count = clashes?.count ?? 0
  return (
    <header className="app-header no-print">
      <div className="header-top">
        <h1 className="brand">Master Timetable</h1>
        <div className="header-right">
          <button
            className={`counter ${count > 0 ? 'bad' : 'good'}`}
            onClick={onClashClick}
            disabled={count === 0}
            title={count > 0 ? 'Go to the section with clashes' : 'No clashes'}
          >
            <span className="counter-number">{count}</span>
            <span className="counter-label">{count === 0 ? 'No collisions' : count === 1 ? 'Clash' : 'Clashes'}</span>
          </button>
          <span className="lesson-total">{clashes?.total_lessons ?? 0} lessons</span>
          <button className="link-btn" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>

      <div className="header-bottom">
        <nav className="section-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`section-tab${section.id === activeSectionId ? ' active' : ''}`}
              onClick={() => {
                onSection(section.id)
                if (view === 'teachers') onView('timetable')
              }}
            >
              {section.name}
            </button>
          ))}
        </nav>
        <nav className="view-tabs">
          {(['timetable', 'teachers', 'setup'] as View[]).map((item) => (
            <button
              key={item}
              className={`view-tab${view === item ? ' active' : ''}`}
              onClick={() => onView(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
