const API = "/api";

function qs(id){ return document.getElementById(id); }

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeHtmlAttr(s){ return escapeHtml(s); }

function pad2(n){ return String(n).padStart(2, "0"); }
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}
function addDays(date, days){ const d = new Date(date); d.setDate(d.getDate()+days); return d; }
function fmtDayLabel(date){
  return date.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
}
function fmtSlotLabel(date){
  return date.toLocaleString(undefined, { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}
function isoSlotKey(date){
  const d = new Date(date);
  d.setMinutes(0,0,0);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth()+1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  return `${yyyy}-${mm}-${dd}T${hh}:00`;
}

function youtubeEmbedUrl(url){
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim();
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
  } catch {}
  return null;
}
function renderVideoEmbed(url){
  const yt = youtubeEmbedUrl(url);
  if (yt) {
    return `<iframe src="${escapeHtmlAttr(yt)}" title="Video" frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>`;
  }
  return `<video controls src="${escapeHtmlAttr(url)}"></video>`;
}

/* ---------- Trainer auth (simple admin token) ---------- */
const ADMIN_TOKEN_KEY = "trainer_admin_token_v1";

function getAdminToken(){
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}
function setAdminToken(token){
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function markActiveNav(){
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === path);
  });
}

async function apiGet(path){
  const res = await fetch(`${API}${path}`, { headers: { "Accept":"application/json" }});
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function adminPut(path, body){
  const token = getAdminToken();
  const res = await fetch(`${API}${path}`, {
    method:"PUT",
    headers:{
      "Content-Type":"application/json",
      "X-Admin-Token": token
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function initTrainerButton(){
  const btn = qs("trainerModeBtn");
  const hint = qs("trainerModeHint");
  if (!btn) return;

  function refresh(){
    const on = !!getAdminToken();
    btn.textContent = on ? "Trainer mode: ON" : "Trainer mode: OFF";
    if (hint) hint.style.display = on ? "block" : "none";
    document.dispatchEvent(new CustomEvent("trainer-changed"));
  }

  btn.addEventListener("click", () => {
    const on = !!getAdminToken();
    if (!on) {
      const token = prompt("Enter trainer admin token:");
      if (!token) return;
      setAdminToken(token.trim());
    } else {
      setAdminToken("");
    }
    refresh();
  });

  refresh();
}

/* ---------- Load public state ---------- */
let PUBLIC = null;
async function loadPublic(){
  PUBLIC = await apiGet("/public/state");
  return PUBLIC;
}


/* ---------- Profile (name/subtitle/info/photo) ---------- */
function initProfileUI(){
  function apply(){
    const p = (PUBLIC && PUBLIC.profile) ? PUBLIC.profile : {};
    const name = p.name || "Alex Strong";
    const subtitle = p.subtitle || "";
    const info = p.info || "";
    const photo = p.photoUrl || "";

    const brandName = qs("brandName");
    const brandSub = qs("brandSub");
    if (brandName) brandName.textContent = name;
    if (brandSub) brandSub.textContent = subtitle || brandSub.textContent;

    const avatar = qs("brandAvatar");
    if (avatar) {
      if (photo) {
        avatar.style.backgroundImage = `url("${photo.replaceAll('"', '%22')}")`;
        avatar.classList.add("has-photo");
      } else {
        avatar.style.backgroundImage = "";
        avatar.classList.remove("has-photo");
      }
    }

    const inlineName = qs("trainerNameInline");
    if (inlineName) inlineName.textContent = name;

    const subtitleEl = qs("trainerSubtitle");
    if (subtitleEl) subtitleEl.textContent = subtitle;

    const infoEl = qs("trainerInfo");
    if (infoEl) infoEl.textContent = info;

    const photoEl = qs("trainerPhoto");
    if (photoEl && photo) photoEl.src = photo;
  }

  function applyTrainerUI(){
    const isTrainer = !!getAdminToken();
    const btn = qs("editProfileBtn");
    if (btn) btn.style.display = isTrainer ? "inline-flex" : "none";
  }

  const overlay = qs("profileOverlay");
  const modal = qs("profileModal");
  const closeBtn = qs("profileCloseBtn");
  const saveBtn = qs("profileSaveBtn");
  const btn = qs("editProfileBtn");

  function close(){ if (overlay) overlay.style.display = "none"; }

  if (btn) {
    btn.addEventListener("click", () => {
      if (!getAdminToken()) return alert("Trainer mode required.");
      const p = (PUBLIC && PUBLIC.profile) ? PUBLIC.profile : {};
      qs("inpTrainerName").value = p.name || "";
      qs("inpTrainerSubtitle").value = p.subtitle || "";
      qs("inpTrainerInfo").value = p.info || "";
      qs("inpTrainerPhoto").value = p.photoUrl || "";

      if (overlay) overlay.style.display = "flex";
    });
  }

  if (overlay && modal) {
    overlay.addEventListener("click", close);
    modal.addEventListener("click", (e) => e.stopPropagation());
  }
  if (closeBtn) closeBtn.addEventListener("click", close);

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const name = qs("inpTrainerName").value.trim();
      const subtitle = qs("inpTrainerSubtitle").value.trim();
      const info = qs("inpTrainerInfo").value.trim();
      const photoUrl = qs("inpTrainerPhoto").value.trim();

      if (!name) return alert("Trainer name is required.");

      try {
        await adminPut("/admin/state", { profile: { name, subtitle, info, photoUrl } });
        PUBLIC = await loadPublic();
        apply();
        close();
        alert("Profile saved.");
      } catch (e) {
        alert(`Save failed: ${e.message}`);
      }
    });
  }

  document.addEventListener("trainer-changed", applyTrainerUI);
  applyTrainerUI();
  apply();
}

/* ---------- Home: About + Prices (trainer editable) ---------- */

function initHome(){
  const aboutRoot = qs("aboutBlocks");
  const editAboutBtn = qs("editAboutBtn");
  const editPricesBtn = qs("editPricesBtn");
  const priceSingle = qs("priceSingle");
  const priceCommon = qs("priceCommon");

  const aboutOverlay = qs("aboutOverlay");
  const aboutModal = qs("aboutModal");
  const aboutCloseBtn = qs("aboutCloseBtn");
  const aboutAddBtn = qs("aboutAddBtn");
  const aboutAddType = qs("aboutAddType");
  const aboutEditList = qs("aboutEditList");

  const pricesOverlay = qs("pricesOverlay");
  const pricesModal = qs("pricesModal");
  const pricesCloseBtn = qs("pricesCloseBtn");
  const pricesSaveBtn = qs("pricesSaveBtn");
  const inpSingle = qs("inpSingleRon");
  const inpCommon = qs("inpCommonRon");

  if (!aboutRoot && !priceSingle) return;

  function applyTrainerUI(){
    const isTrainer = !!getAdminToken();
    if (editAboutBtn) editAboutBtn.style.display = isTrainer ? "inline-flex" : "none";
    if (editPricesBtn) editPricesBtn.style.display = isTrainer ? "inline-flex" : "none";
  }

  function render(){
    if (!PUBLIC) return;

    if (priceSingle) priceSingle.textContent = `${PUBLIC.prices.singleRon} RON`;
    if (priceCommon) priceCommon.textContent = `${PUBLIC.prices.commonRon} RON`;

    if (aboutRoot) {
      aboutRoot.innerHTML = "";
      for (const b of PUBLIC.about) {
        const wrap = document.createElement("div");
        wrap.className = "aboutBlock";

        if (b.type === "text") {
          wrap.innerHTML = `
            <div style="font-weight:800;margin-bottom:6px">${escapeHtml(b.title || "Text")}</div>
            <div class="p" style="margin:0">${escapeHtml(b.text || "")}</div>`;
        } else if (b.type === "image") {
          wrap.innerHTML = `
            <div style="font-weight:800;margin-bottom:10px">${escapeHtml(b.title || "Image")}</div>
            <img src="${escapeHtmlAttr(b.src || "")}" alt="${escapeHtmlAttr(b.title || "Image")}"/>`;
        } else if (b.type === "video") {
          wrap.innerHTML = `
            <div style="font-weight:800;margin-bottom:10px">${escapeHtml(b.title || "Video")}</div>
            ${renderVideoEmbed(b.url || "")}`;
        } else {
          wrap.innerHTML = `<div class="small">Unknown block</div>`;
        }
        aboutRoot.appendChild(wrap);
      }
    }
  }

  // Prices editor
  if (editPricesBtn) {
    editPricesBtn.addEventListener("click", () => {
      if (!getAdminToken()) return alert("Trainer mode required.");
      inpSingle.value = String(PUBLIC.prices.singleRon);
      inpCommon.value = String(PUBLIC.prices.commonRon);
      pricesOverlay.style.display = "flex";
    });
  }
  if (pricesOverlay && pricesModal) {
    pricesOverlay.addEventListener("click", () => pricesOverlay.style.display = "none");
    pricesModal.addEventListener("click", (e) => e.stopPropagation());
    pricesCloseBtn.addEventListener("click", () => pricesOverlay.style.display = "none");
    pricesSaveBtn.addEventListener("click", async () => {
      const singleRon = Number(inpSingle.value);
      const commonRon = Number(inpCommon.value);
      if (!Number.isFinite(singleRon) || singleRon <= 0) return alert("Invalid single price.");
      if (!Number.isFinite(commonRon) || commonRon <= 0) return alert("Invalid common price.");
      try {
        await adminPut("/admin/state", { prices: { singleRon, commonRon }});
        PUBLIC = await loadPublic();
        render();
        pricesOverlay.style.display = "none";
        alert("Prices saved.");
      } catch (e) {
        alert(`Save failed: ${e.message}`);
      }
    });
  }

  // About editor
  function openAboutEditor(){
    if (!getAdminToken()) return alert("Trainer mode required.");
    aboutOverlay.style.display = "flex";

    async function saveAbout(){
      try {
        await adminPut("/admin/state", { about: PUBLIC.about });
        PUBLIC = await loadPublic();
        render();
        rerenderEditor();
      } catch (e) {
        alert(`Save failed: ${e.message}`);
      }
    }

    function rerenderEditor(){
      aboutEditList.innerHTML = "";
      PUBLIC.about.forEach((b, idx) => {
        const row = document.createElement("div");
        row.className = "card";
        row.style.padding = "12px";
        row.style.background = "rgba(255,255,255,.03)";
        const upDisabled = idx === 0 ? "disabled" : "";
        const downDisabled = idx === PUBLIC.about.length - 1 ? "disabled" : "";
        row.innerHTML = `
          <div class="spread">
            <div>
              <div style="font-weight:800">${escapeHtml(b.type.toUpperCase())}: ${escapeHtml(b.title || "")}</div>
              <div class="small">${escapeHtml(previewBlock(b))}</div>
            </div>
            <div class="row">
              <button class="btn" data-up="${b.id}" ${upDisabled}>↑</button>
              <button class="btn" data-down="${b.id}" ${downDisabled}>↓</button>
              <button class="btn" data-edit="${b.id}">Edit</button>
              <button class="btn danger" data-del="${b.id}">Delete</button>
            </div>
          </div>`;
        aboutEditList.appendChild(row);
      });

      aboutEditList.querySelectorAll("button[data-up]").forEach(btn => btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-up");
        const i = PUBLIC.about.findIndex(x => x.id === id);
        if (i > 0) {
          const tmp = PUBLIC.about[i-1]; PUBLIC.about[i-1] = PUBLIC.about[i]; PUBLIC.about[i] = tmp;
          await saveAbout();
        }
      }));
      aboutEditList.querySelectorAll("button[data-down]").forEach(btn => btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-down");
        const i = PUBLIC.about.findIndex(x => x.id === id);
        if (i >= 0 && i < PUBLIC.about.length - 1) {
          const tmp = PUBLIC.about[i+1]; PUBLIC.about[i+1] = PUBLIC.about[i]; PUBLIC.about[i] = tmp;
          await saveAbout();
        }
      }));
      aboutEditList.querySelectorAll("button[data-del]").forEach(btn => btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        if (!confirm("Delete this block?")) return;
        PUBLIC.about = PUBLIC.about.filter(x => x.id !== id);
        await saveAbout();
      }));
      aboutEditList.querySelectorAll("button[data-edit]").forEach(btn => btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-edit");
        const b = PUBLIC.about.find(x => x.id === id);
        if (!b) return;

        const title = prompt("Title:", b.title || "");
        if (title === null) return;

        if (b.type === "text") {
          const text = prompt("Text:", b.text || "");
          if (text === null) return;
          b.title = title; b.text = text;
          await saveAbout();
          return;
        }
        if (b.type === "image") {
          const src = prompt("Image URL:", b.src || "");
          if (src === null) return;
          b.title = title; b.src = src.trim();
          await saveAbout();
          return;
        }
        if (b.type === "video") {
          const url = prompt("Video URL (YouTube link or direct mp4):", b.url || "");
          if (url === null) return;
          b.title = title; b.url = url.trim();
          await saveAbout();
          return;
        }
      }));
    }

    function previewBlock(b){
      if (b.type === "text") return (b.text || "").slice(0, 80);
      if (b.type === "image") return (b.src || "").slice(0, 80);
      if (b.type === "video") return (b.url || "").slice(0, 80);
      return "";
    }

    aboutAddBtn.onclick = async () => {
      const type = aboutAddType.value;
      const id = crypto.randomUUID();
      if (type === "text") PUBLIC.about.push({ id, type:"text", title:"New text", text:"" });
      if (type === "image") PUBLIC.about.push({ id, type:"image", title:"New image", src:"" });
      if (type === "video") PUBLIC.about.push({ id, type:"video", title:"New video", url:"" });
      await saveAbout();
    };

    rerenderEditor();
  }

  if (editAboutBtn) editAboutBtn.addEventListener("click", openAboutEditor);

  if (aboutOverlay && aboutModal) {
    aboutOverlay.addEventListener("click", () => aboutOverlay.style.display = "none");
    aboutModal.addEventListener("click", (e) => e.stopPropagation());
    aboutCloseBtn.addEventListener("click", () => aboutOverlay.style.display = "none");
  }

  document.addEventListener("trainer-changed", () => applyTrainerUI());
  applyTrainerUI();
  render();
}

