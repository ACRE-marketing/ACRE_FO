import { Button } from "@/components/ui/button";
import { Clock, MapPin, Users, AlertCircle, Video, CalendarPlus, Check } from "lucide-react";
import { format } from "date-fns";
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
  const isJoinWindowOpen = event.is_online && !!event.meeting_link && !isPast && minutesBefore <= 10;

  return (
    <div className={`rounded-lg border border-l-4 bg-card ${styles.bar} hover:shadow-sm transition-shadow`}>
      {/* Header — click to open detail */}
      <button onClick={onOpen} className="w-full text-left px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles.chip}`}>
                {categoryLabel[category]}
              </span>
              {event.lunch_included && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  🥪 Lunch
                </span>
              )}
              {isGoing && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Signed up
                </span>
              )}
            </div>
            <h3 className="font-semibold text-sm leading-snug truncate">{event.title}</h3>
            {event.speaker && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.speaker}</p>
            )}
          </div>
        </div>
      </button>

      {/* Meta row — inline, compact */}
      <div className="px-4 pb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(start, "MMM d, h:mm a")}{end && `–${format(end, "h:mm a")}`}
        </span>
        <span className="inline-flex items-center gap-1 min-w-0">
          {event.is_online ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
          <span className="truncate max-w-[180px]">
            {event.is_online
              ? (event.meeting_link ? "Online (Zoom)" : "Online")
              : (event.location || event.area || "TBD")}
          </span>
        </span>
        {!noSignupNeeded && (
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span className="tabular-nums">{goingCount}{hasCapacity ? `/${capacity}` : ""}</span>
            {hasCapacity && (
              <span className="inline-block w-12 h-1 bg-muted rounded-full overflow-hidden ml-1">
                <span
                  className={`block h-full ${isFull ? "bg-destructive" : styles.dot}`}
                  style={{ width: `${Math.min(100, (goingCount / (capacity as number)) * 100)}%` }}
                />
              </span>
            )}
          </span>
        )}
        {!noSignupNeeded && deadline && !isPast && (
          <span className={`inline-flex items-center gap-1 ${registrationClosed ? "" : "text-foreground/70"}`}>
            <AlertCircle className="w-3 h-3" />
            {registrationClosed ? "Closed" : `Closes ${format(deadline, "MMM d, h:mma")}`}
          </span>
        )}
      </div>

      {/* Actions row */}
      <div className="px-4 pb-3 pt-1 flex flex-wrap gap-2">
        {noSignupNeeded ? (
          event.is_online && event.meeting_link ? (
            <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant={isJoinWindowOpen ? "default" : "outline"} className={isJoinWindowOpen ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}>
                <Video className="w-3 h-3 mr-1" />
                {isJoinWindowOpen ? "Join now" : "Join meeting"}
              </Button>
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">All team — no signup needed</span>
          )
        ) : isPast ? (
          <Button size="sm" variant="outline" disabled className="opacity-60">Event ended</Button>
        ) : isGoing ? (
          <>
            <Button size="sm" variant="outline" onClick={onCancel} disabled={rsvpLoading}>
              Cancel signup
            </Button>
            <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost">
                <CalendarPlus className="w-3 h-3 mr-1" /> Add to Calendar
              </Button>
            </a>
            {event.is_online && event.meeting_link && isJoinWindowOpen && (
              <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Video className="w-3 h-3 mr-1" /> Join now
                </Button>
              </a>
            )}
          </>
        ) : (
          <Button
            size="sm"
            onClick={onSignUp}
            disabled={rsvpLoading || registrationClosed || isFull}
          >
            {registrationClosed ? "Registration closed" : isFull ? "Full — Waitlist" : "Sign up"}
          </Button>
        )}
      </div>
    </div>
  );
}
