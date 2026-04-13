import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area,
  Treemap, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart
} from 'recharts';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber, PALETTES } from '../../utils/aiSuggester';

const COLORS = PALETTES.default;

export default function ChartWidget({ chart, data, title, onRemove, onEdit }) {
  if (!chart) return null;

  const content = () => {
    switch(chart.type) {
      case 'kpi': return <KPIWidget chart={chart} />;
      case 'bar': return <BarWidget chart={chart} data={data} />;
      case 'column': return <BarWidget chart={chart} data={data} />;
      case 'stacked-bar': return <StackedBarWidget chart={chart} data={data} />;
      case 'histogram': return <HistogramWidget chart={chart} data={data} />;
      case 'line': return <LineWidget chart={chart} data={data} />;
      case 'area': return <AreaWidget chart={chart} data={data} />;
      case 'step': return <StepWidget chart={chart} data={data} />;
      case 'pie': return <PieWidget chart={chart} data={data} />;
      case 'donut': return <DonutWidget chart={chart} data={data} />;
      case 'scatter': return <ScatterWidget chart={chart} data={data} />;
      case 'bubble': return <BubbleWidget chart={chart} data={data} />;
      case 'radar': return <RadarWidget chart={chart} data={data} />;
      case 'treemap': return <TreemapWidget chart={chart} data={data} />;
      case 'funnel': return <FunnelWidget chart={chart} data={data} />;
      case 'sankey': return <SankeyWidget chart={chart} data={data} />;
      case 'pareto': return <ParetoWidget chart={chart} data={data} />;
      case 'boxplot': return <BoxPlotWidget chart={chart} data={data} />;
      case 'heatmap': return <HeatmapWidget chart={chart} data={data} />;
      case 'table': return <TableWidget chart={chart} data={data} />;
      default: return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Unsupported chart type: {chart.type}</div>;
    }
  };

  return (
    <div className="card glass" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative', border: '1.5px solid rgba(99,102,241,0.15)', background: 'linear-gradient(135deg, rgba(30,45,69,0.4) 0%, rgba(30,45,69,0.2) 100%)', boxShadow: '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
      {/* Header */}
      {chart.type !== 'kpi' && (
        <div style={{ 
          padding: '14px 16px', 
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          background: 'linear-gradient(90deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.02) 100%)'
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.25px' }}>
            {title || chart.title}
          </h3>
          <div style={{ display: 'flex', gap: 8, opacity: 0.6, transition: 'opacity 0.2s' }} className="chart-actions">
            {onEdit && <button className="btn-ghost btn-sm" onClick={onEdit} style={{ padding: '2px 8px' }}>Edit</button>}
            {onRemove && <button className="btn-ghost btn-sm btn-danger" onClick={onRemove} style={{ padding: '2px 8px' }}>✕</button>}
          </div>
        </div>
      )}

      {chart.type === 'kpi' && (
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 20, opacity: 0.5, transition: 'opacity 0.2s' }} className="chart-actions">
          {onEdit && <button className="btn-ghost btn-sm" onClick={onEdit} style={{ padding: '2px 8px' }}>Edit</button>}
          {onRemove && <button className="btn-ghost btn-sm btn-danger" onClick={onRemove} style={{ padding: '2px 8px' }}>✕</button>}
        </div>
      )}
      
      {/* Content */}
      <div style={{ flex: 1, padding: chart.type === 'kpi' || chart.type === 'table' ? 0 : 16, minHeight: 0, overflow: chart.type === 'table' ? 'auto' : 'hidden', position: 'relative' }}>
        {content()}
      </div>
    </div>
  );
}

// ============== Specific Chart Components ==============

