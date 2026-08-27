import type { CanvasObject, PageBackground } from "@/types/editor";

/**
 * Row shapes as `pg` returns them.
 *
 * Written by hand rather than generated: the schema is small, and a hand-written
 * type is the one place to say what the driver actually hands back — `integer`
 * arrives as a number, `timestamptz` as a `Date`, `jsonb` already parsed.
 */

export interface DesignRow {
  id: string;
  owner_id: string;
  title: string;
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface DesignPageRow {
  /** Editor-issued and unique within its design, not a uuid. */
  id: string;
  design_id: string;
  position: number;
  name: string;
  template_id: string | null;
  width: number;
  height: number;
  background_type: PageBackground["type"];
  background: PageBackground;
  objects: CanvasObject[];
  effects: string[];
  created_at: Date;
  updated_at: Date;
}

/** A design and its pages, as loaded together. */
export interface DesignWithPages {
  design: DesignRow;
  pages: DesignPageRow[];
}
