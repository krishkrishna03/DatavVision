import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area,
} from 'recharts';
import { Target, TrendingUp, TrendingDown, Pencil, X } from 'lucide-react';
import { formatNumber, PALETTES } from '../../utils/aiSuggester';

const COLORS = PALETTES.default;

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid rgba(99,102,241,0.3)',
  background: 'rgba(17,24,39,0.95)',
  color: '#f1f5f9',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  padding: '8px 12px',
  backdropFilter: 'blur(8px)',
};

const axisLabelStyle = { fontSize: 11, fill: '#94a3b8', fontWeight: 500 };

export default function ChartWidget({ chart, data, title, onRemove, onEdit }) {
  if (!chart) return null;

  const content = () => {
    switch(chart.type) {
      case 'kpi': return <KPIWidget chart={chart} />;
      case 'bar': return <BarWidget chart={chart} data={data} />;
      case 'stacked-bar': return <StackedBarWidget chart={chart} data={data} />;
      case 'line': return <LineWidget chart={chart} data={data} />;
      case 'area': return <AreaWidget chart={chart} data={data} />;
      case 'pie': return <PieWidget chart={chart} data={data} />;
      case 'donut': return <DonutWidget chart={chart} data={data} />;
      case 'scatter': return <ScatterWidget chart={chart} data={data} />;
      case 'table': return <TableWidget chart={chart} data={data} />;
      default: return <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Unsupported chart type: {chart.type}</div>;
    }
  };

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
    }}>
      {chart.type !== 'kpi' && (
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(99,102,241,0.04)',
        }}>
          <h3 style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0,
          }}>
            {title || chart.title}
          </h3>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {onEdit && (
              <button onClick={onEdit} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 4, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <Pencil size={13} />
              </button>
            )}
            {onRemove && (
              <button onClick={onRemove} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 4, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {chart.type === 'kpi' && (
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 20 }}>
          {onEdit && (
            <button onClick={onEdit} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 4, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}>
              <Pencil size={12} />
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 4, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}>
              <X size={13} />
            </button>
          )}
        </div>
      )}

      <div style={{
        flex: 1, padding: chart.type === 'kpi' || chart.type === 'table' ? 0 : '8px 16px 16px 16px',
        minHeight: 0, overflow: chart.type === 'table' ? 'auto' : 'hidden', position: 'relative',
      }}>
        {content()}
      </div>
    </div>
  );
}

// ============== KPI Widget ==============

function KPIWidget({ chart }) {
  const isPositive = chart.trend !== undefined ? chart.trend >= 0 : true;
  const trendPercent = chart.trend ? `${chart.trend > 0 ? '+' : ''}${chart.trend}%` : '+5.2%';
  const accentColor = chart.accentColor || 'rgba(99,102,241,0.8)';

  return (
    <div style={{
      position: 'relative', padding: '16px 20px', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', height: '100%',
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
        background: accentColor, borderRadius: '4px 0 0 4px',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Target size={14} color={accentColor} />
          </div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {chart.title || 'Metric'}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          padding: '3px 8px', borderRadius: 12,
          background: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
          color: isPositive ? '#34d399' : '#fb7185',
          fontSize: 10, fontWeight: 600, flexShrink: 0,
        }}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {trendPercent}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
          {formatNumber(chart.value, chart.format)}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        paddingTop: 8, borderTop: '1px solid var(--border-subtle)',
      }}>
        {chart.showAvg && <KpiSubStat label="Avg" value={formatNumber(chart.avg, chart.format)} color="#22d3ee" />}
        {chart.showMax && <KpiSubStat label="Max" value={formatNumber(chart.max, chart.format)} color="#fbbf24" />}
        {chart.showMin && <KpiSubStat label="Min" value={formatNumber(chart.min, chart.format)} color="#fb7185" />}
        {chart.showCount && <KpiSubStat label="Count" value={formatNumber(chart.count, 'raw')} color="#a78bfa" />}
      </div>
    </div>
  );
}

function KpiSubStat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

