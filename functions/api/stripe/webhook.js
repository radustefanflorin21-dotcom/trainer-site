import Stripe from "stripe";

export async function onRequestPost({ request, env }) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  const sig = request.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sessionId = session.id;

    const state = await env.APP_KV.get("state", "json");
    if (!state) return new Response("Missing state", { status: 500 });

    const pending = state.pending?.[sessionId];
    if (!pending) {
      return new Response("OK", { status: 200 });
    }

    // Confirm booking (re-check conflicts)
    if (state.blocked[pending.slotKey]) {
      delete state.pending[sessionId];
      await env.APP_KV.put("state", JSON.stringify(state));
      return new Response("OK", { status: 200 });
    }

    const confirmedForSlot = state.bookingsConfirmed.filter(b => b.slotKey === pending.slotKey);
    const hasSingle = confirmedForSlot.some(b => b.type === "single");
    const hasCommon = confirmedForSlot.some(b => b.type === "common");

    if (hasSingle) {
      delete state.pending[sessionId];
      await env.APP_KV.put("state", JSON.stringify(state));
      return new Response("OK", { status: 200 });
    }
    if (pending.type === "single" && hasCommon) {
      delete state.pending[sessionId];
      await env.APP_KV.put("state", JSON.stringify(state));
      return new Response("OK", { status: 200 });
    }

    state.bookingsConfirmed.push({
      id: crypto.randomUUID(),
      sessionId,
      slotKey: pending.slotKey,
      type: pending.type,
      firstName: pending.firstName,
      lastName: pending.lastName,
      phone: pending.phone,
      message: pending.message,
      createdAt: Date.now()
    });

    delete state.pending[sessionId];
    await env.APP_KV.put("state", JSON.stringify(state));
  }

  return new Response("OK", { status: 200 });
}