function KPIWidget({ chart }) {
  const isPositive = chart.trend !== undefined ? chart.trend >= 0 : true;
  const trendPercent = chart.trend ? `${chart.trend > 0 ? '+' : ''}${chart.trend}%` : '+5.2%';
  const bgColor = chart.bgColor || 'rgba(99,102,241,0.1)';
  const accentColor = chart.accentColor || 'rgba(99,102,241,0.8)';
  
  return (
    <div style={{ 
      position: 'relative',
      padding: '18px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between', 
      height: '100%',
      background: `linear-gradient(135deg, ${bgColor} 0%, rgba(30,45,69,0.3) 100%)`,
      borderRadius: '8px',
      border: `1.5px solid rgba(99,102,241,0.25)`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Decorative Background */}
      <div style={{
        position: 'absolute', top: -10, right: -10, width: 50, height: 50,
        background: accentColor, borderRadius: '50%', filter: 'blur(25px)', opacity: 0.4,
        animation: 'pulse-glow 5s infinite ease-in-out'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0.85, flexShrink: 0
          }}>
            <Target size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', fontWeight: 700 }}>
              {chart.title || 'Metric'}
            </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 2, 
          padding: '3px 6px', borderRadius: 12, 
          background: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
          border: isPositive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(244,63,94,0.3)',
          color: isPositive ? '#10b981' : '#f43f5e', 
          fontSize: 9, fontWeight: 700,
          zIndex: 1, flexShrink: 0
        }}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {trendPercent}
        </div>
      </div>
      
      {/* Main Value */}
      <div style={{ zIndex: 1, marginBottom: 10 }}>
        <div style={{ 
          fontSize: 24, fontWeight: 900, 
          color: '#ffffff',
          lineHeight: 1, letterSpacing: '-0.8px'
        }}>
          {formatNumber(chart.value, chart.format)}
        </div>
      </div>
      
      {/* Stats Footer */}
      <div style={{ 
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', 
        paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)',
        zIndex: 1, gap: 8, flexWrap: 'wrap'
      }}>
        {chart.showSum && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#10b981' }}>Σ</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#10b981' }}>{formatNumber(chart.value, chart.format)}</div>
          </div>
        )}
        {chart.showAvg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#06b6d4' }}>∅</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#06b6d4' }}>{formatNumber(chart.avg, chart.format)}</div>
          </div>
        )}
        {chart.showMax && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#f59e0b' }}>↑</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#f59e0b' }}>{formatNumber(chart.max, chart.format)}</div>
          </div>
        )}
        {chart.showMin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#f43f5e' }}>↓</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#f43f5e' }}>{formatNumber(chart.min, chart.format)}</div>
          </div>
        )}
        {chart.showCount && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#8b5cf6' }}>#</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#8b5cf6' }}>{formatNumber(chart.count, chart.format)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function BarWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
          <XAxis dataKey={chart.xKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} />
          <RechartsTooltip 
            cursor={{ fill: 'rgba(99,102,241,0.1)' }} 
            contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} 
          />
          <Bar dataKey={chart.yKey} fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={32} animationDuration={800} />
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(99,102,241,0.8)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.4)" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
          <XAxis dataKey={chart.xKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} />
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <Line type="monotone" dataKey={chart.yKey} stroke="rgba(6,182,212,0.8)" strokeWidth={3} dot={{ r: 4, fill: 'rgba(6,182,212,0.8)', strokeWidth: 2, stroke: 'rgba(6,182,212,0.3)' }} activeDot={{ r: 6, fill: 'rgba(6,182,212,1)' }} animationDuration={800} strokeLinecap="round" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={1.5} dataKey={chart.valueKey} nameKey={chart.nameKey} animationDuration={800}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
                stroke="rgba(0,0,0,0.3)" 
                strokeWidth={0.5}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
              />
            ))}
          </Pie>
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScatterWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ScatterChart margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
          <XAxis dataKey={chart.xKey} type="number" name={chart.xKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis dataKey={chart.yKey} type="number" name={chart.yKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <RechartsTooltip 
            cursor={{ strokeDasharray: '3 3', stroke: 'rgba(99,102,241,0.3)' }} 
            contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} 
          />
          <Scatter name="Data" data={chartData} fill="rgba(244,63,94,0.6)" stroke="rgba(244,63,94,0.3)" isAnimationActive animationDuration={800} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============== NEW CHART COMPONENTS ==============

function StackedBarWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  const yKeys = chart.yKeys || [];

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
          <XAxis dataKey={chart.xKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v, 'K')} />
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <Legend />
          {yKeys.map((key, idx) => (
            <Bar key={key} dataKey={key} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[6, 6, 0, 0]} animationDuration={800} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HistogramWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
          <XAxis dataKey={chart.xKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <Bar dataKey={chart.yKey} fill="rgba(139,92,246,0.7)" radius={[6, 6, 0, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AreaWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
          <XAxis dataKey={chart.xKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <Area type="monotone" dataKey={chart.yKey} fill="rgba(16,185,129,0.3)" stroke="rgba(16,185,129,0.8)" strokeWidth={2} animationDuration={800} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StepWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
          <XAxis dataKey={chart.xKey} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <Line type="stepAfter" dataKey={chart.yKey} stroke="rgba(245,158,11,0.8)" strokeWidth={3} dot={{ r: 4, fill: 'rgba(245,158,11,0.8)' }} activeDot={{ r: 6 }} animationDuration={800} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  const innerRadius = chart.innerRadius || 45;
  const outerRadius = chart.outerRadius || 100;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={1.5} dataKey={chart.valueKey} nameKey={chart.nameKey} animationDuration={800}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={0.5}
              />
            ))}
          </Pie>
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function BubbleWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 200);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ScatterChart margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
          <XAxis dataKey={chart.xKey} type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis dataKey={chart.yKey} type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <Scatter name="Bubble" data={chartData} fill="rgba(107,114,255,0.6)" shape="circle" 
            isAnimationActive animationDuration={800}
            onClick={(e) => console.log(e)}
          />
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function RadarWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);
  const dataKeys = chart.dataKeys || [];

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="rgba(99,102,241,0.2)" />
          <PolarAngleAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
          <PolarRadiusAxis stroke="var(--text-muted)" fontSize={11} />
          {dataKeys.map((key, idx) => (
            <Radar key={key} name={key} dataKey={key} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.4} animationDuration={800} />
          ))}
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TreemapWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <Treemap data={chartData} dataKey={chart.dataKey} stroke="#fff" fill="rgba(99,102,241,0.5)" animationDuration={800}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20, gap: 8 }}>
        {chartData.map((entry, index) => (
          <div 
            key={index} 
            style={{ 
              width: `${((chartData.length - index) / chartData.length * 100)}%`,
              padding: '12px 16px',
              background: COLORS[index % COLORS.length],
              borderRadius: 6,
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              textAlign: 'center',
              transition: 'all 0.3s',
              cursor: 'pointer',
              opacity: 0.85,
              marginX: 'auto'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {entry.name}: {entry[chart.dataKey]}
          </div>
        ))}
      </div>
    </div>
  );
}