// ============== Chart Components ==============

function BarWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <BarChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
        <XAxis dataKey={chart.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(99,102,241,0.15)' }} label={{ value: chart.xKey, position: 'insideBottom', offset: -16, style: axisLabelStyle }} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} label={{ value: chart.yKey, angle: -90, position: 'insideLeft', offset: 10, style: axisLabelStyle }} />
        <RechartsTooltip cursor={{ fill: 'rgba(99,102,241,0.08)' }} contentStyle={tooltipStyle} />
        <Bar dataKey={chart.yKey} fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function StackedBarWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  const yKeys = chart.yKeys || [];
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <BarChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
        <XAxis dataKey={chart.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(99,102,241,0.15)' }} label={{ value: chart.xKey, position: 'insideBottom', offset: -16, style: axisLabelStyle }} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} label={{ value: yKeys.join(' & '), angle: -90, position: 'insideLeft', offset: 10, style: axisLabelStyle }} />
        <RechartsTooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />
        {yKeys.map((key, idx) => (
          <Bar key={key} dataKey={key} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} animationDuration={600} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <LineChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
        <XAxis dataKey={chart.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(99,102,241,0.15)' }} label={{ value: chart.xKey, position: 'insideBottom', offset: -16, style: axisLabelStyle }} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} label={{ value: chart.yKey, angle: -90, position: 'insideLeft', offset: 10, style: axisLabelStyle }} />
        <RechartsTooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey={chart.yKey} stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, fill: '#06b6d4' }} activeDot={{ r: 5 }} animationDuration={600} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
        <XAxis dataKey={chart.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(99,102,241,0.15)' }} label={{ value: chart.xKey, position: 'insideBottom', offset: -16, style: axisLabelStyle }} />
        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} label={{ value: chart.yKey, angle: -90, position: 'insideLeft', offset: 10, style: axisLabelStyle }} />
        <RechartsTooltip contentStyle={tooltipStyle} />
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(16,185,129,0.4)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.02)" />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={chart.yKey} fill="url(#areaGrad)" stroke="#10b981" strokeWidth={2} animationDuration={600} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PieWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={1.5} dataKey={chart.valueKey} nameKey={chart.nameKey} animationDuration={600}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(10,13,20,0.5)" strokeWidth={1} />
          ))}
        </Pie>
        <RechartsTooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function DonutWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={1.5} dataKey={chart.valueKey} nameKey={chart.nameKey} animationDuration={600}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(10,13,20,0.5)" strokeWidth={1} />
          ))}
        </Pie>
        <RechartsTooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ScatterWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <ScatterChart margin={{ top: 16, right: 16, left: 8, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
        <XAxis dataKey={chart.xKey} type="number" name={chart.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(99,102,241,0.15)' }} label={{ value: chart.xKey, position: 'insideBottom', offset: -16, style: axisLabelStyle }} />
        <YAxis dataKey={chart.yKey} type="number" name={chart.yKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} label={{ value: chart.yKey, angle: -90, position: 'insideLeft', offset: 10, style: axisLabelStyle }} />
        <RechartsTooltip cursor={{ strokeDasharray: '3 3', stroke: 'rgba(99,102,241,0.3)' }} contentStyle={tooltipStyle} />
        <Scatter name="Data" data={chartData} fill="rgba(244,63,94,0.6)" stroke="rgba(244,63,94,0.3)" animationDuration={600} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function TableWidget({ chart, data }) {
  const chartData = chart.data || data || [];
  const cols = chart.columns || (chartData[0] ? Object.keys(chartData[0]).slice(0, 8) : []);
  if (!chartData.length) return <div style={{ padding: 20, color: '#64748b' }}>No data</div>;
  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1, borderBottom: '1px solid var(--border-default)' }}>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px', borderRight: '1px solid var(--border-subtle)' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.slice(0, 50).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {cols.map(c => (
                <td key={c} style={{ padding: '8px 14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12, borderRight: '1px solid var(--border-subtle)' }}>
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
