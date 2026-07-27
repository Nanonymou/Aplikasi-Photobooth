"use client";

import { create } from "zustand";

import { MOCK_PROJECT } from "@/lib/editor/mock-project";
import type {
  CanvasObject,
  CanvasPage,
  EditorProject,
  PageBackground,
  PanelId,
  PhotoSlotObject,
  SlotPhoto,
  ToolId,
} from "@/types/editor";

export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 8;
const ZOOM_STEPS = [
  0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8,
] as const;
const HISTORY_LIMIT = 50;

/** Nudge applied to a new object that would land exactly on an existing one. */
const CASCADE_OFFSET = 48;
const MAX_CASCADE_STEPS = 12;

/**
 * `fit` keeps the page scaled to the viewport (and re-fits on resize); any manual
 * zoom switches to `manual` and pins the value the user chose.
 */
export type ZoomMode = "fit" | "manual";

/**
 * Autosave state.
 *
 * `idle` means nothing has changed since the editor opened — distinct from
 * `saved`, which means a write actually happened.
 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Layer moves, named from the viewer's side of the canvas: "front" is the top of
 * the stack (the end of `page.objects`), "back" is the bottom (index 0).
 */
export type ReorderMode = "front" | "forward" | "backward" | "back";

/** A patch aimed at one object, used for batched multi-object edits. */
export interface ObjectUpdate {
  id: string;
  patch: Partial<CanvasObject>;
}

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
  /**
   * Project state captured when a continuous gesture (a drag, a resize) starts,
   * so the whole gesture collapses into a single undo step.
   */
  interactionSnapshot: EditorProject | null;

  saveStatus: SaveStatus;
  /** ISO timestamp of the last successful write, or null if none yet. */
  lastSavedAt: string | null;
  /**
   * False until the stored project has been read. Autosave stays quiet until
   * then, so an empty first render can never overwrite a real saved project.
   */
  hydrated: boolean;

  hydrateProject: (project: EditorProject | null) => void;
  setSaveStatus: (status: SaveStatus, savedAt?: string) => void;

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
  updateObjects: (updates: ObjectUpdate[]) => void;
  addObject: (object: CanvasObject) => void;
  replaceSlots: (slots: PhotoSlotObject[]) => void;
  setPageBackground: (background: PageBackground) => void;
  /** Replaces the active page's size, background and contents wholesale. */
  applyPageContent: (content: {
    name: string;
    width: number;
    height: number;
    background: PageBackground;
    objects: CanvasObject[];
  }) => void;
  setSlotPhoto: (slotId: string, photo: SlotPhoto | null) => void;
  /** Fills the first empty slot on the page; returns its id, or null if full. */
  fillNextEmptySlot: (src: string) => string | null;
  moveObject: (id: string, toIndex: number) => void;
  reorderSelection: (mode: ReorderMode) => void;
  removeSelected: () => void;

  beginInteraction: () => void;
  endInteraction: () => void;

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

/**
 * Reorders `objects` so the selected ids move one step (or all the way) through
 * the stack, keeping the selection's own relative order intact.
 */
