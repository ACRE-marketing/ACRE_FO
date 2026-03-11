import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { rawText } = await req.json();

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an event information extractor. Given raw event text (often pasted from emails/messages), extract structured event data. Return a JSON object with these fields:
- title: The event name/title (clean, concise)
- description: Key information only (special offers, important details). Remove the title from here if duplicated. Remove irrelevant instructions like "reply in the group". Keep it concise and useful.
- event_type: one of "activity", "training", "admin" (guess from context, default "activity")
- external_rsvp_url: If there's an external RSVP/registration link (e.g. forms.office.com, Google Forms, etc.), extract the full URL. Otherwise null.
- area: General area/neighborhood mentioned (e.g. "Williamsburg", "Manhattan"). Otherwise null.
- location: Specific address if mentioned. Otherwise null.
- start_time: ISO datetime string if a date/time is mentioned. Otherwise null.
- end_time: ISO datetime string if end time mentioned. Otherwise null.
- is_online: boolean, true if it mentions Zoom/Teams/virtual. Default false.
- meeting_link: Zoom/Teams link if found. Otherwise null.
- zoom_password: Meeting password if found. Otherwise null.

IMPORTANT: Only return valid JSON, no markdown code fences, no extra text.`
        },
        { role: "user", content: rawText }
      ],
      temperature: 0.1,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  
  // Strip markdown fences if present
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { error: "Failed to parse AI response", raw: cleaned };
  }

  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
