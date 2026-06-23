import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { email, password, name, role } = await req.json();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list.users.find((u) => u.email === email);

  if (!user) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "create failed" }), { status: 500 });
    }
    user = created.user;
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Ensure profile + role
  await admin.from("profiles").upsert({ id: user.id, email, name: name || email, role: role || "agent" });
  await admin.from("user_roles").upsert({ user_id: user.id, role: role || "agent" }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ ok: true, user_id: user.id }), {
    headers: { "content-type": "application/json" },
  });
});
