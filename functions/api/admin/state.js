export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return new Response("Unauthorized", { status: 401 });

  const patch = await request.json();
  const state = await env.APP_KV.get("state", "json");
  if (!state) return new Response("Missing state", { status: 500 });

  if (patch.prices) {
    const singleRon = Number(patch.prices.singleRon);
    const commonRon = Number(patch.prices.commonRon);
    if (!Number.isFinite(singleRon) || singleRon <= 0) return new Response("Invalid singleRon", { status: 400 });
    if (!Number.isFinite(commonRon) || commonRon <= 0) return new Response("Invalid commonRon", { status: 400 });
    state.prices = { singleRon: Math.round(singleRon), commonRon: Math.round(commonRon) };
  }

  if (patch.about) state.about = patch.about;
  if (patch.achievements) state.achievements = patch.achievements;
  if (patch.blocked) state.blocked = patch.blocked;

  if (patch.clearBookings) state.bookingsConfirmed = [];

  await env.APP_KV.put("state", JSON.stringify(state));
  return json({ ok: true });
}

function isAdmin(request, env){
  const token = request.headers.get("X-Admin-Token") || "";
  return token && token === env.ADMIN_TOKEN;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type":"application/json", "Cache-Control":"no-store" }
  });
}
