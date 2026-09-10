import { useMemo } from 'react';
import { Filter, Calendar, X } from 'lucide-react';
import { getUniqueValues, getDateRange } from '../../utils/chartDataProcessor';

export default function SlicerPanel({ dataset, filters, setFilters, timeline, setTimeline, onReset }) {
  const schema = dataset?.schema || [];
  const rows = dataset?.data || [];

  const categoryCols = useMemo(
    () => schema.filter((c) => c.type === 'category' || c.type === 'text'),
    [schema]
  );
  const dateCols = useMemo(() => schema.filter((c) => c.type === 'date'), [schema]);

  const defaultDateRange = useMemo(
    () => (dateCols.length > 0 ? getDateRange(rows, dateCols[0].key) : null),
    [rows, dateCols]
  );

  const categoryColsWithValues = useMemo(
    () =>
      categoryCols.slice(0, 6).map((col) => ({
        ...col,
        _values: getUniqueValues(rows, col.key, 20),
      })),
    [categoryCols, rows]
  );

  const toggleFilter = (col, value) => {
    const current = filters[col] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
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
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: 24,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Filters & Timeline
          </span>
          {activeCount > 0 && (
            <span
              className="badge badge-primary"
              style={{ marginLeft: 4 }}
            >
              {activeCount} active
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onReset}
            style={{ fontSize: 12, gap: 4 }}
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      {/* Timeline */}
      {dateCols.length > 0 && defaultDateRange && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            <Calendar size={13} /> Timeline ({dateCols[0].key})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={timeline?.start || defaultDateRange.start}
              onChange={(e) =>
                setTimeline({
                  column: dateCols[0].key,
                  start: e.target.value,
                  end: timeline?.end || defaultDateRange.end,
                })
              }
              style={{
                padding: '8px 12px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 13,
                colorScheme: 'dark',
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
            <input
              type="date"
              value={timeline?.end || defaultDateRange.end}
              onChange={(e) =>
                setTimeline({
                  column: dateCols[0].key,
                  start: timeline?.start || defaultDateRange.start,
                  end: e.target.value,
                })
              }
              style={{
                padding: '8px 12px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 13,
                colorScheme: 'dark',
              }}
            />
            {timeline && (timeline.start !== defaultDateRange.start || timeline.end !== defaultDateRange.end) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setTimeline(null)}
                style={{ fontSize: 11, gap: 4, padding: '4px 8px' }}
              >
                <X size={11} /> Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Slicers */}
      {categoryCols.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          {categoryColsWithValues.map((col) => {
            const selected = filters[col.key] || [];
            if (col._values && col._values.length === 0) return null;

            return (
              <SlicerDropdown
                key={col.key}
                column={col.key}
                values={col._values || []}
                selected={selected}
                onToggle={(v) => toggleFilter(col.key, v)}
                onClear={() => clearFilter(col.key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SlicerDropdown({ column, values, selected, onToggle, onClear }) {
  return (
    <div
      style={{
        background: 'var(--bg-base)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {column}
        </span>
        {selected.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            Clear
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
        {values.map((v) => {
          const isSelected = selected.includes(v);
          return (
            <label
              key={v}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 6px',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-primary)',
                background: isSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(v)}
                style={{
                  width: 14,
                  height: 14,
                  cursor: 'pointer',
                  accentColor: 'var(--accent-primary)',
                }}
              />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {v}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
