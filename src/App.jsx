import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  SUPABASE_REST_URL,
  SUPABASE_ANON_KEY
} from './config';
import GlucoseChart from './components/GlucoseChart';

const TABLE = 'readings';

const fallback = [
  { date: '2026-05-11', value: 94, notes: 'Fasting' },
  { date: '2026-05-12', value: 116, notes: 'Before breakfast' },
  { date: '2026-05-13', value: 142, notes: 'After lunch' },
  { date: '2026-05-14', value: 108, notes: 'Fasting' },
  { date: '2026-05-15', value: 168, notes: 'After lunch' },
  { date: '2026-05-16', value: 126, notes: 'After walk' },
  { date: '2026-05-17', value: 103, notes: 'Before breakfast' },
];

const today = new Date().toISOString().slice(0, 10);

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function status(v) {
  return v < 70 ? 'Low' : v > 140 ? 'High' : 'In range';
}

function Tile({ label, value, sub, tone = '' }) {
  return (
    <article className={`tile ${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{sub}</span>
    </article>
  );
}

export default function App() {
  const [rows, setRows] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    date: today,
    value: '',
    notes: '',
  });

  async function load() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `${SUPABASE_REST_URL}/${TABLE}?select=date,value,notes&order=date.asc`,
        { headers }
      );

      if (!res.ok) {
        throw new Error('Could not load readings.');
      }

      const data = await res.json();

      const parsed = data
        .map(r => ({
          date: r.date,
          value: Number(r.value),
          notes: r.notes || '',
        }))
        .filter(r => r.date && Number.isFinite(r.value));

      setRows(parsed.length ? parsed : fallback);
    } catch (e) {
      setError(e.message);
      setRows(fallback);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const avg = Math.round(
      d3.mean(rows, d => Number(d.value)) || 0
    );

    const inRange = rows.filter(
      d => d.value >= 70 && d.value <= 140
    ).length;

    const highs = rows.filter(
      d => d.value > 140
    ).length;

    const lows = rows.filter(
      d => d.value < 70
    ).length;

    const latest = rows[rows.length - 1] || fallback.at(-1);

    return {
      avg,
      inRange: Math.round((inRange / rows.length) * 100) || 0,
      highs,
      lows,
      latest,
    };
  }, [rows]);

  function scrollToLog() {
    document
      .getElementById('log-form')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  function scrollToInsights() {
    document
      .getElementById('insights')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  function updateForm(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function submit(e) {
    e.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    const value = Number(form.value);

    if (!form.date || !Number.isFinite(value)) {
      setError('Please enter a valid reading.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(
        `${SUPABASE_REST_URL}/${TABLE}`,
        {
          method: 'POST',
          headers: {
            ...headers,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            date: form.date,
            value,
            notes: form.notes || '',
          }),
        }
      );

      if (!res.ok) {
        throw new Error('Could not save reading.');
      }

      setForm({
        date: today,
        value: '',
        notes: '',
      });

      setSuccess('Reading saved successfully.');

      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <div className="badge">Beta</div>
          <h1>GlucoTrack</h1>
          <p>
            Track blood sugar and visualize trends beautifully.
          </p>

          <div className="hero-actions">
            <button
              className="cta primary"
              onClick={scrollToLog}
            >
              Add reading
            </button>

            <button
              className="cta secondary"
              onClick={scrollToInsights}
            >
              View insights
            </button>

            <button
              className="cta tertiary"
              onClick={load}
            >
              {loading ? 'Syncing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <aside>
          <span>Current</span>
          <strong>{stats.latest.value}</strong>
          <small>
            mg/dL • {status(stats.latest.value)}
          </small>
        </aside>
      </section>

      {error && (
        <div className="notice error">{error}</div>
      )}

      {success && (
        <div className="notice success">{success}</div>
      )}

      <section className="tiles">
        <Tile label="Average" value={stats.avg} sub="mg/dL" />

        <Tile
          label="In range"
          value={`${stats.inRange}%`}
          sub={`${rows.length} readings`}
          tone="green"
        />

        <Tile
          label="Lows"
          value={stats.lows}
          sub="Below 70"
          tone="amber"
        />

        <Tile
          label="Highs"
          value={stats.highs}
          sub="Above 140"
          tone="rose"
        />
      </section>

      <section className="grid" id="insights">
        <article className="panel graph-panel">
          <div className="head">
            <div>
              <p>Trend</p>
              <h2>Glucose over time</h2>
            </div>

            <span>Target 70-140 mg/dL</span>
          </div>

          <GlucoseChart readings={rows} />
        </article>

        <article className="panel form" id="log-form">
          <p>Quick log</p>
          <h2>Add reading</h2>

          <form onSubmit={submit}>
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={updateForm}
            />

            <label>Blood sugar</label>
            <input
              name="value"
              inputMode="numeric"
              placeholder="105 mg/dL"
              value={form.value}
              onChange={updateForm}
            />

            <label>Note</label>
            <input
              name="notes"
              placeholder="Before breakfast"
              value={form.notes}
              onChange={updateForm}
            />

            <div className="form-actions">
              <button
                className="add-btn"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Add reading'}
              </button>
            </div>
          </form>
        </article>

        <article className="panel history">
          <div className="head">
            <div>
              <p>History</p>
              <h2>Recent readings</h2>
            </div>
          </div>

          {rows
            .slice()
            .reverse()
            .slice(0, 8)
            .map((r, i) => (
              <div
                className="reading"
                key={`${r.date}-${i}`}
              >
                <div>
                  <b>{formatDate(r.date)}</b>
                  {' '}<small>{r.notes || 'No note'}</small>
                </div>

                <strong>{r.value}</strong>

                <span
                  className={
                    status(r.value) === 'High'
                      ? 'high'
                      : status(r.value) === 'Low'
                      ? 'low'
                      : ''
                  }
                >
                  {status(r.value)}
                </span>
              </div>
            ))}
        </article>
      </section>
    </main>
  );
}
