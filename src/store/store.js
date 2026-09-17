/**
 * Zustand store — stores compact analysis results, not full datasets.
 * Datasets store only sample (up to 5000 rows) + preview (50 rows) + analysis result.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { get, set, del } from 'idb-keyval';

const idbStorage = {
  getItem: async (name) => { const val = await get(name); return val || null; },
  setItem: async (name, value) => { await set(name, value); },
  removeItem: async (name) => { await del(name); },
};

export const useDataStore = create(persist(
  (set, get) => ({
    datasets: [],
    activeDatasetId: null,

    addDataset: (parsed) => {
      const id = parsed.id || uuidv4();
      const dataset = { ...parsed, id, createdAt: parsed.createdAt || new Date().toISOString() };
      set(s => ({ datasets: [...s.datasets, dataset], activeDatasetId: id }));
      return id;
    },

    setActiveDataset: (id) => set({ activeDatasetId: id }),

    getActiveDataset: () => {
      const { datasets, activeDatasetId } = get();
      return datasets.find(d => d.id === activeDatasetId) || null;
    },

    removeDataset: (id) => set(s => ({
      datasets: s.datasets.filter(d => d.id !== id),
      activeDatasetId: s.activeDatasetId === id ? null : s.activeDatasetId,
    })),

    clearAll: () => set({ datasets: [], activeDatasetId: null }),
  }),
  { name: 'ai-dashboard-data', storage: createJSONStorage(() => idbStorage) }
));

export const useDashboardStore = create(persist(
  (set, get) => ({
    dashboards: [],
    activeDashboardId: null,

    createDashboard: (datasetId, charts, layout, title = 'Untitled Dashboard', analysisResult = null) => {
      const id = uuidv4();
      const dashboard = {
        id,
        datasetId,
        title,
        charts,
        layout,
        analysisResult,
        filters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 2,
      };
      set(s => ({ dashboards: [...s.dashboards, dashboard], activeDashboardId: id }));
      return id;
    },

    updateDashboard: (id, updates) => set(s => ({
      dashboards: s.dashboards.map(d =>
        d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
      ),
    })),

    updateChart: (dashboardId, chartId, updates) => set(s => ({
      dashboards: s.dashboards.map(d =>
        d.id === dashboardId
          ? { ...d, charts: d.charts.map(c => c.id === chartId ? { ...c, ...updates } : c), updatedAt: new Date().toISOString() }
          : d
      ),
    })),

    addChart: (dashboardId, chart) => set(s => ({
      dashboards: s.dashboards.map(d =>
        d.id === dashboardId
          ? { ...d, charts: [...d.charts, { ...chart, id: uuidv4() }] }
          : d
      ),
    })),

    removeChart: (dashboardId, chartId) => set(s => ({
      dashboards: s.dashboards.map(d =>
        d.id === dashboardId
          ? { ...d, charts: d.charts.filter(c => c.id !== chartId) }
          : d
      ),
    })),

    setActiveDashboard: (id) => set({ activeDashboardId: id }),

    getActiveDashboard: () => {
      const { dashboards, activeDashboardId } = get();
      return dashboards.find(d => d.id === activeDashboardId) || null;
    },

    deleteDashboard: (id) => set(s => ({
      dashboards: s.dashboards.filter(d => d.id !== id),
      activeDashboardId: s.activeDashboardId === id ? null : s.activeDashboardId,
    })),
  }),
  { name: 'ai-dashboard-boards', storage: createJSONStorage(() => idbStorage) }
));

export const useTemplateStore = create(persist(
  (set) => ({
    templates: [],

    saveTemplate: (dashboard, meta) => {
      const template = {
        id: uuidv4(),
        ...meta,
        charts: dashboard.charts,
        layout: dashboard.layout,
        isPublic: meta.isPublic ?? true,
        tags: meta.tags || [],
        category: meta.category || 'General',
        useCount: 0,
        createdAt: new Date().toISOString(),
      };
      set(s => ({ templates: [...s.templates, template] }));
      return template;
    },

    incrementUse: (id) => set(s => ({
      templates: s.templates.map(t => t.id === id ? { ...t, useCount: t.useCount + 1 } : t),
    })),

    deleteTemplate: (id) => set(s => ({
      templates: s.templates.filter(t => t.id !== id),
    })),
  }),
  { name: 'ai-dashboard-templates', storage: createJSONStorage(() => idbStorage) }
));
