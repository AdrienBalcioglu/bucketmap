import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import citiesDatabase from './citiesDatabase'
import { getLockoutRemaining } from './lib/auth'
import { fetchPlaces, addPlace, fetchCheckedItems, setCheckedItem, fetchDestinations, addDestination, deleteDestination, reorderPlace, deletePlace, updatePlace, fetchProfile, saveProfile } from './lib/db'
import { getUserId } from './lib/userId'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

/* ── Themes ── */
const THEMES = {
  aurora:   { name: 'Aurora',    emoji: '🌌', bg: '#04000e', land: '#100028', landBorder: '#d430f0',  panel: '#0a0018', panelBorder: '#e040fb44', panelHeader: '#0e0022', primary: '#f050ff', primaryDim: '#f050ff55', secondary: '#c040f0', soft: '#ffb3f5', text: '#ffe8ff', muted: '#c890e8', mutedDim: '#9060b8', accent: '#ff00ee' },
  ocean:    { name: 'Ocean',     emoji: '🌊', bg: '#00111e', land: '#00203a', landBorder: '#1a8fcc',  panel: '#001828', panelBorder: '#1a8fcc44', panelHeader: '#001020', primary: '#22c4f0', primaryDim: '#22c4f055', secondary: '#0090cc', soft: '#b3e8ff', text: '#e0f4ff', muted: '#80c4e0', mutedDim: '#4090b0', accent: '#00aaff' },
  rose:     { name: 'Rose Gold', emoji: '🌹', bg: '#1a0a0a', land: '#2d1010', landBorder: '#d46060',  panel: '#220c0c', panelBorder: '#d4606044', panelHeader: '#180808', primary: '#f07080', primaryDim: '#f0708055', secondary: '#d04060', soft: '#ffb3c0', text: '#ffe8ec', muted: '#d090a0', mutedDim: '#a06070', accent: '#ff4060' },
  forest:   { name: 'Forest',    emoji: '🌿', bg: '#030e06', land: '#091a0e', landBorder: '#3aad5a',  panel: '#061208', panelBorder: '#3aad5a44', panelHeader: '#040e06', primary: '#50d070', primaryDim: '#50d07055', secondary: '#30a050', soft: '#b3ffcc', text: '#e0ffe8', muted: '#80c090', mutedDim: '#508060', accent: '#00cc44' },
  golden:   { name: 'Golden',    emoji: '✨', bg: '#0e0a00', land: '#1e1600', landBorder: '#c09020',  panel: '#160e00', panelBorder: '#c0902044', panelHeader: '#100c00', primary: '#e0b040', primaryDim: '#e0b04055', secondary: '#b08020', soft: '#fff0b3', text: '#fff8e0', muted: '#c0a060', mutedDim: '#907040', accent: '#ffa000' },
  midnight: { name: 'Midnight',  emoji: '🌙', bg: '#070710', land: '#10102a', landBorder: '#5050cc',  panel: '#0a0a1e', panelBorder: '#5050cc44', panelHeader: '#080816', primary: '#8080ff', primaryDim: '#8080ff55', secondary: '#6060cc', soft: '#c0c0ff', text: '#e8e8ff', muted: '#9090cc', mutedDim: '#606099', accent: '#6666ff' },
}

function themeOf(key) { return THEMES[key] || THEMES.aurora }

/* ── PIN helpers (no module, inline for simplicity) ── */
let _attempts = 0, _lockoutUntil = null
function verifyPin(code, storedPin) {
  const now = Date.now()
  if (_lockoutUntil && now < _lockoutUntil) return 'locked'
  if (!storedPin || code === storedPin) { _attempts = 0; _lockoutUntil = null; return 'ok' }
  _attempts++
  if (_attempts >= 5) { _lockoutUntil = now + 30000; return 'locked' }
  return 'invalid'
}
function getLockout() {
  if (!_lockoutUntil) return 0
  const r = Math.ceil((_lockoutUntil - Date.now()) / 1000)
  return r > 0 ? r : 0
}

function itemKeyDynamic(placeId) { return `bucketmap-${placeId}` }