/* ---------- Achievements (trainer-only edit) ---------- */
function initAchievements(){
  const list = qs("progressList");
  const trainerWrap = qs("trainerOnlyWrap");
  const emptyMsg = qs("progressEmptyMsg");

  const form = qs("addProgressForm");
  const pTitle = qs("pTitle");
  const pNote = qs("pNote");
  const pImage = qs("pImageUrl");

  const editOverlay = qs("editProgOverlay");
  const editModal = qs("editProgModal");

  if (!list) return;

  function applyTrainerUI(){
    const isTrainer = !!getAdminToken();
    if (trainerWrap) trainerWrap.style.display = isTrainer ? "block" : "none";
  }

  function render(){
    list.innerHTML = "";
    const items = (PUBLIC?.achievements || []);
    if (!items.length) {
      if (emptyMsg) emptyMsg.style.display = "block";
      return;
    }
    if (emptyMsg) emptyMsg.style.display = "none";

    const isTrainer = !!getAdminToken();
    for (const p of items) {
      const card = document.createElement("div");
      card.className = "card progressCard";
      card.style.padding = "12px";

      const actions = isTrainer ? `
        <div class="row" style="margin-top:10px">
          <button class="btn" data-edit="${p.id}">Edit</button>
          <button class="btn danger" data-del="${p.id}">Delete</button>
        </div>` : "";

      card.innerHTML = `
        <img src="${escapeHtmlAttr(p.image)}" alt="${escapeHtmlAttr(p.title)}"/>
        <div style="margin-top:10px;font-weight:800">${escapeHtml(p.title)}</div>
        <div class="small" style="margin-top:8px">${escapeHtml(p.note || "")}</div>
        <div class="small" style="margin-top:8px">${new Date(p.createdAt).toLocaleString()}</div>
        ${actions}
      `;
      list.appendChild(card);
    }

    if (isTrainer) {
      list.querySelectorAll("button[data-del]").forEach(btn => btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        if (!confirm("Delete this post?")) return;
        try {
          const next = PUBLIC.achievements.filter(x => x.id !== id);
          await adminPut("/admin/state", { achievements: next });
          PUBLIC = await loadPublic();
          render();
        } catch (e) {
          alert(`Delete failed: ${e.message}`);
        }
      }));

      list.querySelectorAll("button[data-edit]").forEach(btn => btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit");
        const item = PUBLIC.achievements.find(x => x.id === id);
        if (!item) return;
        openEdit(item);
      }));
    }
  }

  function openEdit(item){
    if (!getAdminToken()) return alert("Trainer mode required.");
    editOverlay.style.display = "flex";

    qs("epTitle").value = item.title || "";
    qs("epNote").value = item.note || "";
    qs("epImage").value = item.image || "";

    const close = () => { editOverlay.style.display = "none"; };
    qs("epCloseBtn").onclick = close;
    editOverlay.onclick = close;
    editModal.onclick = (e) => e.stopPropagation();

    qs("epSaveBtn").onclick = async () => {
      const title = qs("epTitle").value.trim();
      const note = qs("epNote").value.trim();
      const image = qs("epImage").value.trim();
      if (!title || !image) return alert("Title and Image URL are required.");

      try {
        const next = PUBLIC.achievements.map(x => x.id === item.id ? { ...x, title, note, image } : x);
        await adminPut("/admin/state", { achievements: next });
        PUBLIC = await loadPublic();
        render();
        close();
      } catch (e) {
        alert(`Save failed: ${e.message}`);
      }
    };
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!getAdminToken()) return alert("Trainer mode required.");

      const title = pTitle.value.trim();
      const note = pNote.value.trim();
      const image = pImage.value.trim();
      if (!title || !image) return alert("Title + Image URL required.");

      try {
        const next = [
          {
            id: crypto.randomUUID(),
            title,
            note,
            image,
            createdAt: Date.now()
          },
          ...PUBLIC.achievements
        ];
        await adminPut("/admin/state", { achievements: next });
        PUBLIC = await loadPublic();
        form.reset();
        render();
      } catch (err) {
        alert(`Add failed: ${err.message}`);
      }
    });
  }

  document.addEventListener("trainer-changed", () => applyTrainerUI());
  applyTrainerUI();
  render();
}

