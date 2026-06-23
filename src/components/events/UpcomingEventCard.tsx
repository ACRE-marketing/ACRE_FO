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
  // Recurring meetings auto-include everyone (no sign up needed)
  const noSignupNeeded = isRecurring;

  const minutesBefore = (start.getTime() - now.getTime()) / (1000 * 60);
  const isJoinWindowOpen = event.is_online && !!event.meeting_link && !isPast && minutesBefore <= 10;

  return (
    <div className={`rounded-lg border border-l-4 bg-card ${styles.bar} overflow-hidden`}>
      {/* Header */}
      <button onClick={onOpen} className="w-full text-left px-4 pt-3 pb-2 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm leading-tight">{event.title}</h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles.chip}`}>
            {categoryLabel[category]}
          </span>
        </div>
        {event.speaker && (
          <p className="text-xs text-muted-foreground mt-1">{event.speaker}</p>
        )}
      </button>

      {/* Description block (italic, multi-line) */}
      {event.description && (
        <div className="px-4 pb-2">
          <div className="rounded-md bg-muted/40 border border-border/60 px-3 py-2 text-xs italic text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {event.description}
          </div>
        </div>
      )}

      {/* Body grid: time/location · signups/deadline · actions */}
      <div className="px-4 pb-3 pt-1 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-x-4 gap-y-2 items-start">
        {/* Time */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <Clock className="w-3 h-3" /> Time
          </div>
          <div className="text-xs mt-0.5">
            {format(start, "MMM d, yyyy, h:mm a")}
            {end && ` – ${format(end, "h:mm a")}`}
          </div>
        </div>

        {/* Location / Online */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {event.is_online ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
            {event.is_online ? "Meeting" : "Location"}
          </div>
          <div className="text-xs mt-0.5 break-words">
            {event.is_online
              ? (event.meeting_link ? "Online via Zoom" : "Online")
              : (event.location || event.area || "TBD")}
          </div>
        </div>

        {/* Actions column */}
        <div className="flex flex-col gap-1.5 md:items-end md:min-w-[140px]">
          {noSignupNeeded ? (
            event.is_online && event.meeting_link ? (
              <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
                <Button size="sm" className={`w-full ${isJoinWindowOpen ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`} variant={isJoinWindowOpen ? "default" : "outline"}>
                  <Video className="w-3 h-3 mr-1" />
                  {isJoinWindowOpen ? "Join now" : "Join meeting"}
                </Button>
              </a>
            ) : (
              <span className="text-[11px] text-muted-foreground">All team</span>
            )
          ) : isPast ? (
            <Button size="sm" variant="outline" disabled className="w-full md:w-auto opacity-60">Event ended</Button>
          ) : isGoing ? (
            <>
              <Button size="sm" variant="outline" onClick={onCancel} disabled={rsvpLoading} className="w-full md:w-auto">
                Cancel signup
              </Button>
              <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
                <Button size="sm" variant="outline" className="w-full">
                  <CalendarPlus className="w-3 h-3 mr-1" /> Add to Google Calendar
                </Button>
              </a>
              {event.is_online && event.meeting_link && isJoinWindowOpen && (
                <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
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
              className="w-full md:w-auto"
            >
              {registrationClosed ? "Registration closed" : isFull ? "Full — Waitlist" : "Sign up"}
            </Button>
          )}
        </div>

        {/* Signups */}
        {!noSignupNeeded && (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              <Users className="w-3 h-3" /> Signups
            </div>
            <div className="text-xs mt-0.5 flex items-center gap-2">
              <span className="tabular-nums">{goingCount}{hasCapacity ? ` / ${capacity}` : ""}</span>
              {hasCapacity && (
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[80px]">
                  <div className={`h-full ${isFull ? "bg-destructive" : styles.dot}`} style={{ width: `${Math.min(100, (goingCount / (capacity as number)) * 100)}%` }} />
                </div>
              )}
              {isGoing && <Check className="w-3 h-3 text-green-600" />}
            </div>
          </div>
        )}

        {/* Deadline */}
        {!noSignupNeeded && deadline && (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              <AlertCircle className="w-3 h-3" /> Deadline
            </div>
            <div className={`text-xs mt-0.5 ${registrationClosed ? "text-muted-foreground" : ""}`}>
              {registrationClosed ? "Closed " : "Closes "}{format(deadline, "MMM d, yyyy, h:mm a")}
            </div>
          </div>
        )}

        {/* Lunch chip spans if present */}
        {event.lunch_included && (
          <div className="md:col-span-3">
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Lunch included
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