function SankeyWidget({ chart, data }) {
  if (!chart.data || !chart.data.nodes || !chart.data.links) return null;
  
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Sankey Flow Diagram</div>
        <div style={{ fontSize: 12 }}>
          Nodes: {chart.data.nodes?.length || 0} | Links: {chart.data.links?.length || 0}
        </div>
        <svg style={{ width: '100%', height: 200, marginTop: 12 }} viewBox="0 0 300 200">
          <g stroke="rgba(99,102,241,0.3)" strokeWidth="1">
            {chart.data.links?.map((link, i) => (
              <line key={i} x1="20" y1={50 + i * 20} x2="280" y2={50 + i * 20} opacity="0.6" />
            ))}
          </g>
          <text x="10" y="195" fontSize="11" fill="var(--text-muted)">Flow relationships</text>
        </svg>
      </div>
    </div>
  );
}

function ParetoWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 500);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" vertical={false} />
          <XAxis dataKey={Object.keys(chartData[0] || {})[0]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,20,46,0.95)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <Bar dataKey={Object.keys(chartData[0] || {})[1]} yAxisId="left" fill="rgba(99,102,241,0.7)" />
          <Line yAxisId="right" type="monotone" dataKey="cumulativePercent" stroke="rgba(245,158,11,0.8)" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function BoxPlotWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const boxData = (chart.data || []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        {boxData.map((box, i) => (
          <div key={i} style={{ marginBottom: 16, padding: 12, background: 'rgba(99,102,241,0.1)', borderRadius: 6 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{box.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
              <div>Min: {formatNumber(box.min)}</div>
              <div>Q1: {formatNumber(box.q1)}</div>
              <div>Median: {formatNumber(box.median)}</div>
              <div>Q3: {formatNumber(box.q3)}</div>
              <div colSpan={2}>Max: {formatNumber(box.max)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapWidget({ chart, data }) {
  if (!chart.data && !data) return null;
  const chartData = (chart.data || data).slice(0, 100);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ display: 'grid', gap: 8, width: '100%' }}>
        {chartData.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, minWidth: 80, fontWeight: 500, color: 'var(--text-secondary)' }}>{row[chart.xKey]}</div>
            <div style={{
              flex: 1,
              height: 24,
              background: `rgba(99,102,241,${(row.intensity || 50) / 100})`,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: (row.intensity || 50) > 50 ? '#fff' : 'var(--text-primary)'
            }}>
              {formatNumber(row.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableWidget({ chart, data }) {
  const chartData = chart.data || data || [];
  const cols = chart.columns || (chartData[0] ? Object.keys(chartData[0]).slice(0, 8) : []);
  
  if (!chartData.length) return <div style={{ padding: 20 }}>No data</div>;
  
  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
        <thead style={{ position: 'sticky', top: 0, background: 'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.04) 100%)', zIndex: 1, borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ 
                padding: '11px 16px', 
                fontWeight: 600, 
                color: 'var(--text-secondary)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                borderRight: '1px solid rgba(99,102,241,0.08)'
              }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.slice(0, 50).map((row, i) => (
            <tr 
              key={i} 
              style={{ 
                borderBottom: '1px solid rgba(99,102,241,0.08)',
                transition: 'background-color 0.15s',
                '&:hover': { background: 'rgba(99,102,241,0.05)' }
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {cols.map(c => (
                <td 
                  key={c} 
                  style={{ 
                    padding: '9px 16px', 
                    color: 'var(--text-primary)', 
                    whiteSpace: 'nowrap', 
                    maxWidth: 150, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontSize: 11,
                    borderRight: '1px solid rgba(99,102,241,0.04)'
                  }}
                >
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
