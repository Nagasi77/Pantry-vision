import fs from 'fs'
import path from 'path'
import React from 'react'

type Detection = { [k: string]: any }

function normalizeLabel(it: Detection) {
  return (it.display_label ?? it.raw_label ?? 'Unknown') as string
}

function normalizeConfidence(v: any) {
  const n = Number(v)
  if (Number.isNaN(n)) return undefined
  if (n > 1 && n <= 100) return n // already percent
  return n * 100 // assume 0..1
}

export default function Page() {
  const dir = path.join(process.cwd(), 'hdfs_sync')
  let files: string[] = []
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  } catch (e) {
    files = []
  }

  const data = files.map((f) => {
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf8')
      const parsed = JSON.parse(content)
      return { file: f, items: Array.isArray(parsed) ? parsed : [parsed] }
    } catch (e) {
      return { file: f, items: [] }
    }
  })

  const flat: Detection[] = data.flatMap((d) => d.items)

  const total = flat.length
  const counts: Record<string, number> = {}
  let confSum = 0
  let confCount = 0

  flat.forEach((it) => {
    const label = normalizeLabel(it)
    counts[label] = (counts[label] || 0) + 1
    const c = normalizeConfidence(it.confidence)
    if (c !== undefined) {
      confSum += c
      confCount += 1
    }
  })

  const uniqueLabels = Object.keys(counts).length
  const topLabels = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const avgConfidence = confCount > 0 ? confSum / confCount : undefined

  const recent = flat
    .slice()
    .sort((a, b) => {
      const ta = a.timestamp ? Date.parse(String(a.timestamp)) : 0
      const tb = b.timestamp ? Date.parse(String(b.timestamp)) : 0
      return tb - ta
    })
    .slice(0, 10)

  // compute daily trend for the last 14 days
  const dateCounts: Record<string, { count: number; confSum: number; confCount: number }> = {}
  flat.forEach((it) => {
    const ta = it.timestamp ? Date.parse(String(it.timestamp)) : NaN
    if (!Number.isNaN(ta)) {
      const d = new Date(ta)
      const key = d.toISOString().slice(0, 10)
      const c = normalizeConfidence(it.confidence)
      if (!dateCounts[key]) dateCounts[key] = { count: 0, confSum: 0, confCount: 0 }
      dateCounts[key].count += 1
      if (c !== undefined) {
        dateCounts[key].confSum += c
        dateCounts[key].confCount += 1
      }
    }
  })

  const days = 14
  const today = new Date()
  const trend = Array.from({ length: days }).map((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    const key = d.toISOString().slice(0, 10)
    const entry = dateCounts[key] || { count: 0, confSum: 0, confCount: 0 }
    const avg = entry.confCount > 0 ? entry.confSum / entry.confCount : undefined
    return { date: key, count: entry.count, avgConfidence: avg }
  })
  return (
    <main style={{ padding: 20 }}>
      <h1>Hadoop Demo — Processed Summary</h1>
      <p>Data read from <code>hdfs_sync/</code>. Summary below is computed from synced detection JSON files.</p>

      <section style={{ marginBottom: 20 }}>
        <h2>Summary</h2>
        <ul>
          <li>Total detections: <strong>{total}</strong></li>
          <li>Unique labels: <strong>{uniqueLabels}</strong></li>
          <li>Top labels:
            <ul>
              {topLabels.map(([label, c]) => (
                <li key={label}>{label}: {c}</li>
              ))}
            </ul>
          </li>
          <li>Average confidence: <strong>{avgConfidence !== undefined ? avgConfidence.toFixed(1) + '%' : 'N/A'}</strong></li>
        </ul>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2>Recent items</h2>
        {recent.length === 0 ? <p>No recent items.</p> : (
          <ol>
            {recent.map((it, i) => (
              <li key={i}>
                <strong>{normalizeLabel(it)}</strong>
                {it.confidence !== undefined ? <span> — {normalizeConfidence(it.confidence)?.toFixed(1)}%</span> : null}
                {it.timestamp ? <span> @ {it.timestamp}</span> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2>Trends (last 14 days)</h2>
        {trend.length === 0 ? (
          <p>No trend data.</p>
        ) : (
          <ul style={{ fontFamily: 'monospace' }}>
            {(() => {
              const max = Math.max(...trend.map((t) => t.count), 1)
              return trend.map((t) => {
                const barLen = Math.round((t.count / max) * 20)
                const bar = '█'.repeat(barLen) + ' '.repeat(20 - barLen)
                return (
                  <li key={t.date} style={{ marginBottom: 6 }}>
                    <strong>{t.date}</strong> — {t.count} detections {t.avgConfidence !== undefined ? `— ${t.avgConfidence.toFixed(1)}%` : ''}
                    <div style={{ fontSize: 12 }}>{bar}</div>
                  </li>
                )
              })
            })()}
          </ul>
        )}
      </section>

      <section>
        <h2>All files</h2>
        {data.length === 0 ? (
          <p>No JSON files found in hdfs_sync/.</p>
        ) : (
          data.map((d) => (
            <section key={d.file} style={{ marginBottom: 12 }}>
              <h3>{d.file}</h3>
              {d.items.length === 0 ? (
                <p>Empty or invalid JSON.</p>
              ) : (
                <ul>
                  {d.items.map((it: Detection, idx: number) => (
                    <li key={idx}>
                      <strong>{normalizeLabel(it)}</strong>
                      {it.confidence !== undefined ? (
                        <span> — {normalizeConfidence(it.confidence)?.toFixed(1)}%</span>
                      ) : null}
                      {it.timestamp ? <span> @ {it.timestamp}</span> : null}
                      {it.image_path ? <div style={{ fontSize: 12 }}>{it.image_path}</div> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </section>
    </main>
  )
}
