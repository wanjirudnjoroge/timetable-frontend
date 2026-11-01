import type { StreamCounts } from '../types'

interface Props {
  counts: StreamCounts[]
}

export default function CountsPanel({ counts }: Props) {
  const withIssues = counts.filter((c) => c.issues > 0).length
  return (
    <section className="panel no-print">
      <div className="panel-head">
        <h3>Lessons per week</h3>
        <span className={`badge ${withIssues === 0 ? 'ok' : 'over'}`}>
          {withIssues === 0 ? 'All classes match' : `${withIssues} class${withIssues === 1 ? '' : 'es'} need attention`}
        </span>
      </div>
      <p className="muted small">
        Each learning area must have exactly the required lessons in every class. Fewer or more is flagged.
      </p>
      {counts.length === 0 && <p className="muted">No classes yet.</p>}
      <div className="counts-grid">
        {counts.map((stream) => (
          <details key={stream.class_stream} className="count-card" open={stream.issues > 0}>
            <summary>
              <span>{stream.label}</span>
              <span className={`badge ${stream.issues === 0 ? 'ok' : 'over'}`}>
                {stream.issues === 0 ? 'OK' : `${stream.issues} issue${stream.issues === 1 ? '' : 's'}`}
              </span>
            </summary>
            {stream.rows.length === 0 ? (
              <p className="muted small">No requirements set. Add them in Setup.</p>
            ) : (
              <table className="mini-table">
                <tbody>
                  {stream.rows.map((row) => (
                    <tr key={row.learning_area}>
                      <td className="mono">{row.code}</td>
                      <td>
                        {row.assigned} of {row.required}
                      </td>
                      <td>
                        {row.status === 'ok' && <span className="badge ok">OK</span>}
                        {row.status === 'under' && (
                          <span className="badge under">{row.required - row.assigned} short</span>
                        )}
                        {row.status === 'over' && (
                          <span className="badge over">{row.assigned - row.required} too many</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </details>
        ))}
      </div>
    </section>
  )
}
