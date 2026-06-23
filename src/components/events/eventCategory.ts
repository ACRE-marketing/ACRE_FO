// Maps the raw event_type to a UI category with consistent color + label
export type EventCategory = "training" | "tour" | "meeting" | "other";

export function getCategory(event: { event_type?: string | null; is_recurring?: boolean | null }): EventCategory {
  const t = (event.event_type ?? "").toLowerCase();
  if (t === "training") return "training";
  if (t === "activity") return "tour";
  if (t === "admin" || event.is_recurring) return "meeting";
  return "other";
}

export const categoryLabel: Record<EventCategory, string> = {
  training: "Training",
  tour: "Listing / Tour",
  meeting: "Team Meeting",
  other: "Event",
};

// Tailwind classes per category (kept as static literals so JIT picks them up)
export const categoryStyles: Record<EventCategory, {
  bar: string;          // left border-color
  dot: string;          // solid bg dot for calendar
  chip: string;         // small chip bg+text for week view / calendar entries
  badge: string;        // badge for detail panel
}> = {
  training: {
    bar: "border-l-blue-500",
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  tour: {
    bar: "border-l-[#BFB382]",
    dot: "bg-[#BFB382]",
    chip: "bg-[#F4EFE5] text-[#7a6b3d] border-[#DDD1C1]",
    badge: "bg-[#F4EFE5] text-[#7a6b3d] border-[#DDD1C1]",
  },
  meeting: {
    bar: "border-l-amber-500",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  other: {
    bar: "border-l-muted-foreground/40",
    dot: "bg-muted-foreground/60",
    chip: "bg-muted text-muted-foreground border-border",
    badge: "bg-muted text-muted-foreground border-border",
  },
};
