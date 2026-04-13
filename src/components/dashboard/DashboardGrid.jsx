import React, { useMemo } from "react";
import GridLayout, { WidthProvider } from "react-grid-layout/legacy";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import ChartWidget from "../charts/ChartWidget";

const ResponsiveGridLayout = WidthProvider(GridLayout);

export default function DashboardGrid({
  charts = [],
  layout = [],
  data = [],
  onLayoutChange,
  onRemoveChart,
  onEditChart,
}) {
  const gridLayout = useMemo(() => layout, [layout]);

  if (!charts.length) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        No charts to display. Upload a dataset.
      </div>
    );
  }

  return (
    <ResponsiveGridLayout
      className="layout"
      layout={gridLayout}
      cols={2}
      rowHeight={260}
      onLayoutChange={onLayoutChange}
      isDraggable
      isResizable
      containerPadding={[24, 24]}
      margin={[16, 16]}
      compactType="vertical"
      preventCollision={false}
      useCSSTransforms={true}
    >
      {charts.map((chart) => (
        <div key={chart.id} style={{ borderRadius: 12, overflow: 'hidden' }}>
          <ChartWidget
            chart={chart}
            data={data}
            onRemove={() => onRemoveChart(chart.id)}
            onEdit={() => onEditChart(chart.id)}
          />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}