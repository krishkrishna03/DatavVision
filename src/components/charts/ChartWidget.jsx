import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import { formatNumber, PALETTES } from '../../utils/aiSuggester';

const COLORS = PALETTES.default;

export default function ChartWidget({ chart, data, title, onRemove, onEdit }) {
  if (!chart) return null;

  const content = () => {
    switch(chart.type) {
      case 'kpi': return <KPIWidget chart={chart} />;
      case 'bar': return <BarWidget chart={chart} data={data} />;
      case 'line': return <LineWidget chart={chart} data={data} />;
      case 'pie': return <PieWidget chart={chart} data={data} />;
      case 'scatter': return <ScatterWidget chart={chart} data={data} />;
      case 'table': return <TableWidget chart={chart} data={data} />;
      default: return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Unsupported chart type</div>;
    }
  };

  return (
    <div className="card glass" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)'
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title || chart.title}
        </h3>
        <div style={{ display: 'flex', gap: 8, opacity: 0.5, transition: 'opacity 0.2s' }} className="chart-actions">
          {onEdit && <button className="btn-ghost btn-sm" onClick={onEdit} style={{ padding: '2px 8px' }}>Edit</button>}
          {onRemove && <button className="btn-ghost btn-sm btn-danger" onClick={onRemove} style={{ padding: '2px 8px' }}>✕</button>}
        </div>
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, padding: chart.type === 'kpi' || chart.type === 'table' ? 0 : 16, minHeight: 0, overflow: chart.type === 'table' ? 'auto' : 'hidden' }}>
        {content()}
      </div>
    </div>
  );
}

// ============== Specific Chart Components ==============

function KPIWidget({ chart }) {
  const trend = chart.trend || 0;
  const isPositive = trend >= 0;
  
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
      <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-accent)', lineHeight: 1 }}>
        {formatNumber(chart.value, chart.format)}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
        Avg: {formatNumber(chart.avg, chart.format)} / Max: {formatNumber(chart.max, chart.format)}
      </div>
    </div>
  );
}

function BarWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey={chart.xKey} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} />
          <RechartsTooltip cursor={{ fill: 'rgba(99,102,241,0.1)' }} contentStyle={{ borderRadius: 8, border: 'none', background: 'var(--bg-elevated)', color: '#fff' }} />
          <Bar dataKey={chart.yKey} fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey={chart.xKey} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} />
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', background: 'var(--bg-elevated)', color: '#fff' }} />
          <Line type="monotone" dataKey={chart.yKey} stroke="var(--accent-cyan)" strokeWidth={3} dot={{ r: 3, fill: 'var(--accent-cyan)' }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey={chart.valueKey} nameKey={chart.nameKey}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
            ))}
          </Pie>
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', background: 'var(--bg-elevated)', color: '#fff' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScatterWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey={chart.xKey} type="number" name={chart.xKey} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis dataKey={chart.yKey} type="number" name={chart.yKey} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 8, border: 'none', background: 'var(--bg-elevated)', color: '#fff' }} />
          <Scatter name="Data" data={chartData} fill="var(--accent-rose)" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function TableWidget({ chart, data }) {
  const chartData = chart.data || data || [];
  const cols = chart.columns || (chartData[0] ? Object.keys(chartData[0]).slice(0, 8) : []);
  
  if (!chartData.length) return <div style={{ padding: 20 }}>No data</div>;
  
  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1 }}>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-default)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.slice(0, 50).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {cols.map(c => (
                <td key={c} style={{ padding: '8px 16px', color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {String(row[c] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
