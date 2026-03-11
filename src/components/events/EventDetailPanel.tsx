import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Video, Check, X, Download, ExternalLink, Lock, Users } from "lucide-react";
import { format } from "date-fns";

interface EventDetailPanelProps {
  event: any;
  myRsvpStatus: string | null;
  goingCount: number;
  goingNames: string[];
  onRsvp: (status: string) => void;
  onDownloadICS: () => void;
  rsvpLoading: boolean;
}

export default function EventDetailPanel({
  event, myRsvpStatus, goingCount, goingNames, onRsvp, onDownloadICS, rsvpLoading,
}: EventDetailPanelProps) {
  const isPast = new Date(event.start_time) < new Date();
  const isMandatory = event.is_mandatory;
  const isOnline = event.is_online;
  const isGoing = myRsvpStatus === "going" || isMandatory;

  const eventTypeLabels: Record<string, string> = {
    activity: "Activity", training: "Training", admin: "Admin Notice",
  };

  return (
    <Card className="border-border">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-lg font-semibold">{event.title}</h3>
            {isMandatory && (
              <Badge variant="destructive" className="text-xs">必须参加</Badge>
            )}
            {event.is_recurring && (
              <Badge variant="secondary" className="text-xs">周期性</Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {eventTypeLabels[event.event_type] ?? event.event_type}
            </Badge>
          </div>
          {event.description && (
            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
          )}
        </div>

        {/* Time & Location */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>
              {format(new Date(event.start_time), "h:mm a")}
              {event.end_time && ` – ${format(new Date(event.end_time), "h:mm a")}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {/* Meeting info - shown when going/mandatory */}
        {isGoing && isOnline && event.meeting_link && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
              <Video className="w-4 h-4" />
              Meeting Info
            </div>
            <a
              href={event.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <ExternalLink className="w-3 h-3 mr-1" />
                Join Meeting
              </Button>
            </a>
            {event.zoom_password && (
              <div className="flex items-center gap-1.5 text-xs text-blue-700">
                <Lock className="w-3 h-3" />
                Password: <span className="font-mono font-medium">{event.zoom_password}</span>
              </div>
            )}
          </div>
        )}

        {/* Location detail - shown when going and offline */}
        {isGoing && !isOnline && event.location && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-green-800">
              <MapPin className="w-4 h-4" />
              Event Location
            </div>
            <p className="text-sm text-green-700">{event.location}</p>
            <p className="text-xs text-green-600">
              {format(new Date(event.start_time), "EEEE, MMM d · h:mm a")}
              {event.end_time && ` – ${format(new Date(event.end_time), "h:mm a")}`}
            </p>
          </div>
        )}

        {/* Attendees */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{isMandatory ? "All team" : `${goingCount} going`}</span>
          {goingNames.length > 0 && !isMandatory && (
            <span className="text-xs">({goingNames.slice(0, 5).join(", ")}{goingNames.length > 5 ? "..." : ""})</span>
          )}
        </div>

        {/* Actions */}
        {!isPast && !isMandatory && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant={myRsvpStatus === "going" ? "default" : "outline"}
              onClick={() => onRsvp("going")}
              disabled={rsvpLoading}
            >
              <Check className="w-3 h-3 mr-1" />Going
            </Button>
            <Button
              size="sm"
              variant={myRsvpStatus === "not_going" ? "destructive" : "outline"}
              onClick={() => onRsvp("not_going")}
              disabled={rsvpLoading}
            >
              <X className="w-3 h-3 mr-1" />Can't Go
            </Button>
          </div>
        )}

        {!isPast && (
          <Button size="sm" variant="outline" onClick={onDownloadICS} className="w-full">
            <Download className="w-3 h-3 mr-1" />Add to Calendar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