function reorderObjects(
  objects: CanvasObject[],
  ids: string[],
  mode: ReorderMode,
): CanvasObject[] {
  const isSelected = (object: CanvasObject) => ids.includes(object.id);

  if (mode === "front") {
    return [...objects.filter((o) => !isSelected(o)), ...objects.filter(isSelected)];
  }

  if (mode === "back") {
    return [...objects.filter(isSelected), ...objects.filter((o) => !isSelected(o))];
  }

  const next = [...objects];

  if (mode === "forward") {
    // Walk from the top so a block of selected objects shifts as a unit.
    for (let i = next.length - 2; i >= 0; i -= 1) {
      if (isSelected(next[i]) && !isSelected(next[i + 1])) {
        [next[i], next[i + 1]] = [next[i + 1], next[i]];
      }
    }
  } else {
    for (let i = 1; i < next.length; i += 1) {
      if (isSelected(next[i]) && !isSelected(next[i - 1])) {
        [next[i], next[i - 1]] = [next[i - 1], next[i]];
      }
    }
  }

  return next;
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
  interactionSnapshot: null,
  saveStatus: "idle",
  lastSavedAt: null,
  hydrated: false,

  /**
   * Adopts the project restored from storage (or just marks hydration done when
   * there is nothing stored). History starts empty: the restored state is the
   * baseline, not something the user should be able to undo past.
   */
  hydrateProject: (project) =>
    set(() =>
      project
        ? {
            project,
            activePageId: project.pages[0].id,
            selectedIds: [],
            past: [],
            future: [],
            hydrated: true,
          }
        : { hydrated: true },
    ),

  setSaveStatus: (saveStatus, savedAt) =>
    set(savedAt ? { saveStatus, lastSavedAt: savedAt } : { saveStatus }),

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

  /**
   * Applies several patches at once WITHOUT touching history — the update path
   * for continuous gestures. Wrap a gesture in `beginInteraction` /
   * `endInteraction` so it lands as one undo step.
   */
  updateObjects: (updates) =>
    set((state) => {
      if (updates.length === 0) return {};
      const byId = new Map(updates.map((update) => [update.id, update.patch]));

      return {
        project: withActivePage(state.project, state.activePageId, (page) => ({
          ...page,
          objects: page.objects.map((object) => {
            const patch = byId.get(object.id);
            return patch ? ({ ...object, ...patch } as CanvasObject) : object;
          }),
        })),
      };
    }),

  addObject: (object) =>
    set((state) => {
      const page = state.project.pages.find(
        (candidate) => candidate.id === state.activePageId,
      );

      // Library panels drop everything at the page centre, so adding several in
      // a row would bury them under each other. Cascade past anything already
      // sitting on the same spot.
      let placed = object;
      if (page) {
        let step = 0;
        while (
          step < MAX_CASCADE_STEPS &&
          page.objects.some(
            (existing) =>
              Math.abs(existing.x - placed.x) < 1 &&
              Math.abs(existing.y - placed.y) < 1,
          )
        ) {
          step += 1;
          placed = {
            ...object,
            x: object.x + step * CASCADE_OFFSET,
            y: object.y + step * CASCADE_OFFSET,
          };
        }
      }

      return {
        ...commit(
          state,
          withActivePage(state.project, state.activePageId, (current) => ({
            ...current,
            objects: [...current.objects, placed],
          })),
        ),
        selectedIds: [placed.id],
      };
    }),

  /**
   * Swaps the page's photo slots for a freshly generated set, leaving text,
   * stickers and shapes untouched. Slots go to the back of the z-order, which is
   * where a frame belongs relative to its decorations.
   */
  replaceSlots: (slots) =>
    set((state) => ({
      ...commit(
        state,
        withActivePage(state.project, state.activePageId, (page) => ({
          ...page,
          objects: [
            ...slots,
            ...page.objects.filter((object) => object.kind !== "slot"),
          ],
        })),
      ),
      selectedIds: [],
    })),

  setPageBackground: (background) =>
    set((state) =>
      commit(
        state,
        withActivePage(state.project, state.activePageId, (page) => ({
          ...page,
          background,
        })),
      ),
    ),

  applyPageContent: (content) =>
    set((state) => ({
      ...commit(
        state,
        withActivePage(state.project, state.activePageId, (page) => ({
          ...page,
          ...content,
        })),
      ),
      selectedIds: [],
      // The new page is very likely a different size, so re-fit the view.
      zoomMode: "fit" as ZoomMode,
      pan: { x: 0, y: 0 },
    })),

  setSlotPhoto: (slotId, photo) => get().updateObject(slotId, { photo }),

  fillNextEmptySlot: (src) => {
    const state = get();
    const page = state.project.pages.find(
      (candidate) => candidate.id === state.activePageId,
    );

    const slot = page?.objects.find(
      (object): object is PhotoSlotObject =>
        object.kind === "slot" && !object.photo,
    );
    if (!slot) return null;

    state.setSlotPhoto(slot.id, { src, offsetX: 0, offsetY: 0, scale: 1 });
    return slot.id;
  },

  /** Moves one object to an absolute index in the page's object list. */
  moveObject: (id, toIndex) =>
    set((state) => {
      const page = state.project.pages.find(
        (candidate) => candidate.id === state.activePageId,
      );
      const fromIndex = page?.objects.findIndex((object) => object.id === id);
      if (!page || fromIndex === undefined || fromIndex < 0) return {};

      const target = Math.max(0, Math.min(toIndex, page.objects.length - 1));
      if (target === fromIndex) return {};

      return commit(
        state,
        withActivePage(state.project, state.activePageId, (current) => {
          const objects = [...current.objects];
          const [moved] = objects.splice(fromIndex, 1);
          objects.splice(target, 0, moved);
          return { ...current, objects };
        }),
      );
    }),

  reorderSelection: (mode) =>
    set((state) => {
      if (state.selectedIds.length === 0) return {};

      return commit(
        state,
        withActivePage(state.project, state.activePageId, (page) => ({
          ...page,
          objects: reorderObjects(page.objects, state.selectedIds, mode),
        })),
      );
    }),

  beginInteraction: () =>
    set((state) =>
      // A gesture already in flight keeps its original snapshot.
      state.interactionSnapshot ? {} : { interactionSnapshot: state.project },
    ),

  endInteraction: () =>
    set((state) => {
      const snapshot = state.interactionSnapshot;
      if (!snapshot) return {};
      // A click that never moved anything should not create an undo step.
      if (snapshot === state.project) return { interactionSnapshot: null };

      return {
        past: [...state.past, snapshot].slice(-HISTORY_LIMIT),
        future: [],
        interactionSnapshot: null,
      };
    }),

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
