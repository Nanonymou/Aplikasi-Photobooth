import type { DesignPageRow, DesignWithPages } from "@/lib/db/types";
import type { CanvasPage, EditorProject, PageBackground } from "@/types/editor";

/**
 * Translation between stored rows and the editor's own model.
 *
 * The editor knows nothing about rows, positions or owner ids; the database
 * knows nothing about zoom, selection or history. These two functions are the
 * only place the two vocabularies meet, so a schema change has exactly one
 * place to be absorbed.
 */

function rowToPage(row: DesignPageRow): CanvasPage {
  return {
    id: row.id,
    name: row.name,
    // A page that never came from a template reads back as `null` rather than
    // the `undefined` it may have been saved as: one absent-value spelling is
    // easier to reason about, and the editor treats both the same way.
    templateId: row.template_id,
    width: row.width,
    height: row.height,
    background: row.background,
    objects: row.objects,
  };
}

export function rowsToProject({ design, pages }: DesignWithPages): EditorProject {
  return {
    id: design.id,
    title: design.title,
    // Trust the query's ORDER BY rather than re-sorting silently: a gap or a
    // duplicate in `position` is a bug worth seeing, not one worth papering over.
    pages: pages.map(rowToPage),
    updatedAt: design.updated_at.toISOString(),
  };
}

/** The page columns a write needs, in the order the editor holds them. */
export interface PageWrite {
  id: string;
  position: number;
  name: string;
  templateId: string | null;
  width: number;
  height: number;
  backgroundType: PageBackground["type"];
  background: PageBackground;
  objects: CanvasPage["objects"];
}

export function projectToPageWrites(project: EditorProject): PageWrite[] {
  return project.pages.map((page, position) => ({
    id: page.id,
    position,
    name: page.name,
    templateId: page.templateId ?? null,
    width: page.width,
    height: page.height,
    backgroundType: page.background.type,
    background: page.background,
    objects: page.objects,
  }));
}