/* ── Icons ── */
function HeartIcon({ filled, color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5C16 11 9 15.5 9 15.5z"
        fill={filled ? color : 'none'} stroke={filled ? color : color + '55'}
        strokeWidth="1.5" strokeLinejoin="round" style={{ transition: 'all 0.2s' }} />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 4h10M5 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M11 4v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4" stroke="#ff4d6a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="5.5" y1="6.5" x2="5.5" y2="10.5" stroke="#ff4d6a" strokeWidth="1" strokeLinecap="round"/>
      <line x1="8.5" y1="6.5" x2="8.5" y2="10.5" stroke="#ff4d6a" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}
function BackIcon({ color }) {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M10 3L5 8l5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function EditIcon({ color }) {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}><path d="M9.5 1.5l2 2-7 7H2.5v-2l7-7z" stroke={color + '88'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function GripIcon({ color }) {
  return (
    <svg width="12" height="18" viewBox="0 0 12 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      {[3,9,15].map(cy => [4,8].map(cx => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="1.2" fill={color + '55'} />))}
    </svg>
  )
}
function GearIcon({ color }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke={color} strokeWidth="1.4"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M3.22 14.78l1.42-1.42M13.36 4.64l1.42-1.42" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></svg>
}
function LogoutIcon({ color }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 3H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4M12 13l4-4-4-4M16 9H7" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function CloseIcon({ color }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke={color} strokeWidth="1.6" strokeLinecap="round"/></svg>
}
function CopyIcon({ color }) {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="4" y="4" width="9" height="9" rx="1.5" stroke={color} strokeWidth="1.2"/><path d="M3 10V3a1 1 0 0 1 1-1h7" stroke={color} strokeWidth="1.2" strokeLinecap="round"/></svg>
}

/* ── Progress bar ── */
function ProgressBar({ done, total, C }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: C.mutedDim, fontStyle: 'italic' }}>
          {done === 0 ? 'adventures ahead ♡' : done === total ? 'all done! 🎉' : `${done} of ${total} visited`}
        </span>
        <span style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 3, background: '#ffffff12', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

/* ── Place item ── */
function PlaceItem({ place, checked, onToggle, onDelete, onEdit, isDragging, isDragOver, C }) {
  const [showDelConfirm, setShowDelConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(place.name)
  const [editDesc, setEditDesc] = useState(place.description || '')

  const inputStyle = { width: '100%', background: '#ffffff10', border: `1px solid ${C.primaryDim}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', fontFamily: 'inherit' }

  if (editing) {
    return (
      <div style={{ borderBottom: '1px solid #ffffff0a', padding: '12px 16px', background: '#ffffff04' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ paddingTop: 2 }}><GripIcon color={C.primary} /></div>
          <div style={{ flex: 1 }}>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Place name" style={{ ...inputStyle, marginBottom: 8, fontWeight: 600 }} autoFocus />
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" rows={2} style={{ ...inputStyle, marginBottom: 10, resize: 'none', fontSize: 13 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { if (onEdit) onEdit(place.id, editName.trim() || place.name, editDesc.trim()); setEditing(false) }} style={{ background: C.primary, border: 'none', borderRadius: 8, padding: '6px 14px', color: C.bg, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ background: 'transparent', border: `1px solid ${C.primaryDim}`, borderRadius: 8, padding: '6px 14px', color: C.muted, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderBottom: isDragOver ? `2px solid ${C.primary}` : '1px solid #ffffff0a', opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.15s, border-color 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
        <button onClick={onToggle} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, textAlign: 'left', background: 'transparent', border: 'none', padding: '14px 16px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          <div style={{ cursor: 'grab', padding: 2, touchAction: 'none' }}><GripIcon color={C.primary} /></div>
          <HeartIcon filled={checked} color={C.primary} />
          <div style={{ flex: 1, opacity: checked ? 0.45 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4, textDecoration: checked ? 'line-through' : 'none', textDecorationColor: C.primaryDim }}>{place.name}</div>
            {place.description && <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, fontStyle: 'italic' }}>{place.description}</div>}
          </div>
        </button>
        <div style={{ padding: '14px 8px 14px 0', display: 'flex', alignItems: 'center', gap: 2 }}>
          {place.id && <button onClick={(e) => { e.stopPropagation(); setEditName(place.name); setEditDesc(place.description || ''); setEditing(true) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', WebkitTapHighlightColor: 'transparent', display: 'flex' }}><EditIcon color={C.primary} /></button>}
          {!showDelConfirm ? (
            <button onClick={(e) => { e.stopPropagation(); setShowDelConfirm(true) }} style={{ background: 'transparent', border: 'none', color: '#ff4d6a44', cursor: 'pointer', padding: '4px', WebkitTapHighlightColor: 'transparent', display: 'flex' }}><TrashIcon /></button>
          ) : (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button onClick={(e) => { e.stopPropagation(); if (onDelete) onDelete(place.id); setShowDelConfirm(false) }} style={{ background: '#ff4d6a22', border: '1px solid #ff4d6a', borderRadius: 6, padding: '3px 8px', color: '#ff4d6a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              <button onClick={(e) => { e.stopPropagation(); setShowDelConfirm(false) }} style={{ background: 'transparent', border: 'none', color: C.mutedDim, fontSize: 11, cursor: 'pointer' }}>No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── PIN input ── */
function PinInput({ storedPin, onSuccess, onCancel, label, C }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [lockoutSec, setLockoutSec] = useState(0)
  const timer = useRef(null)

  useEffect(() => {
    if (lockoutSec <= 0) return
    timer.current = setInterval(() => {
      const r = getLockout()
      if (r <= 0) { clearInterval(timer.current); setLockoutSec(0); setErr('') }
      else setLockoutSec(r)
    }, 500)
    return () => clearInterval(timer.current)
  }, [lockoutSec])

  const submit = (e) => {
    e.preventDefault()
    const r = verifyPin(pin, storedPin)
    setPin('')
    if (r === 'ok') { onSuccess() }
    else if (r === 'locked') { setLockoutSec(getLockout()); setErr('Too many attempts.') }
    else setErr('Wrong PIN.')
  }

  const inputStyle = { flex: 1, background: '#ffffff08', border: `1px solid ${err ? '#ff4d6a' : C.primaryDim}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', fontFamily: 'inherit', letterSpacing: pin ? '4px' : '0' }

  return (
    <form onSubmit={submit} style={{ padding: '14px 16px' }}>
      {label && <div style={{ fontSize: 12, color: C.mutedDim, marginBottom: 8, fontStyle: 'italic' }}>{label}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="password" inputMode="numeric" maxLength={8} placeholder="• • • • • • • •" value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setErr('') }} disabled={lockoutSec > 0} autoComplete="off" style={inputStyle} autoFocus />
        <button type="submit" disabled={pin.length < 4 || lockoutSec > 0} style={{ background: pin.length >= 4 && !lockoutSec ? C.primary : '#ffffff10', border: 'none', borderRadius: 10, padding: '10px 16px', color: pin.length >= 4 && !lockoutSec ? C.bg : C.mutedDim, fontWeight: 700, fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', minWidth: 60 }}>{lockoutSec > 0 ? `${lockoutSec}s` : 'OK'}</button>
        {onCancel && <button type="button" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: C.mutedDim, fontSize: 22, cursor: 'pointer', padding: '0 6px', WebkitTapHighlightColor: 'transparent' }}>×</button>}
      </div>
      {err && <div style={{ marginTop: 8, fontSize: 12, color: '#ff4d6a', fontStyle: 'italic' }}>{err}</div>}
    </form>
  )
}

/* ── Add destination form ── */
function AddDestinationForm({ onAdded, onCancel, existingNames, C }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef(null)

  const suggestions = useMemo(() => {
    if (query.length < 1) return []
    const q = query.toLowerCase()
    return citiesDatabase.filter(c => {
      return `${c.flag} ${c.city}, ${c.country}`.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    }).filter(c => !existingNames.includes(`${c.city}, ${c.country}`)).slice(0, 8)
  }, [query, existingNames])

  useEffect(() => {
    if (!showSuggestions) return
    const h = (e) => { if (inputRef.current && !inputRef.current.contains(e.target)) setShowSuggestions(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showSuggestions])

  const submitAdd = async (e) => {
    e.preventDefault(); if (!selected) return
    setSubmitting(true); setErr('')
    try {
      const name = `${selected.city}, ${selected.country}`
      const row = await addDestination(name, selected.flag, selected.lng, selected.lat)
      if (row) onAdded({ id: row.id, name: row.name, flag: selected.flag, coordinates: [selected.lng, selected.lat], active: true, type: 'city', places: [] })
      else setErr('Database error.')
    } catch { setErr('Network error.') }
    finally { setSubmitting(false) }
  }

  const iStyle = { width: '100%', background: '#ffffff08', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ padding: '14px 16px' }}>
      <form onSubmit={submitAdd}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: C.soft, fontWeight: 600 }}>✦ New destination</span>
          <button type="button" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: C.mutedDim, fontSize: 22, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>×</button>
        </div>
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, background: '#ffffff0a', borderRadius: 10, padding: '10px 14px', border: `1px solid ${C.primary}44` }}>
            <span style={{ fontSize: 24 }}>{selected.flag}</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{selected.city}</div><div style={{ fontSize: 12, color: C.mutedDim }}>{selected.country}</div></div>
            <button type="button" onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: C.mutedDim, fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>×</button>
          </div>
        ) : (
          <div ref={inputRef} style={{ position: 'relative', marginBottom: 12 }}>
            <input type="text" placeholder="Search a city…" value={query} onChange={e => { setQuery(e.target.value); setShowSuggestions(true) }} onFocus={() => query.length >= 1 && setShowSuggestions(true)} autoFocus autoComplete="off" style={iStyle} />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: `${C.bg}f8`, border: `1px solid ${C.panelBorder}`, borderRadius: 10, marginTop: 4, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
                {suggestions.map((entry, i) => (
                  <button key={`${entry.city}-${entry.country}`} type="button" onClick={() => { setSelected(entry); setQuery(''); setShowSuggestions(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: i < suggestions.length - 1 ? '1px solid #ffffff0a' : 'none', padding: '10px 14px', cursor: 'pointer', color: C.text, fontSize: 14, WebkitTapHighlightColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = '#ffffff0d'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontSize: 20 }}>{entry.flag}</span>
                    <div><span style={{ fontWeight: 600 }}>{entry.city}</span><span style={{ color: C.mutedDim, marginLeft: 6, fontSize: 12 }}>{entry.country}</span></div>
                  </button>
                ))}
              </div>
            )}
            {query.length >= 1 && showSuggestions && suggestions.length === 0 && <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: `${C.bg}f8`, border: `1px solid ${C.panelBorder}`, borderRadius: 10, marginTop: 4, padding: '12px 14px', color: C.mutedDim, fontSize: 12, fontStyle: 'italic' }}>No city found.</div>}
          </div>
        )}
        {err && <div style={{ marginBottom: 10, fontSize: 12, color: '#ff4d6a', fontStyle: 'italic' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!selected || submitting} style={{ flex: 1, background: selected && !submitting ? C.primary : '#ffffff10', border: 'none', borderRadius: 10, padding: '11px 16px', color: selected && !submitting ? C.bg : C.mutedDim, fontWeight: 700, fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{submitting ? 'Adding…' : 'Add ♡'}</button>
          <button type="button" onClick={onCancel} style={{ background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '11px 16px', color: C.muted, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

/* ── Add item form ── */
function AddItemForm({ cityId, onAdded, onCancel, C }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  const submitAdd = async (e) => {
    e.preventDefault(); if (!name.trim()) return
    setSubmitting(true); setErr('')
    try {
      const row = await addPlace(cityId, name.trim(), desc.trim())
      if (row) onAdded(row)
      else setErr('Database error.')
    } catch { setErr('Network error.') }
    finally { setSubmitting(false) }
  }

  const iStyle = { width: '100%', background: '#ffffff08', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #ffffff0d', background: '#ffffff04' }}>
      <form onSubmit={submitAdd}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: C.soft, fontWeight: 600 }}>✦ New item</span>
          <button type="button" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: C.mutedDim, fontSize: 22, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>×</button>
        </div>
        <input type="text" placeholder="Place name" value={name} onChange={e => setName(e.target.value)} autoFocus style={{ ...iStyle, marginBottom: 10 }} />
        <textarea placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...iStyle, marginBottom: 12, resize: 'none' }} />
        {err && <div style={{ marginBottom: 10, fontSize: 12, color: '#ff4d6a', fontStyle: 'italic' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!name.trim() || submitting} style={{ flex: 1, background: name.trim() && !submitting ? C.primary : '#ffffff10', border: 'none', borderRadius: 10, padding: '11px 16px', color: name.trim() && !submitting ? C.bg : C.mutedDim, fontWeight: 700, fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{submitting ? 'Adding…' : 'Add ♡'}</button>
          <button type="button" onClick={onCancel} style={{ background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '11px 16px', color: C.muted, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

/* ── Places list ── */
function PlacesListView({ cityId, places, checked, onToggle, onDeletePlace, onAddPlace, onEditPlace, supabaseDynamicPlaces, C }) {
  const [showForm, setShowForm] = useState(false)
  const staticPlaces = places || []
  const dynamicPlaces = supabaseDynamicPlaces.filter(p => p.city_id === cityId)

  function placeKey(place) {
    if (place.id) return itemKeyDynamic(place.id)
    const idx = staticPlaces.indexOf(place)
    return idx !== -1 ? `${cityId}-${idx}` : itemKeyDynamic(place.id)
  }

  const [order, setOrder] = useState(() => {
    try { const s = localStorage.getItem(`bucketmap-order-${cityId}`); if (s) return JSON.parse(s) } catch {}
    return []
  })

  useEffect(() => {
    try { const s = localStorage.getItem(`bucketmap-order-${cityId}`); if (s) { setOrder(JSON.parse(s)); return } } catch {}
    const keys = [...staticPlaces, ...dynamicPlaces].map(p => placeKey(p))
    setOrder(keys)
    localStorage.setItem(`bucketmap-order-${cityId}`, JSON.stringify(keys))
  }, [cityId])

  useEffect(() => {
    const all = [...staticPlaces, ...dynamicPlaces]
    const allKeys = all.map(p => placeKey(p))
    setOrder(prev => {
      const prevSet = new Set(prev)
      const newKeys = allKeys.filter(k => !prevSet.has(k))
      if (newKeys.length === 0) return prev
      const updated = [...prev, ...newKeys]
      localStorage.setItem(`bucketmap-order-${cityId}`, JSON.stringify(updated))
      return updated
    })
  }, [staticPlaces.length, dynamicPlaces.length, cityId])

  const allPlacesMap = useMemo(() => {
    const map = {}
    ;[...staticPlaces, ...dynamicPlaces].forEach(p => { map[placeKey(p)] = p })
    return map
  }, [staticPlaces, dynamicPlaces, cityId])

  const sortedPlaces = useMemo(() => order.map(k => allPlacesMap[k]).filter(Boolean), [order, allPlacesMap])

  const [dragIndex, setDragIndex] = useState(-1)
  const [dragOverIndex, setDragOverIndex] = useState(-1)

  const onDragEnd = useCallback(() => {
    if (dragIndex < 0 || dragOverIndex < 0 || dragIndex === dragOverIndex) { setDragIndex(-1); setDragOverIndex(-1); return }
    setOrder(prev => {
      const next = [...prev]; const [m] = next.splice(dragIndex, 1); next.splice(dragOverIndex, 0, m)
      localStorage.setItem(`bucketmap-order-${cityId}`, JSON.stringify(next)); return next
    })
    const finalOrder = [...order]; const [mk] = finalOrder.splice(dragIndex, 1); finalOrder.splice(dragOverIndex, 0, mk)
    finalOrder.forEach((key, idx) => { if (key.startsWith('bucketmap-')) { reorderPlace(key.replace('bucketmap-', ''), idx).catch(() => {}) } })
    setDragIndex(-1); setDragOverIndex(-1)
  }, [dragIndex, dragOverIndex, order, cityId])

  return (
    <>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #ffffff0d' }}>
        <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: `1px dashed ${C.primaryDim}`, borderRadius: 10, padding: '11px 14px', color: C.primary, fontSize: 14, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>+</span><span>Add a place</span>
        </button>
      </div>
      {showForm && <AddItemForm cityId={cityId} C={C} onAdded={p => { setShowForm(false); if (onAddPlace) onAddPlace(p) }} onCancel={() => setShowForm(false)} />}
      {sortedPlaces.length > 0 && <div style={{ fontSize: 10, textAlign: 'right', padding: '6px 16px 0', color: C.mutedDim, fontStyle: 'italic' }}>drag ⋮⋮ to reorder</div>}
      {sortedPlaces.map((place, i) => {
        const key = placeKey(place)
        return (
          <div key={key} draggable onDragStart={() => { setDragIndex(i); setDragOverIndex(i) }} onDragOver={e => { e.preventDefault(); setDragOverIndex(i) }} onDragEnd={onDragEnd}>
            <PlaceItem place={place} C={C} checked={!!checked[key]} onToggle={() => onToggle(key)} onDelete={onDeletePlace} onEdit={onEditPlace} isDragging={dragIndex === i} isDragOver={dragOverIndex === i && dragIndex !== i} />
          </div>
        )
      })}
      {sortedPlaces.length === 0 && <div style={{ textAlign: 'center', padding: '48px 32px', fontStyle: 'italic', color: C.mutedDim, fontSize: 13 }}>No items yet. Tap "+" to add ♡</div>}
    </>
  )
}

/* ── Side panel ── */
function SidePanel({ city, checked, onToggle, onClose, supabasePlaces, onDeleteDestination, onDeletePlace, onAddPlace, onEditPlace, hiddenCities, onHideCity, C }) {
  const isVisible = !!city
  const [selectedSubCity, setSelectedSubCity] = useState(null)
  const [showDeleteDest, setShowDeleteDest] = useState(false)
  const [deleteConfirmCityId, setDeleteConfirmCityId] = useState(null)
  const isCountry = city?.type === 'country'
  const subCities = isCountry ? (city?.cities || []) : []

  useEffect(() => { setSelectedSubCity(null); setShowDeleteDest(false) }, [city?.id])

  function subCityStats(subCity) {
    const sp = supabasePlaces.filter(p => p.city_id === subCity.id)
    const done = sp.filter(p => checked[itemKeyDynamic(p.id)]).length
    return { done, total: sp.length }
  }

  const activeCityId = selectedSubCity?.id || (city && !isCountry ? city.id : null)
  const activeCityPlaces = selectedSubCity?.places || (city && !isCountry ? city.places : [])
  const dynamicForActive = supabasePlaces.filter(p => p.city_id === activeCityId)
  const allActivePlaces = [...(activeCityPlaces || []), ...dynamicForActive]
  function placeKeyActive(p) {
    if (p.id) return itemKeyDynamic(p.id)
    const idx = (activeCityPlaces || []).indexOf(p)
    return idx !== -1 ? `${activeCityId}-${idx}` : itemKeyDynamic(p.id)
  }
  const activeDone = allActivePlaces.filter(p => checked[placeKeyActive(p)]).length

  return (
    <>
      {isVisible && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)', zIndex: 2000, animation: 'fadeIn 0.2s ease' }} />}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(460px, 100vw)', background: C.panel, borderLeft: `1px solid ${C.panelBorder}`, zIndex: 2010, transform: isVisible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.38s cubic-bezier(0.16,1,0.3,1)', display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {city && (<>
          <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 20px 16px', borderBottom: '1px solid #ffffff0d', background: C.panelHeader, position: 'sticky', top: 0, zIndex: 1 }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 16, width: 36, height: 36, background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 20, WebkitTapHighlightColor: 'transparent' }}>×</button>
            {selectedSubCity && (
              <button onClick={() => setSelectedSubCity(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: C.muted, fontSize: 13, fontWeight: 600, WebkitTapHighlightColor: 'transparent', padding: '4px 0 8px', background: 'transparent', border: 'none', width: '100%' }} onMouseEnter={e => e.currentTarget.style.color = C.soft} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                <BackIcon color={C.muted} /> Back to {city.name}
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 6 }}>{selectedSubCity ? '📍' : city.flag}</div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>{selectedSubCity ? selectedSubCity.name : city.name}</h2>
              </div>
            </div>
            {(selectedSubCity || !isCountry) && city.active && <ProgressBar done={activeDone} total={allActivePlaces.length} C={C} />}
            {!isCountry && city.active && (
              <div style={{ marginTop: 10 }}>
                {!showDeleteDest ? (
                  <button onClick={() => setShowDeleteDest(true)} style={{ background: 'transparent', border: 'none', color: '#ff4d6a44', fontSize: 11, cursor: 'pointer', fontStyle: 'italic', padding: 0, WebkitTapHighlightColor: 'transparent', display: 'flex', alignItems: 'center', gap: 4 }}><TrashIcon /> Delete this destination</button>
                ) : (
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
                    <span style={{ fontSize: 12, color: '#ff4d6a', fontStyle: 'italic', flex: 1 }}>Delete "{city.name}"?</span>
                    <button onClick={() => { if (onDeleteDestination) onDeleteDestination(city.id); setShowDeleteDest(false); onClose() }} style={{ background: '#ff4d6a22', border: '1px solid #ff4d6a', borderRadius: 8, padding: '6px 12px', color: '#ff4d6a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setShowDeleteDest(false)} style={{ background: 'transparent', border: 'none', color: C.mutedDim, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            {isCountry && !selectedSubCity ? (
              <>
                <div style={{ fontSize: 10, textAlign: 'right', padding: '8px 16px 4px', color: C.mutedDim, fontStyle: 'italic' }}>select a city ↓</div>
                {subCities.filter(sub => !hiddenCities.includes(sub.id)).map(sub => {
                  const stats = subCityStats(sub)
                  const isConfirming = deleteConfirmCityId === sub.id
                  return (
                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <button onClick={() => { setDeleteConfirmCityId(null); setSelectedSubCity(sub) }} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #ffffff0a', padding: '16px 20px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = '#ffffff06'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: 24 }}>📍</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{sub.name}</div>
                          <div style={{ fontSize: 11, color: C.mutedDim, fontStyle: 'italic', marginTop: 2 }}>{stats.total > 0 ? `${stats.done}/${stats.total} visited` : 'no items yet'}</div>
                        </div>
                        <span style={{ color: C.mutedDim, fontSize: 18 }}>›</span>
                      </button>
                      <div style={{ paddingRight: 16 }}>
                        {!isConfirming ? (
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmCityId(sub.id) }} style={{ background: 'transparent', border: 'none', color: '#ff4d6a33', cursor: 'pointer', padding: '4px', WebkitTapHighlightColor: 'transparent' }}><TrashIcon /></button>
                        ) : (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={(e) => { e.stopPropagation(); if (onHideCity) onHideCity(sub.id); setDeleteConfirmCityId(null) }} style={{ background: '#ff4d6a22', border: '1px solid #ff4d6a', borderRadius: 6, padding: '3px 8px', color: '#ff4d6a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Hide</button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmCityId(null) }} style={{ background: 'transparent', border: 'none', color: C.mutedDim, fontSize: 11, cursor: 'pointer' }}>No</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            ) : city.active ? (
              <PlacesListView cityId={activeCityId} places={activeCityPlaces} checked={checked} onToggle={onToggle} onDeletePlace={onDeletePlace} onAddPlace={onAddPlace} onEditPlace={onEditPlace} supabaseDynamicPlaces={supabasePlaces} C={C} />
            ) : (
              <div style={{ textAlign: 'center', padding: '72px 32px 48px', fontStyle: 'italic' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🥰</div>
                <div style={{ fontSize: 18, color: C.soft, marginBottom: 8 }}>Coming soon...</div>
                <div style={{ fontSize: 13, color: C.mutedDim }}>This adventure is still a dream ♡</div>
              </div>
            )}
          </div>
        </>)}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </>
  )
}

/* ── Zoom controls ── */
function ZoomButtons({ onZoomIn, onZoomOut, C }) {
  const btn = { width: 40, height: 40, background: `${C.bg}dd`, border: `1px solid ${C.primaryDim}`, borderRadius: '50%', color: C.primary, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none', touchAction: 'manipulation', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }
  return (
    <div style={{ position: 'absolute', bottom: 100, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button style={btn} onClick={onZoomIn} aria-label="Zoom in">+</button>
      <button style={btn} onClick={onZoomOut} aria-label="Zoom out">−</button>
    </div>
  )
}

/* ── Landing screen ── */
function LandingScreen({ onNewMap, onOpenMap }) {
  const C = themeOf('aurora') // neutral default for landing
  const [mode, setMode] = useState(null) // null | 'open'
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [err, setErr] = useState('')

  const lookupMap = async () => {
    if (!userId.trim()) return
    setLoading(true); setErr(''); setProfile(null)
    try {
      const p = await fetchProfile(userId.trim())
      if (!p) { setErr('No map found with this ID.'); setLoading(false); return }
      setProfile(p)
    } catch { setErr('Network error.') }
    finally { setLoading(false) }
  }

  const openMap = () => {
    // Profile found + PIN verified (or no PIN) → store in session and open
    localStorage.setItem('bucketmap-user-id', userId.trim())
    localStorage.setItem('bucketmap-title', profile.title)
    localStorage.setItem('bucketmap-theme', profile.theme)
    localStorage.setItem('bucketmap-onboarded', '1')
    sessionStorage.setItem('bucketmap-unlocked', '1')
    onOpenMap()
  }

  return (
    <div style={{ width: '100vw', height: '100svh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ width: 'min(380px, 100%)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700, background: `linear-gradient(90deg, ${C.soft}, ${C.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 2 }}>BucketMap</div>
          <div style={{ fontSize: 13, color: C.mutedDim, fontStyle: 'italic', marginTop: 6 }}>your personal travel bucket list ♡</div>
        </div>

        {mode === null && (
          <>
            <button onClick={onNewMap} style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 14, padding: '16px', color: C.bg, fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
              ✨ Create a new map
            </button>
            <button onClick={() => setMode('open')} style={{ width: '100%', background: 'transparent', border: `1.5px solid ${C.primaryDim}`, borderRadius: 14, padding: '16px', color: C.muted, fontWeight: 600, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
              🔑 Open an existing map
            </button>
          </>
        )}

        {mode === 'open' && !profile && (
          <div style={{ background: `${C.panel}`, border: `1px solid ${C.panelBorder}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Enter your Map ID</div>
              <div style={{ fontSize: 12, color: C.mutedDim, fontStyle: 'italic', marginBottom: 14 }}>Find it in your map's Settings panel.</div>
              <textarea
                value={userId}
                onChange={e => { setUserId(e.target.value); setErr('') }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                rows={2}
                style={{ width: '100%', background: '#ffffff08', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', fontFamily: 'monospace', resize: 'none', marginBottom: 10 }}
              />
              {err && <div style={{ fontSize: 12, color: '#ff4d6a', fontStyle: 'italic', marginBottom: 8 }}>{err}</div>}
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={lookupMap} disabled={!userId.trim() || loading} style={{ flex: 1, background: userId.trim() && !loading ? C.primary : '#ffffff10', border: 'none', borderRadius: 10, padding: '12px', color: userId.trim() && !loading ? C.bg : C.mutedDim, fontWeight: 700, fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit' }}>{loading ? 'Looking up…' : 'Find my map →'}</button>
              <button onClick={() => { setMode(null); setUserId(''); setErr('') }} style={{ background: '#ffffff08', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '12px 16px', color: C.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
            </div>
          </div>
        )}

        {mode === 'open' && profile && (
          <div style={{ background: `${C.panel}`, border: `1px solid ${themeOf(profile.theme).panelBorder}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '20px', background: themeOf(profile.theme).panelHeader }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 36 }}>{themeOf(profile.theme).emoji}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: themeOf(profile.theme).text }}>{profile.title}</div>
                  <div style={{ fontSize: 11, color: themeOf(profile.theme).mutedDim, marginTop: 2 }}>{profile.pin ? '🔒 PIN protected' : '🔓 No PIN'}</div>
                </div>
              </div>
            </div>
            {profile.pin ? (
              <>
                <div style={{ padding: '14px 20px 4px', fontSize: 13, color: themeOf(profile.theme).mutedDim, fontStyle: 'italic' }}>Enter your PIN to open this map</div>
                <PinInput storedPin={profile.pin} C={themeOf(profile.theme)} onSuccess={openMap} onCancel={() => { setProfile(null) }} />
              </>
            ) : (
              <div style={{ padding: '16px 20px', display: 'flex', gap: 10 }}>
                <button onClick={openMap} style={{ flex: 1, background: themeOf(profile.theme).primary, border: 'none', borderRadius: 10, padding: '12px', color: themeOf(profile.theme).bg, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Open my map ♡</button>
                <button onClick={() => setProfile(null)} style={{ background: '#ffffff08', border: `1px solid ${themeOf(profile.theme).primaryDim}`, borderRadius: 10, padding: '12px 16px', color: themeOf(profile.theme).muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Onboarding ── */
function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('My BucketMap')
  const [themeKey, setThemeKey] = useState('aurora')
  const [pinMode, setPinMode] = useState(false)
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [saving, setSaving] = useState(false)

  const C = themeOf(themeKey)

  const handleFinish = async () => {
    if (pinMode && pin) {
      if (pin.length < 4) { setPinErr('PIN must be at least 4 digits.'); return }
      if (pin !== pinConfirm) { setPinErr('PINs do not match.'); return }
    }
    const finalPin = pinMode && pin ? pin : ''
    const userId = getUserId()
    setSaving(true)
    localStorage.setItem('bucketmap-title', title.trim() || 'My BucketMap')
    localStorage.setItem('bucketmap-theme', themeKey)
    localStorage.setItem('bucketmap-onboarded', '1')
    sessionStorage.setItem('bucketmap-unlocked', '1')
    await saveProfile(userId, { title: title.trim() || 'My BucketMap', theme: themeKey, pin: finalPin }).catch(() => {})
    setSaving(false)
    onComplete(themeKey, title.trim() || 'My BucketMap')
  }

  const card = { width: 'min(400px, 100%)', background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 20, overflow: 'hidden', transition: 'all 0.4s' }
  const iStyle = { width: '100%', background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 16, outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', fontFamily: 'inherit' }
  const btnP = { width: '100%', background: C.primary, border: 'none', borderRadius: 12, padding: '14px', color: C.bg, fontWeight: 700, fontSize: 16, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit' }
  const btnG = { width: '100%', background: 'transparent', border: `1px solid ${C.primaryDim}`, borderRadius: 12, padding: '12px', color: C.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit' }

  return (
    <div style={{ width: '100vw', height: '100svh', background: C.bg, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(24px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom))', overflowY: 'auto', transition: 'background 0.4s' }}>
      <div style={{ ...card, marginTop: 'auto', marginBottom: 'auto' }}>
        <div style={{ padding: '28px 24px 16px', textAlign: 'center', background: C.panelHeader }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🗺️</div>
          <div style={{ fontSize: 11, color: C.mutedDim, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Step {step} of 3</div>
          <div style={{ height: 3, background: '#ffffff10', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${(step / 3) * 100}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`, borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
        </div>

        {step === 1 && (
          <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: C.text }}>Name your map</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: C.mutedDim, fontStyle: 'italic' }}>Give your map a personal title. You can change it later.</p>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="My BucketMap" maxLength={40} autoFocus style={{ ...iStyle, marginBottom: 20 }} />
            <button onClick={() => setStep(2)} style={btnP}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: C.text }}>Choose your theme</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: C.mutedDim, fontStyle: 'italic' }}>Pick the vibe for your map. Preview updates live.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key} onClick={() => setThemeKey(key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: key === themeKey ? `${t.primary}22` : '#ffffff08', border: `2px solid ${key === themeKey ? t.primary : '#ffffff15'}`, borderRadius: 12, cursor: 'pointer', color: C.text, WebkitTapHighlightColor: 'transparent', textAlign: 'left', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 22 }}>{t.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: key === themeKey ? 700 : 400 }}>{t.name}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => setStep(3)} style={btnP}>Continue →</button>
              <button onClick={() => setStep(1)} style={btnG}>← Back</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: C.text }}>Protect your map</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: C.mutedDim, fontStyle: 'italic' }}>Set a PIN to lock your map. Totally optional.</p>
            {!pinMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setPinMode(true)} style={{ ...btnG, border: `1px solid ${C.primaryDim}`, color: C.primary }}>🔒 Set a PIN</button>
                <button onClick={handleFinish} disabled={saving} style={{ ...btnP, opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Skip & open my map ♡'}</button>
                <button onClick={() => setStep(2)} style={{ ...btnG, fontSize: 13, padding: '8px' }}>← Back</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="password" inputMode="numeric" maxLength={8} placeholder="Choose a PIN (4-8 digits)" value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinErr('') }} style={{ ...iStyle, letterSpacing: pin ? '4px' : '0' }} />
                <input type="password" inputMode="numeric" maxLength={8} placeholder="Confirm PIN" value={pinConfirm} onChange={e => { setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinErr('') }} style={{ ...iStyle, letterSpacing: pinConfirm ? '4px' : '0' }} />
                {pinErr && <div style={{ fontSize: 12, color: '#ff4d6a', fontStyle: 'italic' }}>{pinErr}</div>}
                <button onClick={handleFinish} disabled={saving} style={{ ...btnP, marginTop: 4, opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Open my map ♡'}</button>
                <button onClick={() => { setPinMode(false); setPin(''); setPinConfirm(''); setPinErr('') }} style={{ ...btnG, fontSize: 13, padding: '8px' }}>← Cancel PIN</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── PIN lock screen ── */
function PinLockScreen({ C, mapTitle, storedPin, onUnlock }) {
  return (
    <div style={{ width: '100vw', height: '100svh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: 'min(340px, calc(100vw - 48px))', background: `${C.panel}f8`, border: `1px solid ${C.panelBorder}`, borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', padding: '36px 16px 16px' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🗺️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>{mapTitle}</div>
          <div style={{ fontSize: 12, color: C.mutedDim, fontStyle: 'italic', marginBottom: 4 }}>Enter your PIN to unlock ♡</div>
        </div>
        <PinInput storedPin={storedPin} C={C} onSuccess={() => { sessionStorage.setItem('bucketmap-unlocked', '1'); onUnlock() }} />
      </div>
    </div>
  )
}

/* ── Settings panel ── */
function SettingsPanel({ onClose, onThemeChange, onDisconnect, C, userId }) {
  const [titleVal, setTitleVal] = useState(localStorage.getItem('bucketmap-title') || 'My BucketMap')
  const [themeKey, setThemeKey] = useState(localStorage.getItem('bucketmap-theme') || 'aurora')
  const [pinSection, setPinSection] = useState('idle')
  const [oldPin, setOldPin] = useState(''); const [newPin, setNewPin] = useState(''); const [confirmPin, setConfirmPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [disconnectStep, setDisconnectStep] = useState(0) // 0=idle 1=show-id 2=confirm

  const storedPin = useRef(localStorage.getItem('bucketmap-stored-pin') || '')
  // We store pin in profile (Supabase) — read from profile
  const [profilePin, setProfilePin] = useState('')
  useEffect(() => { fetchProfile(userId).then(p => { if (p) setProfilePin(p.pin || '') }) }, [userId])

  const applyTheme = (key) => { setThemeKey(key); localStorage.setItem('bucketmap-theme', key); onThemeChange(key) }

  const saveSettings = async () => {
    setSaving(true)
    localStorage.setItem('bucketmap-title', titleVal.trim() || 'My BucketMap')
    await saveProfile(userId, { title: titleVal.trim() || 'My BucketMap', theme: themeKey, pin: profilePin }).catch(() => {})
    setSaving(false)
    onThemeChange(themeKey)
    onClose()
  }

  const doChangePin = async () => {
    if (profilePin) {
      if (verifyPin(oldPin, profilePin) !== 'ok') { setPinErr('Current PIN is wrong.'); return }
    }
    if (newPin.length < 4) { setPinErr('PIN must be at least 4 digits.'); return }
    if (newPin !== confirmPin) { setPinErr('PINs do not match.'); return }
    setProfilePin(newPin)
    await saveProfile(userId, { title: titleVal, theme: themeKey, pin: newPin }).catch(() => {})
    setOldPin(''); setNewPin(''); setConfirmPin(''); setPinErr(''); setPinSection('idle')
  }

  const doRemovePin = async () => {
    if (verifyPin(oldPin, profilePin) !== 'ok') { setPinErr('Wrong PIN.'); return }
    setProfilePin('')
    await saveProfile(userId, { title: titleVal, theme: themeKey, pin: '' }).catch(() => {})
    setOldPin(''); setPinErr(''); setPinSection('idle')
  }

  const copyId = () => { navigator.clipboard.writeText(userId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }

  const iStyle = { width: '100%', background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', fontFamily: 'inherit' }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)', zIndex: 3000 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)', background: C.panel, borderLeft: `1px solid ${C.panelBorder}`, zIndex: 3010, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ padding: 'max(20px, env(safe-area-inset-top)) 20px 16px', background: C.panelHeader, borderBottom: `1px solid ${C.panelBorder}`, position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Settings</h2>
          <button onClick={onClose} style={{ background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}><CloseIcon color={C.muted} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Map title */}
          <div>
            <div style={{ fontSize: 11, color: C.mutedDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Map Title</div>
            <input value={titleVal} onChange={e => setTitleVal(e.target.value)} maxLength={40} style={iStyle} />
          </div>

          {/* Theme */}
          <div>
            <div style={{ fontSize: 11, color: C.mutedDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key} onClick={() => applyTheme(key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: key === themeKey ? `${t.primary}22` : '#ffffff08', border: `2px solid ${key === themeKey ? t.primary : '#ffffff15'}`, borderRadius: 10, cursor: 'pointer', color: C.text, WebkitTapHighlightColor: 'transparent', textAlign: 'left', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 18 }}>{t.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: key === themeKey ? 700 : 400 }}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PIN */}
          <div>
            <div style={{ fontSize: 11, color: C.mutedDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>PIN Lock</div>
            {pinSection === 'idle' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setPinSection('change'); setPinErr('') }} style={{ flex: 1, background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '10px', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{profilePin ? '🔒 Change PIN' : '🔓 Set PIN'}</button>
                {profilePin && <button onClick={() => { setPinSection('remove'); setPinErr('') }} style={{ flex: 1, background: '#ff4d6a11', border: '1px solid #ff4d6a33', borderRadius: 10, padding: '10px', color: '#ff4d6a', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Remove PIN</button>}
              </div>
            )}
            {pinSection === 'change' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profilePin && <input type="password" inputMode="numeric" maxLength={8} placeholder="Current PIN" value={oldPin} onChange={e => { setOldPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinErr('') }} style={{ ...iStyle, letterSpacing: oldPin ? '4px' : '0' }} />}
                <input type="password" inputMode="numeric" maxLength={8} placeholder="New PIN (4-8 digits)" value={newPin} onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinErr('') }} style={{ ...iStyle, letterSpacing: newPin ? '4px' : '0' }} />
                <input type="password" inputMode="numeric" maxLength={8} placeholder="Confirm new PIN" value={confirmPin} onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinErr('') }} style={{ ...iStyle, letterSpacing: confirmPin ? '4px' : '0' }} />
                {pinErr && <div style={{ fontSize: 12, color: '#ff4d6a', fontStyle: 'italic' }}>{pinErr}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={doChangePin} style={{ flex: 1, background: C.primary, border: 'none', borderRadius: 10, padding: '10px', color: C.bg, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                  <button onClick={() => { setPinSection('idle'); setPinErr(''); setNewPin(''); setConfirmPin(''); setOldPin('') }} style={{ background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '10px 16px', color: C.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              </div>
            )}
            {pinSection === 'remove' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="password" inputMode="numeric" maxLength={8} placeholder="Enter current PIN" value={oldPin} onChange={e => { setOldPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinErr('') }} style={{ ...iStyle, letterSpacing: oldPin ? '4px' : '0' }} />
                {pinErr && <div style={{ fontSize: 12, color: '#ff4d6a', fontStyle: 'italic' }}>{pinErr}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={doRemovePin} style={{ flex: 1, background: '#ff4d6a22', border: '1px solid #ff4d6a', borderRadius: 10, padding: '10px', color: '#ff4d6a', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                  <button onClick={() => { setPinSection('idle'); setPinErr(''); setOldPin('') }} style={{ background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '10px 16px', color: C.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Map ID */}
          <div>
            <div style={{ fontSize: 11, color: C.mutedDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Your Map ID</div>
            <div style={{ background: '#ffffff06', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, fontSize: 11, color: C.mutedDim, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.7 }}>{userId}</div>
              <button onClick={copyId} title="Copy ID" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}><CopyIcon color={copied ? C.primary : C.mutedDim} /></button>
            </div>
            {copied && <div style={{ fontSize: 11, color: C.primary, fontStyle: 'italic', marginTop: 4 }}>Copied ✓</div>}
            <div style={{ fontSize: 11, color: C.mutedDim, fontStyle: 'italic', marginTop: 6 }}>Share this ID to open your map on another device.</div>
          </div>

          {/* Save button */}
          <button onClick={saveSettings} disabled={saving} style={{ background: C.primary, border: 'none', borderRadius: 12, padding: '14px', color: C.bg, fontWeight: 700, fontSize: 15, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save changes'}</button>

          {/* Disconnect */}
          <div style={{ borderTop: '1px solid #ffffff0d', paddingTop: 20 }}>
            {disconnectStep === 0 && (
              <>
                <button onClick={() => setDisconnectStep(1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#ffffff08', border: `1px solid #ffffff15`, borderRadius: 12, padding: '12px', color: C.mutedDim, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
                  <LogoutIcon color={C.mutedDim} /> Disconnect from this map
                </button>
                <div style={{ fontSize: 11, color: C.mutedDim, fontStyle: 'italic', textAlign: 'center', marginTop: 6 }}>Your data is saved. Use your Map ID to reconnect.</div>
              </>
            )}

            {disconnectStep === 1 && (
              <div style={{ background: '#ff4d6a0d', border: '1px solid #ff4d6a33', borderRadius: 14, padding: '18px' }}>
                <div style={{ fontSize: 22, textAlign: 'center', marginBottom: 10 }}>⚠️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6, textAlign: 'center' }}>Save your Map ID first!</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, textAlign: 'center', lineHeight: 1.5 }}>Without it, you won't be able to find your map again. Copy it now before leaving.</div>
                <div style={{ background: '#ffffff08', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10, border: `1px solid ${C.primaryDim}` }}>
                  <div style={{ flex: 1, fontSize: 12, color: C.text, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.7, userSelect: 'all' }}>{userId}</div>
                  <button onClick={() => { navigator.clipboard.writeText(userId).then(() => setCopied(true)) }} style={{ background: copied ? `${C.primary}22` : 'transparent', border: `1px solid ${copied ? C.primary : C.primaryDim}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: copied ? C.primary : C.mutedDim, fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent', flexShrink: 0 }}>
                    <CopyIcon color={copied ? C.primary : C.mutedDim} />{copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setDisconnectStep(2)} style={{ flex: 1, background: '#ff4d6a22', border: '1px solid #ff4d6a55', borderRadius: 10, padding: '11px', color: '#ff4d6a', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>I've saved it, disconnect</button>
                  <button onClick={() => setDisconnectStep(0)} style={{ background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '11px 14px', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>Cancel</button>
                </div>
              </div>
            )}

            {disconnectStep === 2 && (
              <div style={{ background: '#ff4d6a0d', border: '1px solid #ff4d6a55', borderRadius: 14, padding: '18px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ff4d6a', marginBottom: 8, textAlign: 'center' }}>Are you sure?</div>
                <div style={{ fontSize: 12, color: C.mutedDim, marginBottom: 16, textAlign: 'center', fontStyle: 'italic' }}>This will close your current session. Your map stays saved in the cloud.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={onDisconnect} style={{ flex: 1, background: '#ff4d6a', border: 'none', borderRadius: 10, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>Yes, disconnect</button>
                  <button onClick={() => setDisconnectStep(0)} style={{ background: '#ffffff0a', border: `1px solid ${C.primaryDim}`, borderRadius: 10, padding: '12px 14px', color: C.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Main App ── */
export default function App() {
  // Determine initial screen
  const getInitialScreen = () => {
    const onboarded = localStorage.getItem('bucketmap-onboarded') === '1'
    const userId = localStorage.getItem('bucketmap-user-id')
    if (!onboarded || !userId) return 'landing'
    return 'map'
  }

  const [screen, setScreen] = useState(getInitialScreen) // 'landing' | 'onboarding' | 'map'
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('bucketmap-theme') || 'aurora')
  const [mapTitle, setMapTitle] = useState(() => localStorage.getItem('bucketmap-title') || 'My BucketMap')
  const [storedPin, setStoredPin] = useState(null) // null = not fetched yet
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('bucketmap-unlocked') === '1')
  const [showSettings, setShowSettings] = useState(false)

  const C = themeOf(themeKey)
  const userId = getUserId()

  // Fetch profile PIN on mount (for lock screen)
  useEffect(() => {
    if (screen !== 'map') return
    fetchProfile(userId).then(p => {
      setStoredPin(p?.pin || '')
    }).catch(() => setStoredPin(''))
  }, [screen])

  const [selectedCity, setSelectedCity] = useState(null)
  const [supabasePlaces, setSupabasePlaces] = useState([])
  const [destinations, setDestinations] = useState([])
  const [showAddDest, setShowAddDest] = useState(false)
  const [checked, setChecked] = useState(() => { try { return JSON.parse(localStorage.getItem('bucketmap-checked') || '{}') } catch { return {} } })
  const [hiddenCities, setHiddenCities] = useState(() => { try { return JSON.parse(localStorage.getItem('bucketmap-hidden-cities') || '[]') } catch { return [] } })

  const [tr, setTr] = useState({ tx: 0, ty: 0, z: 1.2 })
  const mapRef = useRef(null)
  const gestureRef = useRef(null)
  const didDragRef = useRef(false)
  const allCitiesRef = useRef([])

  const WL = 559, WR = 447, WT = 429, WB = 573

  function clamp(tx, ty, z) {
    const W = window.innerWidth, H = window.innerHeight
    const safeZ = Math.max(1, Math.min(24, z))
    const minTx = W / 2 - WR * safeZ, maxTx = WL * safeZ - W / 2
    const minTy = H / 2 - WB * safeZ, maxTy = WT * safeZ - H / 2
    return { tx: minTx > maxTx ? 0 : Math.max(minTx, Math.min(maxTx, tx)), ty: minTy > maxTy ? 0 : Math.max(minTy, Math.min(maxTy, ty)), z: safeZ }
  }

  const trRef = useRef(tr)
  useEffect(() => { trRef.current = tr }, [tr])

  useEffect(() => {
    const el = mapRef.current; if (!el) return
    const onWheel = (e) => { e.preventDefault(); const prev = trRef.current; const factor = e.deltaY > 0 ? 0.8 : 1.25; const newZ = Math.max(1, Math.min(24, prev.z * factor)); const W = window.innerWidth, H = window.innerHeight; const relX = (e.clientX - W / 2 - prev.tx) / prev.z, relY = (e.clientY - H / 2 - prev.ty) / prev.z; setTr(clamp(e.clientX - W / 2 - newZ * relX, e.clientY - H / 2 - newZ * relY, newZ)) }
    const onTouchStart = (e) => { const prev = trRef.current; if (e.touches.length === 1) { didDragRef.current = false; gestureRef.current = { type: 'pan', sx: e.touches[0].clientX, sy: e.touches[0].clientY, stx: prev.tx, sty: prev.ty } } else if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY; gestureRef.current = { type: 'pinch', dist: Math.sqrt(dx * dx + dy * dy), cx: (e.touches[0].clientX + e.touches[1].clientX) / 2, cy: (e.touches[0].clientY + e.touches[1].clientY) / 2, stx: prev.tx, sty: prev.ty, sz: prev.z } } }
    const onTouchMove = (e) => { e.preventDefault(); const g = gestureRef.current; if (!g) return; if (g.type === 'pan' && e.touches.length === 1) { const dx = e.touches[0].clientX - g.sx, dy = e.touches[0].clientY - g.sy; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true; setTr(prev => clamp(g.stx + dx, g.sty + dy, prev.z)) } else if (g.type === 'pinch' && e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY; const dist = Math.sqrt(dx * dx + dy * dy); const W = window.innerWidth, H = window.innerHeight; const newZ = Math.max(1, Math.min(24, g.sz * (dist / g.dist))); const relX = (g.cx - W / 2 - g.stx) / g.sz, relY = (g.cy - H / 2 - g.sty) / g.sz; setTr(clamp(g.cx - W / 2 - newZ * relX, g.cy - H / 2 - newZ * relY, newZ)) } }
    const onTouchEnd = (e) => { if (e.changedTouches.length === 1 && !didDragRef.current) { const touch = e.changedTouches[0]; const target = document.elementFromPoint(touch.clientX, touch.clientY); if (target) { const marker = target.closest('[data-city-id]'); if (marker) { const cityId = marker.getAttribute('data-city-id'); const city = allCitiesRef.current.find(c => c.id === cityId); if (city) setSelectedCity(city) } } }; if (e.touches.length === 0) gestureRef.current = null }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => { el.removeEventListener('wheel', onWheel); el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchmove', onTouchMove); el.removeEventListener('touchend', onTouchEnd) }
  }, [screen, unlocked])

  const onMouseDown = useCallback((e) => { if (e.button !== 0) return; didDragRef.current = false; gestureRef.current = { type: 'pan', sx: e.clientX, sy: e.clientY, stx: tr.tx, sty: tr.ty } }, [tr])
  const onMouseMove = useCallback((e) => { const g = gestureRef.current; if (!g || g.type !== 'pan') return; const dx = e.clientX - g.sx, dy = e.clientY - g.sy; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true; setTr(prev => clamp(g.stx + dx, g.sty + dy, prev.z)) }, [])
  const onMouseUp = useCallback(() => { gestureRef.current = null }, [])

  useEffect(() => {
    if (screen !== 'map' || !unlocked) return
    let cancelled = false
    async function load() {
      const [places, remoteChecked, dests] = await Promise.all([fetchPlaces(), fetchCheckedItems(), fetchDestinations()])
      if (cancelled) return
      setSupabasePlaces(places)
      setDestinations(dests.map(d => ({ id: d.id, name: d.name, flag: d.flag, coordinates: [d.lng, d.lat], active: true, type: 'city', places: [] })))
      if (remoteChecked.length > 0) {
        const map = {}
        remoteChecked.forEach(r => { map[r.item_key] = r.checked })
        setChecked(prev => { const merged = { ...prev, ...map }; localStorage.setItem('bucketmap-checked', JSON.stringify(merged)); return merged })
      }
    }
    load()
    return () => { cancelled = true }
  }, [screen, unlocked])

  const handleToggle = useCallback((key) => { setChecked(prev => { const next = { ...prev, [key]: !prev[key] }; localStorage.setItem('bucketmap-checked', JSON.stringify(next)); setCheckedItem(key, next[key]).catch(() => {}); return next }) }, [])
  const handleAddPlace = useCallback((place) => { setSupabasePlaces(prev => [...prev, place]) }, [])
  const handleAddDestination = useCallback((dest) => { setDestinations(prev => [...prev, dest]); setSelectedCity(dest); setShowAddDest(false) }, [])
  const handleDeleteDestination = useCallback(async (id) => { const ok = await deleteDestination(id); if (ok) setDestinations(prev => prev.filter(d => d.id !== id)) }, [])
  const handleDeletePlace = useCallback(async (placeId) => { const ok = await deletePlace(placeId); if (ok) setSupabasePlaces(prev => prev.filter(p => p.id !== placeId)) }, [])
  const handleEditPlace = useCallback(async (placeId, name, description) => { const updated = await updatePlace(placeId, name, description); if (updated) setSupabasePlaces(prev => prev.map(p => p.id === placeId ? updated : p)) }, [])
  const handleHideCity = useCallback((cityId) => { setHiddenCities(prev => { const next = [...prev, cityId]; localStorage.setItem('bucketmap-hidden-cities', JSON.stringify(next)); return next }) }, [])
  const zoomIn = useCallback(() => { setTr(prev => clamp(prev.tx, prev.ty, Math.min(24, prev.z * 1.5))) }, [])
  const zoomOut = useCallback(() => { setTr(prev => clamp(prev.tx, prev.ty, Math.max(1, prev.z / 1.5))) }, [])

  const existingNames = useMemo(() => destinations.map(d => d.name), [destinations])

  const allCities = useMemo(() => {
    const normalizedDests = destinations.map(d => {
      const ci = d.name.indexOf(',')
      const cityName = ci > 0 ? d.name.slice(0, ci).trim() : d.name
      const countryName = ci > 0 ? d.name.slice(ci + 1).trim() : ''
      return { ...d, cityName, countryName }
    })
    const groups = {}
    normalizedDests.forEach(d => {
      const ck = d.countryName.toLowerCase() || `__solo__${d.id}`
      if (!groups[ck]) groups[ck] = []
      groups[ck].push(d)
    })
    const result = []
    Object.entries(groups).forEach(([, cities]) => {
      const visible = cities.filter(c => !hiddenCities.includes(c.id))
      if (visible.length === 0) return
      if (visible.length === 1) {
        result.push({ ...visible[0], type: 'city', active: true })
      } else {
        const avgLng = cities.reduce((s, c) => s + c.coordinates[0], 0) / cities.length
        const avgLat = cities.reduce((s, c) => s + c.coordinates[1], 0) / cities.length
        result.push({ id: `dyn-${cities[0].countryName.toLowerCase()}`, name: cities[0].countryName, flag: cities[0].flag, coordinates: [avgLng, avgLat], active: true, type: 'country', cities: visible.map(c => ({ id: c.id, name: c.cityName, places: [] })) })
      }
    })
    return result
  }, [destinations, hiddenCities])

  useEffect(() => { allCitiesRef.current = allCities }, [allCities])

  const handleDisconnect = () => {
    sessionStorage.removeItem('bucketmap-unlocked')
    setScreen('landing')
    setShowSettings(false)
    setSelectedCity(null)
    setSupabasePlaces([])
    setDestinations([])
    setChecked({})
    setHiddenCities([])
    setTr({ tx: 0, ty: 0, z: 1.2 })
  }

  /* ── Render ── */

  if (screen === 'landing') {
    return <LandingScreen
      onNewMap={() => {
        // Generate fresh user ID for new map
        localStorage.removeItem('bucketmap-user-id')
        localStorage.removeItem('bucketmap-onboarded')
        localStorage.removeItem('bucketmap-title')
        localStorage.removeItem('bucketmap-theme')
        setScreen('onboarding')
      }}
      onOpenMap={() => {
        setThemeKey(localStorage.getItem('bucketmap-theme') || 'aurora')
        setMapTitle(localStorage.getItem('bucketmap-title') || 'My BucketMap')
        setStoredPin(null)
        setUnlocked(true) // PIN was already verified in landing screen
        setScreen('map')
      }}
    />
  }

  if (screen === 'onboarding') {
    return <OnboardingFlow onComplete={(tk, title) => {
      setThemeKey(tk)
      setMapTitle(title)
      setStoredPin('')
      setUnlocked(true)
      setScreen('map')
    }} />
  }

  // PIN lock (only if PIN is set and session not unlocked)
  if (storedPin === null) {
    // Still loading profile
    return <div style={{ width: '100vw', height: '100svh', background: C.bg }} />
  }

  if (storedPin && !unlocked) {
    return <PinLockScreen C={C} mapTitle={mapTitle} storedPin={storedPin} onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div style={{ width: '100vw', height: '100svh', background: C.bg, overflow: 'hidden', position: 'relative' }}>
      {/* Title */}
      <div style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 500, pointerEvents: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: `${C.bg}d8`, border: `1px solid ${C.panelBorder}`, WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)', borderRadius: 50, padding: '8px 20px', marginBottom: 4 }}>
          <span style={{ color: C.primary, fontSize: 12 }}>✦</span>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(13px, 4vw, 20px)', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', background: `linear-gradient(90deg, ${C.soft}, ${C.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{mapTitle}</span>
          <span style={{ color: C.secondary, fontSize: 12 }}>✦</span>
        </div>
        <div style={{ fontSize: 10, color: C.mutedDim, fontStyle: 'italic', letterSpacing: '0.8px' }}>tap a city ♡</div>
      </div>

      {/* Settings button */}
      <button onClick={() => setShowSettings(true)} style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', right: 16, zIndex: 500, width: 40, height: 40, background: `${C.bg}d8`, border: `1px solid ${C.primaryDim}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}>
        <GearIcon color={C.muted} />
      </button>

      {/* Add destination */}
      <div style={{ position: 'absolute', bottom: 116, right: 80, zIndex: 500 }}>
        <button onClick={() => setShowAddDest(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${C.bg}d8`, border: `1px dashed ${C.primaryDim}`, borderRadius: 50, padding: '8px 16px', color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Destination
        </button>
      </div>
      <div style={{ position: 'absolute', bottom: 168, right: 16, zIndex: 500, display: showAddDest ? 'block' : 'none', width: 'min(380px, calc(100vw - 32px))', background: `${C.bg}f8`, border: `1px solid ${C.panelBorder}`, borderRadius: 16, WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)', overflow: 'hidden' }}>
        <AddDestinationForm C={C} onAdded={handleAddDestination} onCancel={() => setShowAddDest(false)} existingNames={existingNames} />
      </div>

      {/* Map */}
      <div ref={mapRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} style={{ width: '100%', height: '100%', overflow: 'hidden', touchAction: 'none', cursor: 'grab', userSelect: 'none' }}>
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 160 * tr.z, center: [20, 25] }} style={{ width: '100%', height: '100%', overflow: 'visible', transform: `translate(${tr.tx}px, ${tr.ty}px)`, willChange: 'transform' }}>
          <defs>
            <filter id="neon" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
              <feMerge><feMergeNode in="blur2" /><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g filter="url(#neon)">
            <Geographies geography={GEO_URL}>
              {({ geographies }) => geographies.map(geo => (
                <Geography key={geo.rsmKey} geography={geo} style={{ default: { fill: C.land, stroke: C.landBorder, strokeWidth: 0.6, outline: 'none' }, hover: { fill: C.land, stroke: C.landBorder, strokeWidth: 0.6, outline: 'none' }, pressed: { fill: C.land, stroke: C.landBorder, strokeWidth: 0.6, outline: 'none' } }} />
              ))}
            </Geographies>
          </g>
          {allCities.map(city => (
            <Marker key={city.id} coordinates={city.coordinates}>
              <g data-city-id={city.id} style={{ cursor: 'pointer' }} onClick={() => { if (!didDragRef.current) setSelectedCity(city) }} onPointerUp={() => { if (!didDragRef.current) setSelectedCity(city) }}>
                <circle r={18} fill="transparent" />
                <circle r={5.5} fill={C.primary} stroke={C.accent} strokeWidth={1.2} style={{ pointerEvents: 'none' }} />
                <circle r={2} fill={C.bg} style={{ pointerEvents: 'none' }} />
                <text textAnchor="middle" y={-12} style={{ fontFamily: 'Georgia, serif', fontSize: 12, fill: C.soft, pointerEvents: 'none', fontWeight: 700, paintOrder: 'stroke', stroke: C.bg, strokeWidth: 1.5 }}>
                  {city.flag} {city.name}
                </text>
              </g>
            </Marker>
          ))}
        </ComposableMap>
      </div>

      <ZoomButtons C={C} onZoomIn={zoomIn} onZoomOut={zoomOut} />

      <SidePanel city={selectedCity} checked={checked} onToggle={handleToggle} onClose={() => setSelectedCity(null)} supabasePlaces={supabasePlaces} onDeleteDestination={handleDeleteDestination} onDeletePlace={handleDeletePlace} onAddPlace={handleAddPlace} onEditPlace={handleEditPlace} hiddenCities={hiddenCities} onHideCity={handleHideCity} C={C} />

      {showSettings && (
        <SettingsPanel C={C} userId={userId} onClose={() => { setShowSettings(false); setMapTitle(localStorage.getItem('bucketmap-title') || 'My BucketMap') }} onThemeChange={(key) => { setThemeKey(key); setMapTitle(localStorage.getItem('bucketmap-title') || 'My BucketMap') }} onDisconnect={handleDisconnect} />
      )}
    </div>
  )
}
