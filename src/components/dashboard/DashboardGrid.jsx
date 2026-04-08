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
      cols={12}
      rowHeight={100}
      width={1200}
      onLayoutChange={onLayoutChange}
      isDraggable
      isResizable
    >
      {charts.map((chart) => (
        <div key={chart.id}>
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