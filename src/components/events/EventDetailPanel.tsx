import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Video, Check, X, ExternalLink, Lock, Users, AlertCircle, Utensils, Mic } from "lucide-react";
import { format } from "date-fns";
import { getCategory, categoryLabel, categoryStyles } from "./eventCategory";

interface EventDetailPanelProps {
  event: any;
  myRsvpStatus: string | null;
  goingCount: number;
  goingNames: string[];
  onRsvp: (status: string) => void;
  rsvpLoading: boolean;
}

export default function EventDetailPanel({
  event, myRsvpStatus, goingCount, goingNames, onRsvp, rsvpLoading,
}: EventDetailPanelProps) {
  const now = new Date();
  const startTime = new Date(event.start_time);
  const isPast = startTime < now;
  const isMandatory = event.is_mandatory;
  const isOnline = event.is_online;
  const isGoing = myRsvpStatus === "going" || isMandatory;
  const hasExternalRsvp = !!event.external_rsvp_url;

  // Zoom info only visible within 10 minutes before meeting start
  const minutesBefore = (startTime.getTime() - now.getTime()) / (1000 * 60);
  const isZoomWindowOpen = minutesBefore <= 10 && !isPast;
  const isZoomWindowSoon = minutesBefore > 10; // future but not yet in window

  const eventTypeLabels: Record<string, string> = {
    activity: "Activity", training: "Training", admin: "Admin Notice",
  };

  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-0">
        {/* Header section */}
        <div className="p-4 pb-3 border-b border-border">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {isMandatory && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">必须参加</Badge>
            )}
            {event.is_recurring && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">周期性</Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {eventTypeLabels[event.event_type] ?? event.event_type}
            </Badge>
            {hasExternalRsvp && (
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200">External RSVP</Badge>
            )}
          </div>
          <h3 className="text-base font-semibold leading-snug break-words">{event.title}</h3>
        </div>

        {/* Details section */}
        <div className="p-4 space-y-3">
          {/* Description */}
          {event.description && (
            <p className="text-sm text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
              {event.description}
            </p>
          )}

          {/* Time */}
          <div className="space-y-1.5">
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="break-words">{format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="break-words">
                {format(new Date(event.start_time), "h:mm a")}
                {event.end_time && ` – ${format(new Date(event.end_time), "h:mm a")}`}
              </span>
            </div>

            {/* Location: show area for non-registered, full address for registered */}
            {!isGoing && event.area && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{event.area}</span>
              </div>
            )}
            {!isGoing && !event.area && event.location && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Location available after registration</span>
              </div>
            )}
          </div>

          {/* Meeting info - only for going/mandatory */}
          {isGoing && isOnline && event.meeting_link && (
            <div className={`rounded-lg border p-3 space-y-2 ${isPast ? "bg-muted/50 border-border" : "bg-blue-50 border-blue-200"}`}>
              <div className={`flex items-center gap-2 text-sm font-medium ${isPast ? "text-muted-foreground" : "text-blue-800"}`}>
                <Video className="w-4 h-4 shrink-0" />
                Meeting Info
              </div>
              {isPast ? (
                <Button size="sm" disabled className="opacity-50 w-full">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Meeting Ended
                </Button>
              ) : isZoomWindowOpen ? (
                <>
                  <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 w-full">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Join Meeting
                    </Button>
                  </a>
                  {event.zoom_password && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-700">
                      <Lock className="w-3 h-3 shrink-0" />
                      <span className="break-all">Password: <span className="font-mono font-medium">{event.zoom_password}</span></span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Zoom link & password will be available 10 minutes before the meeting
                </div>
              )}
            </div>
          )}

          {/* Full location - only for going/mandatory offline */}
          {isGoing && !isOnline && event.location && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                <MapPin className="w-4 h-4 shrink-0" />
                Event Location
              </div>
              <p className="text-sm text-green-700 break-words">{event.location}</p>
              <p className="text-xs text-green-600">
                {format(new Date(event.start_time), "EEEE, MMM d · h:mm a")}
                {event.end_time && ` – ${format(new Date(event.end_time), "h:mm a")}`}
              </p>
            </div>
          )}

          {/* Attendees */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 shrink-0" />
            <span>{isMandatory ? "All team" : `${goingCount} going`}</span>
            {goingNames.length > 0 && !isMandatory && (
              <span className="text-xs truncate">({goingNames.slice(0, 5).join(", ")}{goingNames.length > 5 ? "..." : ""})</span>
            )}
          </div>

          {/* External RSVP notice */}
          {hasExternalRsvp && !isGoing && !isPast && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
              <div className="flex items-start gap-2 text-sm font-medium text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-words">You must complete the external RSVP form before registering here.</span>
              </div>
              <a
                href={event.external_rsvp_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 w-full">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Complete External RSVP
                </Button>
              </a>
              <p className="text-[11px] text-amber-600">After completing the form above, click "Going" below to confirm your registration.</p>
            </div>
          )}

          {/* RSVP Actions */}
          {!isPast && !isMandatory && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant={myRsvpStatus === "going" ? "default" : "outline"}
                onClick={() => onRsvp("going")}
                disabled={rsvpLoading}
                className="flex-1"
              >
                <Check className="w-3 h-3 mr-1" />{myRsvpStatus === "going" ? "Registered" : "Going"}
              </Button>
              <Button
                size="sm"
                variant={myRsvpStatus === "not_going" ? "destructive" : "outline"}
                onClick={() => onRsvp("not_going")}
                disabled={rsvpLoading}
                className="flex-1"
              >
                <X className="w-3 h-3 mr-1" />Can't Go
              </Button>
            </div>
          )}

          {/* Registered confirmation */}
          {isGoing && !isMandatory && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-2 text-center">
              <span className="text-xs text-green-700 font-medium flex items-center justify-center gap-1">
                <Check className="w-3 h-3" /> You're registered for this event
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
