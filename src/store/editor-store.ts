"use client";

import { create } from "zustand";

import { MOCK_PROJECT } from "@/lib/editor/mock-project";
import type {
  CanvasObject,
  CanvasPage,
  EditorProject,
  PanelId,
  ToolId,
} from "@/types/editor";

export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 8;
const ZOOM_STEPS = [
  0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8,
] as const;
const HISTORY_LIMIT = 50;

/**
 * `fit` keeps the page scaled to the viewport (and re-fits on resize); any manual
 * zoom switches to `manual` and pins the value the user chose.
 */
export type ZoomMode = "fit" | "manual";

export interface EditorState {
  project: EditorProject;
  activePageId: string;
  selectedIds: string[];
  activeTool: ToolId;
  activePanel: PanelId | null;
  zoom: number;
  zoomMode: ZoomMode;
  /** Stage translation in screen px, driven by the hand tool. */
  pan: { x: number; y: number };
  past: EditorProject[];
  future: EditorProject[];

  setActiveTool: (tool: ToolId) => void;
  togglePanel: (panel: PanelId) => void;
  setPanel: (panel: PanelId | null) => void;

  setActivePage: (pageId: string) => void;

  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetZoom: () => void;
  setPan: (pan: { x: number; y: number }) => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  renameProject: (title: string) => void;
  updateObject: (id: string, patch: Partial<CanvasObject>) => void;
  removeSelected: () => void;

  undo: () => void;
  redo: () => void;
}

function clampZoom(zoom: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** Replaces the active page, returning a fresh project (never mutates in place). */
function withActivePage(
  project: EditorProject,
  activePageId: string,
  update: (page: CanvasPage) => CanvasPage,
): EditorProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    pages: project.pages.map((page) =>
      page.id === activePageId ? update(page) : page,
    ),
  };
}

/** Pushes the current project onto the undo stack and clears the redo stack. */
function commit(
  state: EditorState,
  next: EditorProject,
): Pick<EditorState, "project" | "past" | "future"> {
  return {
    project: next,
    past: [...state.past, state.project].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  project: MOCK_PROJECT,
  activePageId: MOCK_PROJECT.pages[0].id,
  selectedIds: [],
  activeTool: "select",
  activePanel: "frame",
  zoom: 1,
  zoomMode: "fit",
  pan: { x: 0, y: 0 },
  past: [],
  future: [],

  setActiveTool: (activeTool) => set({ activeTool }),

  togglePanel: (panel) =>
    set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),

  setPanel: (activePanel) => set({ activePanel }),

  setActivePage: (activePageId) =>
    set({ activePageId, selectedIds: [], zoomMode: "fit", pan: { x: 0, y: 0 } }),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom), zoomMode: "manual" }),

  zoomIn: () => {
    const { zoom } = get();
    const next = ZOOM_STEPS.find((step) => step > zoom + 0.001) ?? ZOOM_MAX;
    set({ zoom: clampZoom(next), zoomMode: "manual" });
  },

  zoomOut: () => {
    const { zoom } = get();
    const next =
      [...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001) ?? ZOOM_MIN;
    set({ zoom: clampZoom(next), zoomMode: "manual" });
  },

  zoomToFit: () => set({ zoomMode: "fit", pan: { x: 0, y: 0 } }),

  resetZoom: () => set({ zoom: 1, zoomMode: "manual", pan: { x: 0, y: 0 } }),

  setPan: (pan) => set({ pan }),

  select: (selectedIds) => set({ selectedIds }),

  toggleSelect: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((selected) => selected !== id)
        : [...state.selectedIds, id],
    })),

  clearSelection: () => set({ selectedIds: [] }),

  renameProject: (title) =>
    set((state) =>
      commit(state, {
        ...state.project,
        title,
        updatedAt: new Date().toISOString(),
      }),
    ),

  updateObject: (id, patch) =>
    set((state) =>
      commit(
        state,
        withActivePage(state.project, state.activePageId, (page) => ({
          ...page,
          objects: page.objects.map((object) =>
            object.id === id
              ? ({ ...object, ...patch } as CanvasObject)
              : object,
          ),
        })),
      ),
    ),

  removeSelected: () =>
    set((state) => {
      if (state.selectedIds.length === 0) return {};

      return {
        ...commit(
          state,
          withActivePage(state.project, state.activePageId, (page) => ({
            ...page,
            objects: page.objects.filter(
              (object) =>
                !state.selectedIds.includes(object.id) || object.locked,
            ),
          })),
        ),
        selectedIds: [],
      };
    }),

  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return {};

      return {
        project: previous,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future].slice(0, HISTORY_LIMIT),
        selectedIds: [],
      };
    }),

  redo: () =>
    set((state) => {
      const [next, ...rest] = state.future;
      if (!next) return {};

      return {
        project: next,
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: rest,
        selectedIds: [],
      };
    }),
}));

/**
 * The page currently open on the stage. Falls back to the first page so the
 * editor never renders an empty stage if `activePageId` goes stale.
 */
export function useActivePage(): CanvasPage {
  return useEditorStore(
    (state) =>
      state.project.pages.find((page) => page.id === state.activePageId) ??
      state.project.pages[0],
  );
}

export function useCanUndo() {
  return useEditorStore((state) => state.past.length > 0);
}

export function useCanRedo() {
  return useEditorStore((state) => state.future.length > 0);
}
