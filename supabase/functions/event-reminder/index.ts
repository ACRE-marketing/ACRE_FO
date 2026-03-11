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

    const now = new Date();
    let totalNotifications = 0;

    // Helper: get all user IDs (for mandatory events)
    const getAllUserIds = async () => {
      const { data } = await supabase.from("profiles").select("id");
      return data?.map((p: any) => p.id) ?? [];
    };

    // Helper: get RSVP'd user IDs for an event
    const getRsvpUserIds = async (eventId: string) => {
      const { data } = await supabase
        .from("event_rsvps")
        .select("user_id")
        .eq("event_id", eventId)
        .eq("status", "going");
      return data?.map((r: any) => r.user_id) ?? [];
    };

    // Helper: create notifications
    const notify = async (userIds: string[], message: string, type: string) => {
      if (userIds.length === 0) return 0;
      const notifications = userIds.map((user_id) => ({ user_id, message, type }));
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) console.error("Insert error:", error);
      return error ? 0 : notifications.length;
    };

    // ─── Tier 1: 24 hours before → in-app notification + email ───
    {
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in24h10 = new Date(in24h.getTime() + 10 * 60 * 1000);

      const { data: events } = await supabase
        .from("events")
        .select("*")
        .gte("start_time", in24h.toISOString())
        .lt("start_time", in24h10.toISOString());

      for (const event of events ?? []) {
        const isMandatory = event.is_mandatory;
        const userIds = isMandatory
          ? await getAllUserIds()
          : await getRsvpUserIds(event.id);

        const timeStr = new Date(event.start_time).toLocaleString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        });

        let msg = `📅 Reminder: "${event.title}" is tomorrow at ${timeStr}.`;
        if (event.location) msg += ` 📍 ${event.location}`;
        if (event.is_online && event.meeting_link) msg += ` 🔗 Join: ${event.meeting_link}`;

        totalNotifications += await notify(userIds, msg, "event_reminder_24h");
      }
    }

    // ─── Tier 2: 2 hours before → push for OFFLINE events ───
    {
      const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const in2h10 = new Date(in2h.getTime() + 10 * 60 * 1000);

      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("is_online", false)
        .gte("start_time", in2h.toISOString())
        .lt("start_time", in2h10.toISOString());

      for (const event of events ?? []) {
        const isMandatory = event.is_mandatory;
        const userIds = isMandatory
          ? await getAllUserIds()
          : await getRsvpUserIds(event.id);

        let msg = `🔔 Starting in 2 hours: "${event.title}"`;
        if (event.location) msg += ` 📍 ${event.location}`;

        totalNotifications += await notify(userIds, msg, "event_reminder_2h");
      }
    }

    // ─── Tier 3: 10 minutes before → push for OFFLINE events ───
    {
      const in10m = new Date(now.getTime() + 10 * 60 * 1000);
      const in10m10 = new Date(in10m.getTime() + 10 * 60 * 1000);

      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("is_online", false)
        .gte("start_time", in10m.toISOString())
        .lt("start_time", in10m10.toISOString());

      for (const event of events ?? []) {
        const isMandatory = event.is_mandatory;
        const userIds = isMandatory
          ? await getAllUserIds()
          : await getRsvpUserIds(event.id);

        let msg = `🔔 Starting in 10 minutes: "${event.title}"`;
        if (event.location) msg += ` 📍 ${event.location}`;

        totalNotifications += await notify(userIds, msg, "event_reminder_10m");
      }
    }

    console.log(`Created ${totalNotifications} notifications total`);

    return new Response(JSON.stringify({ created: totalNotifications }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in event-reminder:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
