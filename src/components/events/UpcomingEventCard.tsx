import { Button } from "@/components/ui/button";
import { Clock, MapPin, Users, AlertCircle, Video, CalendarPlus, Check, Copy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getCategory, categoryLabel, categoryStyles } from "./eventCategory";

interface Props {
  event: any;
  goingCount: number;
  myRsvpStatus: string | null;
  onSignUp: () => void;
  onCancel: () => void;
  onOpen: () => void;
  rsvpLoading: boolean;
  compact?: boolean;
}

function googleCalendarUrl(event: any) {
  const toGCal = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = toGCal(event.start_time);
  const end = toGCal(event.end_time ?? event.start_time);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title ?? "",
    dates: `${start}/${end}`,
    details: event.description ?? "",
    location: event.is_online ? (event.meeting_link ?? "Online") : (event.location ?? ""),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function UpcomingEventCard({
  event, goingCount, myRsvpStatus, onSignUp, onCancel, onOpen, rsvpLoading,
}: Props) {
  const category = getCategory(event);
  const styles = categoryStyles[category];

  const now = new Date();
  const start = new Date(event.start_time);
  const end = event.end_time ? new Date(event.end_time) : null;
  const isPast = start < now;

  const capacity = event.capacity as number | null | undefined;
  const hasCapacity = typeof capacity === "number" && capacity > 0;
  const deadline = event.rsvp_deadline ? new Date(event.rsvp_deadline) : null;
  const registrationClosed = deadline ? deadline < now : false;
  const isFull = hasCapacity && goingCount >= (capacity as number);

  const isGoing = myRsvpStatus === "going";
  const isRecurring = !!event.is_recurring;
  const noSignupNeeded = isRecurring;

  const minutesBefore = (start.getTime() - now.getTime()) / (1000 * 60);
  const hasMeetingLink = !!event.meeting_link;
  const isJoinWindowOpen = event.is_online && hasMeetingLink && !isPast && minutesBefore <= 10;
  const showMeetingControls = event.is_online && (noSignupNeeded || isGoing);

  const copyMeetingLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMeetingLink) return;
    try {
      await navigator.clipboard.writeText(event.meeting_link);
      toast.success("Meeting link copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const timeText = `${format(start, "MMM d, h:mm a")}${end ? ` – ${format(end, "h:mm a")}` : ""}`;
  const locationText = event.is_online
    ? (hasMeetingLink ? "Online (Zoom)" : "Online — link TBD")
    : (event.location || event.area || "TBD");

  return (
    <div className="group flex rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Category accent bar */}
      <div className={`w-1.5 shrink-0 ${styles.dot}`} />

      <div className="flex-1 p-4 flex flex-col min-w-0">
        {/* Header: category + status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${styles.chip}`}>
            {categoryLabel[category]}
          </span>
          {isGoing && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success shrink-0">
              <Check className="w-3 h-3" /> Signed up
            </span>
          )}
        </div>

        {/* Title / speaker — click to open detail */}
        <button onClick={onOpen} className="text-left">
          <h3 className="font-display text-sm font-semibold text-foreground leading-snug mb-0.5 line-clamp-2">
            {event.title}
          </h3>
          {event.speaker && (
            <p className="text-xs text-muted-foreground">with {event.speaker}</p>
          )}
        </button>

        {/* Note / description */}
        {event.description && (
          <div className="mt-3 mb-4">
            <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-accent/30 pl-3 whitespace-pre-wrap break-words">
              {event.description}
            </p>
          </div>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4">
          <MetaItem icon={<Clock className="w-3.5 h-3.5 text-accent" />} text={timeText} />
          <MetaItem icon={event.is_online ? <Video className="w-3.5 h-3.5 text-accent" /> : <MapPin className="w-3.5 h-3.5 text-accent" />} text={locationText} />
          {!noSignupNeeded && (
            <MetaItem
              icon={<Users className="w-3.5 h-3.5 text-accent" />}
              text={hasCapacity ? `${goingCount}/${capacity} enrolled` : `${goingCount} going`}
            />
          )}
          {!noSignupNeeded && deadline && !isPast && (
            <MetaItem
              icon={<AlertCircle className="w-3.5 h-3.5 text-accent" />}
              text={registrationClosed ? "Registration closed" : `Closes ${format(deadline, "MMM d, h:mma")}`}
            />
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-2 border-t border-border flex flex-wrap items-center justify-between gap-1.5">
          {/* Primary action */}
          <div className="flex items-center gap-1.5">
            {!noSignupNeeded && (
              isPast ? (
                <Button size="sm" variant="outline" disabled className="h-7 text-[10px] px-2.5 opacity-60">
                  Event ended
                </Button>
              ) : isGoing ? (
                <Button size="sm" variant="outline" onClick={onCancel} disabled={rsvpLoading} className="h-7 text-[10px] px-2.5">
                  Cancel signup
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onSignUp}
                  disabled={rsvpLoading || registrationClosed || isFull}
                  className="h-7 text-[10px] px-2.5"
                >
                  {registrationClosed ? "Closed" : isFull ? "Full — waitlist" : "Sign up"}
                </Button>
              )
            )}

            {showMeetingControls && !isPast && (
              hasMeetingLink ? (
                <a
                  href={event.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!isJoinWindowOpen}
                  onClick={(e) => { if (!isJoinWindowOpen) e.preventDefault(); }}
                >
                  <Button
                    size="sm"
                    variant={isJoinWindowOpen ? "default" : "outline"}
                    disabled={!isJoinWindowOpen}
                    className="h-7 text-[10px] px-2.5"
                  >
                    <Video className="w-3 h-3 mr-1" />
                    Join meeting
                  </Button>
                </a>
              ) : (
                <Button size="sm" variant="outline" disabled title="Meeting link not uploaded yet" className="h-7 text-[10px] px-2.5">
                  <Video className="w-3 h-3 mr-1" /> Join meeting
                </Button>
              )
            )}
          </div>

          {/* Secondary actions */}
          <div className="flex items-center gap-0.5">
            {isGoing && !isPast && (
              <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" title="Add to Google Calendar" className="h-7 w-7 p-0">
                  <CalendarPlus className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
            {showMeetingControls && (
              <Button
                size="sm"
                variant="ghost"
                onClick={copyMeetingLink}
                disabled={!hasMeetingLink}
                title={hasMeetingLink ? "Copy meeting link" : "Link not uploaded yet"}
                className="h-7 w-7 p-0"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {noSignupNeeded && !event.is_online && (
            <span className="text-[10px] text-muted-foreground">All team — no signup needed</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground font-medium truncate">{text}</span>
    </div>
  );
}
