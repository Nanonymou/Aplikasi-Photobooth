import { Callout } from "@/components/materi/blocks/callout";
import { MateriAccordion } from "@/components/materi/blocks/materi-accordion";
import { MateriCards } from "@/components/materi/blocks/materi-cards";
import { MateriTimeline } from "@/components/materi/blocks/materi-timeline";
import type { MateriSection } from "@/lib/materi/chapters";

/** Plain paragraphs + bullets — the default reading treatment. */
function Prose({ section }: { section: MateriSection }) {
  return (
    <>
      {section.paragraphs?.map((paragraph, index) => (
        <p
          key={index}
          className="text-muted-foreground text-sm leading-relaxed text-pretty"
        >
          {paragraph}
        </p>
      ))}

      {section.bullets && section.bullets.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {section.bullets.map((bullet, index) => (
            <li
              key={index}
              className="text-foreground/90 flex gap-2.5 text-sm leading-relaxed"
            >
              <span
                aria-hidden
                className="bg-primary/60 mt-2 size-1.5 shrink-0 rounded-full"
              />
              <span className="text-pretty">{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Renders one section by its `variant`.
 *
 * The shared frame — heading and intro line — lives here; the body is dispatched
 * to the matching block (callout, cards, accordion, timeline) or falls back to
 * prose. Keeping the switch in one place means a chapter article just maps its
 * sections without knowing how any one of them presents.
 */
export function SectionView({ section }: { section: MateriSection }) {
  return (
    <section className="flex flex-col gap-3">
      {/* A lone callout carries its own icon and framing, so the plain heading
          would only compete with it — the callout stands on its own. */}
      {section.variant !== "callout" && (
        <h3 className="text-base font-semibold tracking-tight">
          {section.heading}
        </h3>
      )}

      {section.intro && (
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {section.intro}
        </p>
      )}

      {section.variant === "prose" && <Prose section={section} />}

      {section.variant === "callout" && (
        <Callout tone={section.tone ?? "info"} paragraphs={section.paragraphs ?? []} />
      )}

      {section.variant === "cards" && (
        <MateriCards items={section.items} bullets={section.bullets} />
      )}

      {section.variant === "accordion" && (
        <MateriAccordion items={section.items ?? []} />
      )}

      {section.variant === "timeline" && (
        <MateriTimeline items={section.items ?? []} />
      )}
    </section>
  );
}
