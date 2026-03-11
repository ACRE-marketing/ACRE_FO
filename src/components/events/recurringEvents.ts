import {
  startOfMonth, endOfMonth, addDays, getDay, setHours, setMinutes,
  startOfWeek, endOfWeek, isBefore, isAfter, format,
} from "date-fns";

export interface RecurringTemplate {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string | null;
  zoom_password: string | null;
  is_online: boolean;
  location: string | null;
  recurrence_rule: string; // 'weekly_thu' | 'monthly_first_fri'
  event_type: string;
  is_mandatory: boolean;
}

export interface GeneratedEvent {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string | null;
  zoom_password: string | null;
  is_online: boolean;
  location: string | null;
  start_time: string;
  end_time: string | null;
  event_type: string;
  is_mandatory: boolean;
  is_recurring: boolean;
  template_id: string;
}

/**
 * Generate recurring event instances for a given date range
 */
export function generateRecurringInstances(
  template: RecurringTemplate,
  rangeStart: Date,
  rangeEnd: Date
): GeneratedEvent[] {
  const instances: GeneratedEvent[] = [];

  if (template.recurrence_rule === "weekly_thu") {
    // Every Thursday at 10 AM
    let current = startOfWeek(rangeStart, { weekStartsOn: 0 });
    while (isBefore(current, rangeEnd)) {
      // Thursday is day 4
      const thursday = addDays(current, 4);
      const eventTime = setMinutes(setHours(thursday, 10), 0);
      if (!isBefore(eventTime, rangeStart) && !isAfter(eventTime, rangeEnd)) {
        instances.push({
          id: `${template.id}_${format(eventTime, "yyyy-MM-dd")}`,
          title: template.title,
          description: template.description,
          meeting_link: template.meeting_link,
          zoom_password: template.zoom_password,
          is_online: template.is_online,
          location: template.location,
          start_time: eventTime.toISOString(),
          end_time: setMinutes(setHours(thursday, 11), 0).toISOString(),
          event_type: template.event_type,
          is_mandatory: template.is_mandatory,
          is_recurring: true,
          template_id: template.id,
        });
      }
      current = addDays(current, 7);
    }
  }

  if (template.recurrence_rule === "monthly_first_fri") {
    // First Friday of each month at 10 AM
    let monthStart = startOfMonth(rangeStart);
    while (isBefore(monthStart, rangeEnd)) {
      // Find first Friday
      let day = monthStart;
      while (getDay(day) !== 5) {
        day = addDays(day, 1);
      }
      const eventTime = setMinutes(setHours(day, 10), 0);
      if (!isBefore(eventTime, rangeStart) && !isAfter(eventTime, rangeEnd)) {
        instances.push({
          id: `${template.id}_${format(eventTime, "yyyy-MM-dd")}`,
          title: template.title,
          description: template.description,
          meeting_link: template.meeting_link,
          zoom_password: template.zoom_password,
          is_online: template.is_online,
          location: template.location,
          start_time: eventTime.toISOString(),
          end_time: setMinutes(setHours(day, 11), 0).toISOString(),
          event_type: template.event_type,
          is_mandatory: template.is_mandatory,
          is_recurring: true,
          template_id: template.id,
        });
      }
      monthStart = startOfMonth(addDays(endOfMonth(monthStart), 1));
    }
  }

  return instances;
}