/* ---------- Booking Calendar + Stripe redirect ---------- */
function initBooking(){
  const calRoot = qs("calendarRoot");
  if (!calRoot) return;

  let weekStart = startOfWeek(new Date());
  const hours = Array.from({length: 14}, (_,i)=> i+7);

  const overlay = qs("modalOverlay");
  const modal = qs("modal");

  function render(){
    const days = Array.from({length:7}, (_,i)=> addDays(weekStart, i));
    qs("weekLabel").textContent = `${days[0].toLocaleDateString()} — ${days[6].toLocaleDateString()}`;

    calRoot.innerHTML = "";
    calRoot.className = "calWrap";
    const cal = document.createElement("div");
    cal.className = "cal";
    calRoot.appendChild(cal);

    cal.appendChild(cellDiv("headCell",""));
    for (const d of days) {
      const h = document.createElement("div");
      h.className = "headCell";
      h.innerHTML = `<div style="font-weight:800">${fmtDayLabel(d)}</div><div class="small">${d.getFullYear()}</div>`;
      cal.appendChild(h);
    }

    for (const hour of hours) {
      const tc = cellDiv("timeCell", `${pad2(hour)}:00`);
      cal.appendChild(tc);

      for (const d of days) {
        const dt = new Date(d);
        dt.setHours(hour,0,0,0);
        const key = isoSlotKey(dt);

        const st = PUBLIC.calendar[key] || { kind:"free", count:0 };
        const cls = `slot ${st.kind}`;
        let subtitle = "Available";
        if (st.kind === "single") subtitle = "Single (exclusive)";
        if (st.kind === "common") subtitle = `Common (booked: ${st.count})`;
        if (st.kind === "blocked") subtitle = "Unavailable";

        const cell = document.createElement("div");
        cell.className = cls;
        cell.innerHTML = `<div class="mini">${subtitle}</div>`;

        // Trainer block/unblock via right click
        cell.addEventListener("contextmenu", async (e) => {
          e.preventDefault();
          if (!getAdminToken()) return;
          try {
            const nextBlocked = { ...PUBLIC.blocked };
            if (nextBlocked[key]) delete nextBlocked[key];
            else nextBlocked[key] = { createdAt: Date.now() };
            await adminPut("/admin/state", { blocked: nextBlocked });
            PUBLIC = await loadPublic();
            render();
          } catch (err) {
            alert(`Block failed: ${err.message}`);
          }
        });

        // booking via click
        cell.addEventListener("click", () => {
          if (st.kind === "blocked") return;
          if (st.kind === "single") return alert("This is already single-booked. Choose another slot.");
          openBookingModal(key, dt, st);
        });

        cal.appendChild(cell);
      }
    }

    const trainerHelp = qs("trainerHelp");
    if (trainerHelp) trainerHelp.style.display = getAdminToken() ? "block" : "none";
  }

  function cellDiv(cls, txt){
    const d = document.createElement("div");
    d.className = cls;
    d.textContent = txt;
    return d;
  }

  qs("prevWeekBtn")?.addEventListener("click", () => { weekStart = addDays(weekStart, -7); render(); });
  qs("thisWeekBtn")?.addEventListener("click", () => { weekStart = startOfWeek(new Date()); render(); });
  qs("nextWeekBtn")?.addEventListener("click", () => { weekStart = addDays(weekStart, 7); render(); });

  qs("clearBookingsBtn")?.addEventListener("click", async () => {
    if (!getAdminToken()) return alert("Trainer mode required.");
    if (!confirm("Clear ALL bookings?")) return;
    await adminPut("/admin/state", { clearBookings: true });
    PUBLIC = await loadPublic();
    render();
  });

  qs("clearBlockedBtn")?.addEventListener("click", async () => {
    if (!getAdminToken()) return alert("Trainer mode required.");
    if (!confirm("Clear ALL blocked slots?")) return;
    await adminPut("/admin/state", { blocked: {} });
    PUBLIC = await loadPublic();
    render();
  });

  function openBookingModal(slotKey, slotDate, st){
    overlay.style.display = "flex";
    qs("slotLabel").textContent = `${fmtSlotLabel(slotDate)} (1 hour)`;

    const singleOpt = qs("bookingTypeSingle");
    if (st.kind === "common") {
      singleOpt.disabled = true;
      singleOpt.textContent = "Single (exclusive) — not available (already common booked)";
      if (qs("bookingType").value === "single") qs("bookingType").value = "common";
    } else {
      singleOpt.disabled = false;
      singleOpt.textContent = "Single (exclusive)";
    }

    qs("firstName").value = "";
    qs("lastName").value = "";
    qs("phone").value = "";
    qs("message").value = "";
    qs("payError").textContent = "";

    const close = () => { overlay.style.display = "none"; };
    qs("closeModalBtn").onclick = close;
    overlay.onclick = close;
    modal.onclick = (e) => e.stopPropagation();

    qs("payConfirmBtn").onclick = async () => {
      const type = qs("bookingType").value;
      const firstName = qs("firstName").value.trim();
      const lastName = qs("lastName").value.trim();
      const phone = qs("phone").value.trim();
      const message = qs("message").value.trim();

      if (!firstName || !lastName || !phone) return alert("Please fill First name, Surname, Phone.");

      const btn = qs("payConfirmBtn");
      btn.disabled = true;
      btn.textContent = "Redirecting…";
      qs("payError").textContent = "";

      try {
        const res = await fetch(`${API}/public/create-checkout-session`, {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ slotKey, type, firstName, lastName, phone, message })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        location.href = data.url; // Stripe Checkout
      } catch (err) {
        qs("payError").textContent = err.message;
        btn.disabled = false;
        btn.textContent = "Pay & confirm";
      }
    };
  }

  render();
}

/* ---------- Success page: poll confirmation ---------- */
async function initSuccess(){
  const msg = qs("successMsg");
  if (!msg) return;

  const params = new URLSearchParams(location.search);
  const sessionId = params.get("session_id");
  if (!sessionId) {
    msg.textContent = "Missing session_id.";
    return;
  }

  msg.textContent = "Payment received. Confirming booking…";

  for (let i = 0; i < 12; i++) {
    try {
      const res = await apiGet(`/public/confirm?session_id=${encodeURIComponent(sessionId)}`);
      if (res.status === "confirmed") {
        msg.textContent = "✅ Booking confirmed! You can return to the calendar.";
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 2500));
  }

  msg.textContent = "Payment completed. Booking confirmation is still processing. Refresh in a moment.";
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  markActiveNav();
  initTrainerButton();

  try {
    await loadPublic();
  } catch (e) {
    alert("Failed to load site data from server. Check deployment.");
    return;
  }

  initProfileUI();
  initHome();
  initAchievements();
  initBooking();
  initSuccess();
});
