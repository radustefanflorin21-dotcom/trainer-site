import Stripe from "stripe";

export async function onRequestPost({ request, env }) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20"
  });

  const data = await request.json();

  const slotKey = String(data.slotKey || "");
  const type = String(data.type || "");
  const firstName = String(data.firstName || "").trim();
  const lastName = String(data.lastName || "").trim();
  const phone = String(data.phone || "").trim();
  const message = String(data.message || "").trim();

  if (!slotKey || !["single", "common"].includes(type) || !firstName || !lastName || !phone) {
    return text("Invalid input.", 400);
  }

  const state = await loadState(env);

  // Availability checks
  if (state.blocked[slotKey]) return text("This slot is blocked.", 409);

  const confirmedForSlot = state.bookingsConfirmed.filter(b => b.slotKey === slotKey);
  const hasSingle = confirmedForSlot.some(b => b.type === "single");
  const hasCommon = confirmedForSlot.some(b => b.type === "common");

  if (hasSingle) return text("This slot is already single-booked.", 409);
  // Business rule: if common exists, disallow single
  if (type === "single" && hasCommon) return text("Single not available: already common-booked.", 409);

  const amountRon = type === "single" ? state.prices.singleRon : state.prices.commonRon;

  // Stripe expects amount in minor units (RON -> bani). Charge whole RON * 100.
  const amount = Math.round(Number(amountRon) * 100);
  if (!Number.isFinite(amount) || amount <= 0) return text("Invalid price configuration.", 500);

  const siteUrl = env.SITE_URL.replace(/\/$/, "");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cancel.html`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "ron",
        unit_amount: amount,
        product_data: {
          name: type === "single" ? "Single training session (1h)" : "Common training session (1h)"
        }
      }
    }],
    metadata: {
      slotKey,
      type,
      firstName,
      lastName,
      phone,
      message
    }
  });

  // Save pending booking mapped to session.id
  state.pending[session.id] = {
    slotKey, type, firstName, lastName, phone, message,
    createdAt: Date.now()
  };
  await env.APP_KV.put("state", JSON.stringify(state));

  return json({ url: session.url });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
function text(msg, status = 200) {
  return new Response(msg, { status, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" }});
}

async function loadState(env) {
  const raw = await env.APP_KV.get("state", "json");
  if (!raw) {
    const seed = {
      profile: {
        name: "Alex Strong",
        subtitle: "Personal Fitness Trainer · Bucharest",
        info: "I help people build sustainable strength, lose fat, improve mobility, and feel confident in the gym.",
        photoUrl: "https://images.unsplash.com/photo-1550345332-09e3ac987658?q=80&w=1200&auto=format&fit=crop"
      },
      prices: { singleRon: 200, commonRon: 120 },
      about: [{ id:"ab-1", type:"text", title:"My approach", text:"Sustainable strength, movement quality, and habits you can keep." }],
      achievements: [],
      blocked: {},
      bookingsConfirmed: [],
      pending: {}
    };
    await env.APP_KV.put("state", JSON.stringify(seed));
    return seed;
  }
  return raw;
}
