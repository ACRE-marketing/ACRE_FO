import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing code", { status: 400 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: link } = await supabase
      .from("tracking_links")
      .select("id, listing_id, listings(source_url)")
      .eq("short_code", code)
      .single();

    if (!link) {
      return new Response("Link not found", { status: 404 });
    }

    // Log the click
    await supabase.from("link_clicks").insert({
      link_id: link.id,
      user_agent: req.headers.get("user-agent") || null,
      referer: req.headers.get("referer") || null,
    });

    // Redirect to listing detail page or source URL
    const listing = link.listings as any;
    const redirectUrl = listing?.source_url || `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/listings/${link.listing_id}`;

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    });
  } catch (error) {
    console.error("Track click error:", error);
    return new Response("Error", { status: 500 });
  }
});
