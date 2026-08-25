/**
 * The heading every settings tab opens with.
 *
 * One component rather than the same two elements written three times: the tabs
 * are meant to read as one screen changing its middle, and a heading that drifts
 * a size between them is what makes a tabbed section feel like separate pages
 * wearing the same nav.
 */
export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
