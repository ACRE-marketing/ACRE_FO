import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find events starting in the next 24-25 hours (run hourly to catch the window)
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: upcomingEvents, error: evErr } = await supabase
      .from("events")
      .select("id, title, location, is_online, meeting_link, start_time")
      .gte("start_time", in24h.toISOString())
      .lt("start_time", in25h.toISOString());

    if (evErr) throw evErr;

    console.log(`Found ${upcomingEvents?.length ?? 0} events starting in ~24 hours`);

    if (!upcomingEvents || upcomingEvents.length === 0) {
      return new Response(JSON.stringify({ message: "No events to remind" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalNotifications = 0;

    for (const event of upcomingEvents) {
      // Get all users who RSVP'd "going"
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("status", "going");

      if (!rsvps || rsvps.length === 0) continue;

      const startTime = new Date(event.start_time);
      const timeStr = startTime.toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      let message = `Reminder: "${event.title}" starts tomorrow at ${timeStr}.`;
      if (event.location) message += ` Location: ${event.location}.`;
      if (event.is_online && event.meeting_link) {
        message += ` Join online: ${event.meeting_link}`;
      }

      const notifications = rsvps.map((r: any) => ({
        user_id: r.user_id,
        message,
        type: "event_reminder",
      }));

      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertErr) {
        console.error("Error inserting notifications for event:", event.id, insertErr);
      } else {
        totalNotifications += notifications.length;
      }
    }

    console.log(`Created ${totalNotifications} event reminder notifications`);

    return new Response(JSON.stringify({ created: totalNotifications }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in event-reminder:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
