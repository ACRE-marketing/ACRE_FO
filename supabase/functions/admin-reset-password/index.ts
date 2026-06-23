import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { email, password } = await req.json();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: list } = await admin.auth.admin.listUsers();
  const user = list.users.find((u) => u.email === email);
  if (!user) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  return new Response(JSON.stringify({ ok: !error, error: error?.message }), {
    headers: { "content-type": "application/json" },
  });
});
