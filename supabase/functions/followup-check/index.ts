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

    // Find clients in active/opportunity stage with last_contact_at > 15 days ago
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const { data: overdueClients, error: fetchError } = await supabase
      .from("clients")
      .select("id, name, agent_id, last_contact_at, stage")
      .in("stage", ["active", "opportunity"])
      .lt("last_contact_at", fifteenDaysAgo.toISOString());

    if (fetchError) {
      console.error("Error fetching overdue clients:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${overdueClients?.length ?? 0} overdue clients`);

    if (!overdueClients || overdueClients.length === 0) {
      return new Response(JSON.stringify({ message: "No overdue clients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by agent
    const agentClients: Record<string, typeof overdueClients> = {};
    for (const client of overdueClients) {
      if (!agentClients[client.agent_id]) agentClients[client.agent_id] = [];
      agentClients[client.agent_id].push(client);
    }

    // Create notifications for each agent
    const notifications = [];
    for (const [agentId, clients] of Object.entries(agentClients)) {
      const clientNames = clients.map((c) => c.name).join(", ");
      const message = clients.length === 1
        ? `Client "${clients[0].name}" hasn't been contacted in 15+ days. Please follow up.`
        : `${clients.length} clients need follow-up (15+ days since last contact): ${clientNames}`;

      notifications.push({
        user_id: agentId,
        message,
        type: "followup_reminder",
      });
    }

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Error creating notifications:", insertError);
      throw insertError;
    }

    console.log(`Created ${notifications.length} reminder notifications`);

    return new Response(JSON.stringify({ created: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in followup-check:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
