export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return json({ status: "missing" }, 400);

  const state = await env.APP_KV.get("state", "json");
  if (!state) return json({ status: "missing_state" }, 500);

  const confirmed = state.bookingsConfirmed.some(b => b.sessionId === sessionId);
  if (confirmed) return json({ status: "confirmed" });

  return json({ status: "pending" });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type":"application/json", "Cache-Control":"no-store" }
  });
}
