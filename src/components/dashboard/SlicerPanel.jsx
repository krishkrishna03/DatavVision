import { useMemo, useState } from 'react';
import { Filter, Calendar, X, ChevronDown } from 'lucide-react';
import { getUniqueValues, getDateRange } from '../../utils/chartDataProcessor';

export default function SlicerPanel({ dataset, filters, setFilters, timeline, setTimeline, onReset }) {
  const schema = dataset?.schema || [];
  const rows = dataset?.data || [];

  const dateCols = useMemo(() => schema.filter((c) => c.type === 'date'), [schema]);

  const defaultDateRange = useMemo(
    () => (dateCols.length > 0 ? getDateRange(rows, dateCols[0].key) : null),
    [rows, dateCols]
  );

  const slicerCols = useMemo(() => {
    const categoryCols = schema.filter((c) => c.type === 'category' || c.type === 'text');
    return categoryCols
      .map((col) => ({ ...col, _values: getUniqueValues(rows, col.key, 12) }))
      .filter((col) => col._values && col._values.length >= 2 && col._values.length <= 12)
      .slice(0, 3);
  }, [schema, rows]);

  const toggleFilter = (col, value) => {
    const current = filters[col] || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilters({ ...filters, [col]: next });
  };

  const clearFilter = (col) => {
    const next = { ...filters };
    delete next[col];
    setFilters(next);
  };

  const activeCount =
    Object.values(filters).filter((v) => Array.isArray(v) && v.length > 0).length +
    (timeline && timeline.start && timeline.end ? 1 : 0);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', padding: '10px 16px', marginBottom: 16,
      position: 'relative', zIndex: 1000, backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Filter size={14} color="var(--accent-primary)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Filters
        </span>
        {activeCount > 0 && (
          <span className="badge badge-primary" style={{ marginLeft: 2, fontSize: 10 }}>{activeCount}</span>
        )}
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', flexShrink: 0 }} />

      {dateCols.length > 0 && defaultDateRange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Calendar size={13} color="var(--text-muted)" />
          <input type="date" value={timeline?.start || defaultDateRange.start}
            onChange={(e) => setTimeline({ column: dateCols[0].key, start: e.target.value, end: timeline?.end || defaultDateRange.end })}
            style={{ padding: '5px 8px', background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, colorScheme: 'dark', width: 130 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→</span>
          <input type="date" value={timeline?.end || defaultDateRange.end}
            onChange={(e) => setTimeline({ column: dateCols[0].key, start: timeline?.start || defaultDateRange.start, end: e.target.value })}
            style={{ padding: '5px 8px', background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, colorScheme: 'dark', width: 130 }} />
          {timeline && (timeline.start !== defaultDateRange.start || timeline.end !== defaultDateRange.end) && (
            <button onClick={() => setTimeline(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {slicerCols.map((col) => (
        <SlicerDropdown key={col.key} column={col.key} values={col._values || []} selected={filters[col.key] || []} onToggle={(v) => toggleFilter(col.key, v)} onClear={() => clearFilter(col.key)} />
      ))}

      {activeCount > 0 && (
        <button onClick={onReset} style={{
          background: 'none', border: '1px solid var(--border-default)', borderRadius: 6,
          color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
          padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}>
          <X size={11} /> Clear All
        </button>
      )}
    </div>
  );
}

function SlicerDropdown({ column, values, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
        background: selected.length > 0 ? 'rgba(99,102,241,0.12)' : 'var(--bg-base)',
        border: selected.length > 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-default)',
        borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer',
        fontWeight: 500, transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{column}</span>
        {selected.length > 0 && (
          <span className="badge badge-primary" style={{ fontSize: 9, padding: '1px 5px' }}>{selected.length}</span>
        )}
        <ChevronDown size={12} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: 180, maxHeight: 240, overflowY: 'auto',
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 10001,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{column}</span>
              {selected.length > 0 && (
                <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--text-accent)', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>Clear</button>
              )}
            </div>
            {values.map((v) => {
              const isSelected = selected.includes(v);
              return (
                <label key={v} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 5,
                  cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)',
                  background: isSelected ? 'rgba(99,102,241,0.12)' : 'transparent', transition: 'background 0.15s',
                }}>
                  <input type="checkbox" checked={isSelected} onChange={() => onToggle(v)} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent-primary)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
