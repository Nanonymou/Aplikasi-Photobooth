import "server-only";

import { query } from "@/lib/db/client";

/**
 * The record that an export happened.
 *
 * Written once, on the way out of the render endpoint, and never read by the
 * app itself — only by the admin report. That is why the write must never be
 * allowed to matter: a booth guest waiting for their photostrip does not care
 * that analytics is having a bad day, and losing a row from a chart is a far
 * smaller failure than losing the export.
 */

export interface ExportEvent {
  ownerId: string;
  format: "png" | "jpeg" | "webp" | "pdf";
  bytes: number;
  scale: number;
  /** True when the file was parked in the render store rather than streamed. */
  persisted: boolean;
}

/**
 * Records one finished export, swallowing its own failures.
 *
 * Callers do not await a result they could act on, because there is nothing
 * sensible to do: the export already succeeded by the time this runs.
 */
export async function recordExport(event: ExportEvent): Promise<void> {
  try {
    await query(
      `insert into export_events (owner_id, format, bytes, scale, persisted)
       values ($1, $2, $3, $4, $5)`,
      [
        event.ownerId,
        event.format,
        Math.max(0, Math.round(event.bytes)),
        event.scale,
        event.persisted,
      ],
    );
  } catch (error) {
    console.error("recordExport failed", error);
  }
}
