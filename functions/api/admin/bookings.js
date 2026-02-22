export async function onRequestGet({ request, env }) {
  const token = request.headers.get("X-Admin-Token") || "";
  if (!token || token !== env.ADMIN_TOKEN) return new Response("Unauthorized", { status: 401 });

  const state = await env.APP_KV.get("state", "json");
  if (!state) return new Response("Missing state", { status: 500 });

  return new Response(JSON.stringify({ bookingsConfirmed: state.bookingsConfirmed }), {
    status: 200,
    headers: { "Content-Type":"application/json", "Cache-Control":"no-store" }
  });
}
