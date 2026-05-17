import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';

const SUPABASE_REST_URL = 'https://ccjnxndjojxrwhzrnbca.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjam54bmRqb2p4cndoenJuYmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjg4MzQsImV4cCI6MjA5NDYwNDgzNH0.fzo725XxL4JmLVds01tJB4yhSuaEjaxNmpynhOrShxw';
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

function fmtDate(d) {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function status(v) { return v < 70 ? 'Low' : v > 180 ? 'High' : 'In range'; }
function Tile({ label, value, sub, tone = '' }) { return <article className={`tile ${tone}`}><p>{label}</p><strong>{value}</strong><span>{sub}</span></article>; }

function D3Chart({ data }) {
  const width = 760, height = 320, margin = { top: 30, right: 28, bottom: 42, left: 34 };
  const values = data.length ? data : fallback;
  const labels = values.map((d, i) => fmtDate(d.date) || String(i + 1));
  const x = d3.scalePoint().domain(labels).range([margin.left, width - margin.right]);
  const minY = Math.min(60, (d3.min(values, d => Number(d.value)) || 70) - 10);
  const maxY = Math.max(190, (d3.max(values, d => Number(d.value)) || 180) + 10);
  const y = d3.scaleLinear().domain([minY, maxY]).nice().range([height - margin.bottom, margin.top]);
  const line = d3.line().defined(d => Number.isFinite(Number(d.value))).x((d, i) => x(labels[i])).y(d => y(Number(d.value))).curve(d3.curveCatmullRom.alpha(.5));
  const area = d3.area().defined(d => Number.isFinite(Number(d.value))).x((d, i) => x(labels[i])).y0(height - margin.bottom).y1(d => y(Number(d.value))).curve(d3.curveCatmullRom.alpha(.5));
  return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Blood glucose chart"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#86efac" stopOpacity=".45"/><stop offset="100%" stopColor="#ffffff" stopOpacity="0"/></linearGradient><linearGradient id="line" x1="0" x2="1"><stop offset="0%" stopColor="#0f766e"/><stop offset="100%" stopColor="#22c55e"/></linearGradient><filter id="blur"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#16a34a" floodOpacity=".18"/></filter></defs><rect x="24" y={y(180)} width="712" height={Math.max(0, y(70) - y(180))} rx="24" fill="#dcfce7" opacity=".55"/>{y.ticks(4).map(t => <line key={t} x1="24" x2="736" y1={y(t)} y2={y(t)} stroke="#dbe7e3"/>)}<path d={area(values)} fill="url(#area)"/><path d={line(values)} fill="none" stroke="url(#line)" strokeWidth="8" strokeLinecap="round" filter="url(#blur)"/>{values.map((d, i) => <g key={`${d.date}-${i}`}><circle cx={x(labels[i])} cy={y(Number(d.value))} r="8" fill="#fff" stroke={status(Number(d.value)) === 'High' ? '#ef4444' : status(Number(d.value)) === 'Low' ? '#f59e0b' : '#0f766e'} strokeWidth="4"/><text className="days" x={x(labels[i])} y={height - 12} textAnchor="middle">{labels[i]}</text></g>)}<text className="chart-label" x="34" y={Math.max(18, y(180) - 8)}>180 max</text><text className="chart-label" x="34" y={Math.min(height - 48, y(70) + 18)}>70 min</text></svg></div>;
}

export default function App() {
  const [rows, setRows] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ date: today, value: '', notes: '' });

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${SUPABASE_REST_URL}/${TABLE}?select=date,value,notes&order=date.asc`, { headers });
      if (!res.ok) throw new Error('Could not load Supabase readings. Check that the readings table exists and RLS policies allow anon select.');
      const data = await res.json();
      const parsed = data.map(r => ({ date: r.date, value: Number(r.value), notes: r.notes || '' })).filter(r => r.date && Number.isFinite(r.value));
      setRows(parsed.length ? parsed : []);
    } catch (e) {
      setError(e.message);
      setRows(fallback);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const avg = Math.round(d3.mean(rows, d => Number(d.value)) || 0);
    const inRange = rows.filter(d => d.value >= 70 && d.value <= 180).length;
    const highs = rows.filter(d => d.value > 180).length;
    const lows = rows.filter(d => d.value < 70).length;
    const latest = rows[rows.length - 1] || fallback.at(-1);
    return { avg, inRange: Math.round((inRange / rows.length) * 100) || 0, highs, lows, latest };
  }, [rows]);

  function scrollToLog() { document.getElementById('log-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function scrollToInsights() { document.getElementById('insights')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function updateForm(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    const value = Number(form.value);
    if (!form.date || !Number.isFinite(value)) { setError('Please select a date and enter a valid glucose value.'); setSaving(false); return; }
    try {
      const res = await fetch(`${SUPABASE_REST_URL}/${TABLE}`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ date: form.date, value, notes: form.notes || '' }),
      });
      if (!res.ok) throw new Error('Could not save reading. Check Supabase insert policy for anon users.');
      setForm({ date: today, value: '', notes: '' });
      setSuccess('Reading saved successfully.');
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return <main className="app"><section className="hero"><div><div className="badge">Supabase connected • PWA</div><h1>GlucoTrack</h1><p>Track blood sugar, save logs to Supabase, and keep your target range visible in a friendly bento dashboard.</p><div className="hero-actions"><button className="cta primary" onClick={scrollToLog}>+ Add reading</button><button className="cta secondary" onClick={scrollToInsights}>View insights</button><button className="cta tertiary" onClick={load}>{loading ? 'Syncing...' : 'Refresh'}</button></div></div><aside><span>Current</span><strong>{stats.latest.value}</strong><small>mg/dL • {status(stats.latest.value)}</small></aside></section>{error && <div className="notice error">{error}</div>}{success && <div className="notice success">{success}</div>}<section className="tiles"><Tile label="Average" value={stats.avg} sub="mg/dL saved logs"/><Tile label="In range" value={`${stats.inRange}%`} sub={`${rows.length} readings loaded`} tone="green"/><Tile label="Lows" value={stats.lows} sub="Below 70 mg/dL" tone="amber"/><Tile label="Highs" value={stats.highs} sub="Above 180 mg/dL" tone="rose"/></section><section className="grid" id="insights"><article className="panel graph-panel"><div className="head"><div><p>Trend</p><h2>Glucose over time</h2></div><span>Target 70-180 mg/dL</span></div><D3Chart data={rows}/></article><article className="panel form" id="log-form"><p>Quick log</p><h2>Add reading</h2><form onSubmit={submit}><label>Date</label><input type="date" name="date" value={form.date} onChange={updateForm}/><label>Blood sugar</label><input name="value" inputMode="numeric" placeholder="105 mg/dL" value={form.value} onChange={updateForm}/><label>Note</label><input name="notes" placeholder="Before breakfast" value={form.notes} onChange={updateForm}/><div className="form-actions"><button className="add-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : '+ Add reading'}</button></div></form><small>Saved directly to your Supabase readings table.</small></article><article className="panel settings"><p>Settings</p><h2>Recommended range</h2><div className="range"><span>Min <b>70</b></span><span>Max <b>180</b></span></div><small>General guidance only. Ask your clinician for personal targets.</small></article><article className="panel history"><div className="head"><div><p>History</p><h2>Recent readings</h2></div><button className="refresh-chip" onClick={load}>{loading ? 'Syncing...' : 'Refresh'}</button></div>{rows.slice().reverse().slice(0, 8).map((r, i) => <div className="reading" key={`${r.date}-${i}`}><div><b>{fmtDate(r.date)}</b><small>{r.notes || 'No note'}</small></div><strong>{r.value}</strong><span className={status(r.value) === 'High' ? 'high' : status(r.value) === 'Low' ? 'low' : ''}>{status(r.value)}</span></div>)}</article></section></main>;
}
