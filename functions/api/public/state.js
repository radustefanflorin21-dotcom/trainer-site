export async function onRequestGet({ env }) {
  const state = await loadState(env);

  // Build calendar map: slotKey -> {kind, count}
  // Do NOT expose PII publicly.
  const calendar = {};
  const bookings = state.bookingsConfirmed;
  const blocked = state.blocked;

  // blocked
  for (const slotKey of Object.keys(blocked)) {
    calendar[slotKey] = { kind: "blocked", count: 0 };
  }

  // bookings
  for (const b of bookings) {
    if (calendar[b.slotKey]?.kind === "blocked") continue;
    if (!calendar[b.slotKey]) calendar[b.slotKey] = { kind: "free", count: 0 };

    if (b.type === "single") {
      calendar[b.slotKey] = { kind: "single", count: 1 };
    } else if (b.type === "common") {
      if (calendar[b.slotKey].kind !== "single") {
        calendar[b.slotKey] = { kind: "common", count: (calendar[b.slotKey].count || 0) + 1 };
      }
    }
  }

  const body = {
    profile: state.profile,
    prices: state.prices,
    about: state.about,
    achievements: state.achievements,
    blocked: state.blocked,
    calendar
  };

  return json(body);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

async function loadState(env) {
  const raw = await env.APP_KV.get("state", "json");
  if (raw) return raw;

  const seed = {
    profile: {
      name: "Alex Strong",
      subtitle: "Personal Fitness Trainer · Bucharest",
      info: "I help people build sustainable strength, lose fat, improve mobility, and feel confident in the gym.",
      photoUrl: "https://images.unsplash.com/photo-1550345332-09e3ac987658?q=80&w=1200&auto=format&fit=crop"
    },
    prices: { singleRon: 200, commonRon: 120 },
    about: [
      { id: "ab-1", type: "text", title: "My approach", text: "Sustainable strength, movement quality, and habits you can keep." }
    ],
    achievements: [],
    blocked: {},
    bookingsConfirmed: [],
    pending: {}
  };

  await env.APP_KV.put("state", JSON.stringify(seed));
  return seed;
}
