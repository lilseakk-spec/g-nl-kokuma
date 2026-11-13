// Sabah Okuması — tek sayfalık, sunucusuz (GitHub Pages) okuma uygulaması.
// Tüm veriler tarayıcının localStorage'ında tutulur; yapay zekâ çağrıları
// kullanıcının kendi Claude API anahtarıyla doğrudan api.anthropic.com'a gider.

const SDK_URL = "https://esm.sh/@anthropic-ai/sdk@0.71.0";
const STORE_KEY = "sabah-okumasi.v1";
const ROLLOVER_HOUR = 4; // yeni gün 04:00'te başlar

const CATEGORIES = [
  "Bilim", "Uzay", "Tarih", "Biyografi", "Gerçek Olay", "Seyahat & Yerler",
  "Yemek Kültürü", "İcatlar & Buluşlar", "Teknoloji", "Gelecek Senaryoları",
  "Doğa & Hayvanlar", "Psikoloji & İnsan", "Sağlık & Beden", "Sanat & Kültür",
  "Ekonomi & Toplum", "Felsefe & Fikirler", "Dil & Kelimeler", "Gizemler",
];

const LENGTHS = {
  short: { words: "750–900", minutes: 5 },
  normal: { words: "1000–1200", minutes: 6 },
  long: { words: "1300–1600", minutes: 8 },
};

// ---------------------------------------------------------------- storage

const defaultState = () => ({
  settings: { apiKey: "", model: "claude-opus-5-5", length: "normal", fontScale: 1, theme: "auto" },
  profile: { cats: {}, tags: {} },
  days: {},      // "2026-11-13": { options: [...], pickedId, createdAt }
  articles: {},  // id: { id, day, option, content, status, notes, rating, createdAt, doneAt }
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base, ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      profile: { cats: {}, tags: {}, ...(parsed.profile || {}) },
    };
  } catch {
    return defaultState();
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    toast("Kaydedilemedi: tarayıcı depolaması dolu ya da kapalı.");
  }
}

// ---------------------------------------------------------------- helpers

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, "0");

function dayKey(d = new Date()) {
  const x = new Date(d.getTime() - ROLLOVER_HOUR * 3600e3);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
function keyToDate(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
function nextRollover() {
  const now = new Date();
  const t = new Date(now);
  t.setHours(ROLLOVER_HOUR, 0, 5, 0);
  if (t <= now) t.setDate(t.getDate() + 1);
  return t;
}
const fmtDay = (k, opts = { weekday: "long", day: "numeric", month: "long" }) =>
  keyToDate(k).toLocaleDateString("tr-TR", opts);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ---------------------------------------------------------------- markdown (küçük ve güvenli)

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|\W)_(?!\s)(.+?)_(?=\W|$)/g, "$1<em>$2</em>");
}

function md(src) {
  const lines = src.replace(/\r/g, "").split("\n");
  let html = "", para = [], list = null, quote = [];
  const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>`; para = []; } };
  const flushList = () => { if (list) { html += `<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`; list = null; } };
  const flushQuote = () => { if (quote.length) { html += `<blockquote>${md(quote.join("\n"))}</blockquote>`; quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const q = line.match(/^\s*>\s?(.*)$/);
    if (q) { flushPara(); flushList(); quote.push(q[1]); continue; }
    flushQuote();
    if (!line.trim()) { flushPara(); flushList(); continue; }
    let m;
    if ((m = line.match(/^#{1,2}\s+(.*)/))) { flushAll(); html += `<h2>${inline(m[1])}</h2>`; continue; }
    if ((m = line.match(/^#{3,6}\s+(.*)/))) { flushAll(); html += `<h3>${inline(m[1])}</h3>`; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushAll(); html += "<hr>"; continue; }
    if ((m = line.match(/^\s*[-*•]\s+(.*)/))) {
      flushPara();
      if (!list || list.type !== "ul") { flushList(); list = { type: "ul", items: [] }; }
      list.items.push(m[1]); continue;
    }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
      flushPara();
      if (!list || list.type !== "ol") { flushList(); list = { type: "ol", items: [] }; }
      list.items.push(m[1]); continue;
    }
    if (list) { list.items[list.items.length - 1] += " " + line.trim(); continue; }
    para.push(line.trim());
  }
  flushAll();
  return html;
}

// ---------------------------------------------------------------- Claude API

let sdkPromise;
function loadSdk() {
  sdkPromise ||= import(SDK_URL).then((m) => m.default || m.Anthropic);
  return sdkPromise;
}

async function getClient() {
  const key = state.settings.apiKey.trim();
  if (!key) throw new UserError("Önce Ayarlar'dan Claude API anahtarını ekle.");
  const Anthropic = await loadSdk();
  return { client: new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 2 }), Anthropic };
}

class UserError extends Error {}

function friendlyError(err, Anthropic) {
  if (err instanceof UserError) return err.message;
  const msg = String(err?.message || err);
  if (Anthropic) {
    if (err instanceof Anthropic.AuthenticationError) return "API anahtarı geçersiz görünüyor. Ayarlar'dan kontrol et.";
    if (err instanceof Anthropic.PermissionDeniedError) return "Bu anahtarın seçili modele erişimi yok. Ayarlar'dan başka bir model dene.";
    if (err instanceof Anthropic.NotFoundError) return "Seçili model bulunamadı. Ayarlar'dan başka bir model seç.";
    if (err instanceof Anthropic.RateLimitError) return "Çok fazla istek gönderildi. Bir dakika sonra tekrar dene.";
    if (err instanceof Anthropic.BadRequestError) {
      if (/credit balance/i.test(msg)) return "Claude hesabında kredi kalmamış. console.anthropic.com üzerinden bakiye ekleyebilirsin.";
      return "İstek reddedildi: " + msg;
    }
    if (err instanceof Anthropic.InternalServerError) return "Claude şu an yoğun. Biraz sonra tekrar dene.";
    if (err instanceof Anthropic.APIConnectionError) return "Bağlantı kurulamadı. İnternetini kontrol et.";
  }
  if (/Failed to fetch|NetworkError|import/i.test(msg)) return "Bağlantı kurulamadı. İnternetini kontrol et.";
  return "Bir şeyler ters gitti: " + msg;
}

// Opus 5.5 / Sonnet 5.5 için sunucu tarafı yedek model (güvenlik filtresi yanlışlıkla
// reddederse istek otomatik olarak başka modelde tamamlanır). Haiku'da bu özellik yok.
const supportsFallback = (model) => model === "claude-opus-5-5" || model === "claude-sonnet-5-5";
let fallbackDisabled = false;

function baseParams(extra) {
  const model = state.settings.model;
  const p = { model, ...extra };
  if (supportsFallback(model) && !fallbackDisabled) {
    p.betas = ["server-side-fallback-2026-07-01"];
    p.fallbacks = "default";
  }
  return p;
}

async function withFallbackRetry(fn, Anthropic) {
  try {
    return await fn();
  } catch (err) {
    // Hesap bu beta özelliğini desteklemiyorsa onsuz bir kez daha dene.
    if (!fallbackDisabled && err instanceof Anthropic.BadRequestError && /fallback|beta/i.test(String(err.message))) {
      fallbackDisabled = true;
      return await fn();
    }
    throw err;
  }
}

function finalText(message) {
  // Yedek model devreye girdiyse yalnızca son "fallback" bloğundan sonraki metni al.
  const blocks = message.content || [];
  let start = 0;
  blocks.forEach((b, i) => { if (b.type === "fallback") start = i + 1; });
  return blocks.slice(start).filter((b) => b.type === "text").map((b) => b.text).join("");
}

// ----- ilgi profili

function profileSummary() {
  const cats = Object.entries(state.profile.cats).sort((a, b) => b[1] - a[1]);
  const liked = cats.filter(([, v]) => v > 0.5).slice(0, 6).map(([k, v]) => `${k} (${v.toFixed(1)})`);
  const disliked = cats.filter(([, v]) => v < -0.8).slice(-4).map(([k]) => k);
  const tags = Object.entries(state.profile.tags).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).slice(0, 12).map(([k]) => k);

  const arts = Object.values(state.articles).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const picked = arts.slice(0, 12).map((a) => `- ${a.option.title} [${a.option.category}]${a.rating === 1 ? " — çok sevdi" : a.rating === -1 ? " — sevmedi" : ""}`);

  const seen = Object.values(state.days).flatMap((d) => d.options || []).map((o) => o.title).slice(-90);

  return { liked, disliked, tags, picked, seen };
}

function bumpProfile(option, catDelta, tagDelta) {
  const p = state.profile;
  p.cats[option.category] = (p.cats[option.category] || 0) + catDelta;
  for (const t of option.tags || []) {
    const k = t.toLowerCase().trim();
    if (k) p.tags[k] = (p.tags[k] || 0) + tagDelta;
  }
}

// ----- 1) günün üç seçeneği

const OPTIONS_SYSTEM = `Sen "Sabah Okuması" adlı bir uygulamanın editörüsün. Okur her sabah kahvesini içerken 5–8 dakikada okuyabileceği, merak uyandıran, bilgi dolu bir Türkçe yazı okumak istiyor. Her gün ona 3 farklı konu öneriyorsun; okur birini seçiyor.

Konu havuzun sınırsız: bilimsel makalelerden ve yeni araştırmalardan çıkan bulgular, gerçek olaylar, ilginç biyografiler, görülmesi gereken yerler ve seyahat hikâyeleri, bir yemeğin ya da alışkanlığın kökeni, icatlar ve buluşların arka planı, gelecekte olabilecek varsayımsal senaryolar, doğa, psikoloji, dil, sanat, ekonomi, gizemler…

Konu seçerken:
- Herkesin bildiği klişeler yerine "bunu bilmiyordum!" dedirten, somut ve şaşırtıcı bir açı bul. "Kahvenin tarihi" değil; "Kahveyi yasaklamaya çalışan padişah ve kahvehanelerin gizli gücü" gibi.
- Gerçek ve doğrulanabilir konular seç. Emin olmadığın olayları uydurma.
- Üç öneri birbirinden belirgin biçimde farklı kategorilerden olsun.
- İki öneri okurun ilgi profiline uysun; biri ise okurun henüz pek denemediği bir alandan, ufkunu açacak bir "keşif" önerisi olsun (explore=true).
- Önerileri okurun seçme olasılığına göre sırala (en olası ilk).
- Daha önce önerilmiş başlıkları ve konuları tekrar etme.

Her öneri için:
- title: kısa, çekici Türkçe başlık (en fazla ~70 karakter).
- hook: tek cümlelik merak uyandırıcı giriş.
- summary: yazının ne anlattığını 2–3 cümleyle, sade dille özetle.
- category: verilen listeden tam olarak biri.
- tags: konuyu tarif eden 3 kısa Türkçe etiket (küçük harf).
- angle: yazara iç not — yazının odak noktası, anlatılacak ana bilgiler/olaylar, varsa dayandığı gerçek çalışma veya kaynak (okura gösterilmez).
- minutes: tahmini okuma süresi (dakika).
- explore: keşif önerisiyse true.`;

const OPTIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["options"],
  properties: {
    options: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "hook", "summary", "category", "tags", "angle", "minutes", "explore"],
        properties: {
          title: { type: "string" },
          hook: { type: "string" },
          summary: { type: "string" },
          category: { type: "string", enum: CATEGORIES },
          tags: { type: "array", items: { type: "string" } },
          angle: { type: "string" },
          minutes: { type: "integer" },
          explore: { type: "boolean" },
        },
      },
    },
  },
};

let optionsInFlight = null;

function generateOptions(day) {
  if (optionsInFlight) return optionsInFlight;
  optionsInFlight = (async () => {
    const { client, Anthropic } = await getClient();
    try {
      const prof = profileSummary();
      const len = LENGTHS[state.settings.length] || LENGTHS.normal;
      const user = [
        `Bugünün tarihi: ${fmtDay(day, { day: "numeric", month: "long", year: "numeric", weekday: "long" })}.`,
        `Kategori listesi: ${CATEGORIES.join(", ")}.`,
        `Hedef okuma süresi: yaklaşık ${len.minutes} dakika.`,
        "",
        "OKURUN İLGİ PROFİLİ",
        prof.liked.length ? `Sevdiği kategoriler (puan): ${prof.liked.join(", ")}` : "Henüz yeterli veri yok — geniş bir yelpazeden, farklı türlerde öner.",
        prof.disliked.length ? `Pek ilgilenmediği kategoriler: ${prof.disliked.join(", ")}` : "",
        prof.tags.length ? `İlgi çeken etiketler: ${prof.tags.join(", ")}` : "",
        prof.picked.length ? `Son seçtiği yazılar:\n${prof.picked.join("\n")}` : "",
        "",
        prof.seen.length ? `DAHA ÖNCE ÖNERİLEN BAŞLIKLAR (tekrar etme):\n${prof.seen.map((t) => "- " + t).join("\n")}` : "",
        "",
        "Şimdi bugünün 3 önerisini hazırla.",
      ].filter((l) => l !== "").join("\n");

      const message = await withFallbackRetry(() => client.beta.messages.create(baseParams({
        max_tokens: 8000,
        system: OPTIONS_SYSTEM,
        output_config: { effort: "medium", format: { type: "json_schema", schema: OPTIONS_SCHEMA } },
        messages: [{ role: "user", content: user }],
      })), Anthropic);

      if (message.stop_reason === "refusal") throw new UserError("Bu sefer öneri oluşturulamadı. Tekrar dene.");
      const data = JSON.parse(finalText(message));
      const options = (data.options || []).slice(0, 3).map((o) => ({ ...o, id: uid() }));
      if (options.length < 3) throw new UserError("Eksik öneri geldi. Tekrar dene.");

      state.days[day] = { options, pickedId: null, createdAt: new Date().toISOString() };
      save();
      return state.days[day];
    } catch (err) {
      throw new UserError(friendlyError(err, Anthropic));
    }
  })().finally(() => { optionsInFlight = null; });
  return optionsInFlight;
}

// ----- 2) seçilen yazının kendisi (akışlı)

const ARTICLE_SYSTEM = `Sen meraklı, sıcak ve son derece anlaşılır yazan bir Türk bilim ve kültür yazarısın. Okurun sabah kahvesi eşliğinde okuyacağı tek bir yazı yazıyorsun.

Yazım ilkeleri:
- Dil: akıcı, doğal Türkçe. Okuru bir arkadaşınla sohbet eder gibi yakala ama ciddiyeti koru.
- Sadelik çok önemli: okur meraklı ama uzman değil. Bilimsel makaleleri sever ama teknik dil onu zorlar. Her teknik terimi ilk geçtiği yerde gündelik bir dille açıkla; soyut kavramları günlük hayattan benzetmelerle somutlaştır. Jargon yığını, formül ya da gereksiz rakam yok — rakam veriyorsan ölçeğini hissettir ("bir futbol sahası kadar" gibi).
- Somut ol: isimler, yerler, tarihler, sahneler, küçük anekdotlar. Genellemelerden kaçın.
- Doğruluk: gerçek olayları ve bilimsel bulguları doğru aktar. Emin olmadığın ayrıntıyı, alıntıyı ya da rakamı uydurma; tartışmalı noktaları "araştırmacılar hâlâ tartışıyor" diye belirt. Varsayımsal bir gelecek senaryosuysa bunun bir senaryo olduğunu açıkça söyle ve bugünkü bilimsel bilgiye dayandır.
- Yapı (Markdown):
  * Başlığı YAZMA (uygulama gösteriyor). Doğrudan okuru içine çeken bir açılış paragrafıyla başla — bir sahne, bir soru ya da şaşırtıcı bir bilgi.
  * Ardından 3–5 bölüm; her biri kısa bir "## " ara başlıkla.
  * Paragraflar kısa olsun (telefonda okunacak): 2–4 cümle.
  * Yazının içinde bir yerde "> **Biliyor muydun?** …" şeklinde kısa bir ilginç bilgi kutusu kullan.
  * Önemli kavramları yer yer **kalın** yaz, ama abartma.
  * Sonunda "## Akılda kalsın" başlığı altında yazının özünü veren 3 kısa madde.
  * Gerçek ve emin olduğun bir kaynak varsa (kitap, makale, araştırmacı, müze vb.) en son satıra "*İleri okuma: …*" ekle; emin değilsen bu satırı hiç yazma.
- Giriş-gelişme-sonuç akışı olsun; yazı bir merakla başlasın ve tatmin edici bir fikirle bitsin.`;

const writing = new Map(); // articleId -> Promise

function writeArticle(art, onDelta) {
  if (writing.has(art.id)) return writing.get(art.id);
  const p = (async () => {
    const { client, Anthropic } = await getClient();
    const len = LENGTHS[state.settings.length] || LENGTHS.normal;
    const o = art.option;
    const user = `Bugünün yazısı:
Başlık: ${o.title}
Kategori: ${o.category}
Giriş fikri: ${o.hook}
Okura gösterilen özet: ${o.summary}
Editör notu (odak): ${o.angle}

Uzunluk: ${len.words} kelime (telefon ekranında 1–2 sayfa). Çok kısa kesme; konuyu doyurucu biçimde anlat ama uzatma.`;

    art.status = "writing";
    art.content = "";
    try {
      const run = () => {
        art.content = "";
        const stream = client.beta.messages.stream(baseParams({
          max_tokens: 16000,
          system: ARTICLE_SYSTEM,
          output_config: { effort: "medium" },
          messages: [{ role: "user", content: user }],
        }));
        stream.on("text", (delta) => { art.content += delta; onDelta?.(); });
        return stream.finalMessage();
      };
      const message = await withFallbackRetry(run, Anthropic);
      if (message.stop_reason === "refusal") throw new UserError("Bu yazı oluşturulamadı. Tekrar dene.");
      const text = finalText(message).trim();
      if (text) art.content = text;
      art.status = "done";
      art.doneAt = new Date().toISOString();
      save();
    } catch (err) {
      art.status = "error";
      art.error = friendlyError(err, Anthropic);
      save();
      throw new UserError(art.error);
    }
  })().finally(() => writing.delete(art.id));
  writing.set(art.id, p);
  return p;
}

// ---------------------------------------------------------------- views

let currentView = "today";
let currentArticleId = null;

function show(view) {
  currentView = view;
  $$(".view").forEach((v) => (v.hidden = v.dataset.view !== view));
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.go === view));
  document.body.classList.toggle("reading", view === "reader");
  if (view !== "reader") { closeNotes(); $("#quote-btn").hidden = true; }
  window.scrollTo(0, 0);
  if (view === "today") renderToday();
  if (view === "library") renderLibrary();
  if (view === "settings") renderSettings();
}

// ----- today

function greeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return "Günaydın";
  if (h >= 12 && h < 18) return "İyi günler";
  if (h >= 18 && h < 23) return "İyi akşamlar";
  return "İyi geceler";
}

function streak() {
  let n = 0;
  const d = keyToDate(dayKey());
  if (!state.days[dayKey()]?.pickedId) d.setDate(d.getDate() - 1); // bugün henüz okunmadıysa dünden say
  for (;;) {
    const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (state.days[k]?.pickedId) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}

function untilNext() {
  const ms = nextRollover() - new Date();
  const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}

function renderToday() {
  const day = dayKey();
  $("#today-date").textContent = fmtDay(day);
  $("#greeting").textContent = greeting();
  const s = streak();
  $("#streak").hidden = s < 2;
  $("#streak").textContent = `${s} gün üst üste`;

  const body = $("#today-body");

  if (!state.settings.apiKey) {
    body.innerHTML = `
      <div class="panel">
        <h2>Hoş geldin</h2>
        <p>Her sabah sana üç kısa okuma önereceğim: bilimden tarihe, seyahatten icatlara. Birini seçeceksin; seçimlerinle ilgi alanlarını öğrenip önerileri sana göre sıralayacağım.</p>
        <ol>
          <li><a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> üzerinden bir Claude API anahtarı oluştur.</li>
          <li>Ayarlar'a yapıştır ve kaydet.</li>
          <li>Her gün 04:00'ten sonra uygulamayı aç: üç yeni yazı seni bekliyor olacak.</li>
        </ol>
        <button class="btn accent" data-go="settings">Ayarlara git</button>
      </div>`;
    return;
  }

  const d = state.days[day];
  if (!d) {
    body.innerHTML = `<p class="intro">Bugünün önerileri hazırlanıyor…</p>
      <div class="cards">${[0, 1, 2].map(() => `
        <div class="card loading"><div class="skel" style="width:40%"></div><div class="skel h"></div>
        <div class="skel"></div><div class="skel"></div><div class="skel" style="width:70%"></div></div>`).join("")}</div>`;
    generateOptions(day).then(() => currentView === "today" && renderToday()).catch((err) => {
      if (currentView !== "today") return;
      body.innerHTML = `<div class="err-box">${esc(err.message)}<br><button class="btn small" id="retry-opts">Tekrar dene</button></div>`;
      $("#retry-opts").onclick = renderToday;
    });
    return;
  }

  const picked = d.pickedId;
  body.innerHTML = `
    <p class="intro">${picked ? "Bugünün seçimi yapıldı. Yarın 04:00'te üç yeni yazı gelecek." : "Bugün hangisini okumak istersin? Yalnızca birini seçebilirsin."}</p>
    <div class="cards" id="cards">
      ${d.options.map((o, i) => {
        const cls = picked ? (o.id === picked ? "chosen" : "locked") : "";
        const btn = picked ? (o.id === picked ? articleButtonLabel(o.id) : "") : "Bunu oku";
        return `
        <div class="card ${cls}" data-id="${o.id}">
          ${o.explore && !picked ? `<span class="badge-top">Yeni ufuk</span>` : ""}
          <span class="cat"><i></i>${esc(o.category)}</span>
          <h3>${esc(o.title)}</h3>
          <p class="hook">${esc(o.hook)}</p>
          <p class="sum">${esc(o.summary)}</p>
          <div class="foot-row">
            <span class="mins">~${esc(o.minutes || LENGTHS[state.settings.length].minutes)} dk okuma</span>
            ${btn ? `<button class="pick" data-pick="${o.id}">${btn}</button>` : ""}
          </div>
        </div>`;
      }).join("")}
    </div>
    <div class="dots" id="dots">${d.options.map((_, i) => `<span class="${i === 0 ? "on" : ""}"></span>`).join("")}</div>
    <div class="below">
      <span>Yeni seçenekler ${untilNext()} sonra</span>
      ${picked ? "" : `<button class="link-btn" id="reroll">Bunlar olmadı, başka öner</button>`}
    </div>`;

  const cards = $("#cards");
  cards.addEventListener("scroll", () => {
    const idx = Math.round(cards.scrollLeft / (cards.firstElementChild.offsetWidth + 12));
    $$("#dots span").forEach((s, i) => s.classList.toggle("on", i === idx));
  }, { passive: true });

  $$("[data-pick]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); pick(day, b.dataset.pick); }));
  const rr = $("#reroll");
  if (rr) rr.onclick = () => {
    if (!confirm("Bugünün önerileri yenilensin mi? (Yeni bir API çağrısı yapılır.)")) return;
    // Beğenilmeyen kategorileri hafifçe düşür.
    d.options.forEach((o) => bumpProfile(o, -0.3, 0));
    delete state.days[day];
    save();
    renderToday();
  };
}

function articleButtonLabel(optionId) {
  const a = state.articles[optionId];
  if (!a || a.status !== "done") return "Okumaya başla";
  return "Oku";
}

function pick(day, optionId) {
  const d = state.days[day];
  if (!d) return;
  if (!d.pickedId) {
    const option = d.options.find((o) => o.id === optionId);
    d.pickedId = optionId;
    bumpProfile(option, 2, 1);
    d.options.filter((o) => o.id !== optionId).forEach((o) => bumpProfile(o, -0.4, 0));
    state.articles[optionId] = {
      id: optionId, day, option, content: "", status: "pending", notes: "", rating: null,
      createdAt: new Date().toISOString(),
    };
    save();
  }
  openReader(optionId);
}

// ----- reader

let renderQueued = false;
let returnView = "today";
function openReader(id) {
  if (currentView !== "reader") returnView = currentView;
  currentArticleId = id;
  show("reader");
  renderArticle();
  const art = state.articles[id];
  if (art.status !== "done" && !writing.has(id)) startWriting(art);
}

function startWriting(art) {
  writeArticle(art, () => {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; if (currentArticleId === art.id && currentView === "reader") renderArticle(); });
  }).then(() => {
    if (currentArticleId === art.id && currentView === "reader") renderArticle();
  }).catch(() => {
    if (currentArticleId === art.id && currentView === "reader") renderArticle();
  });
  renderArticle();
}

function renderArticle() {
  const art = state.articles[currentArticleId];
  if (!art) return;
  const o = art.option;
  const len = LENGTHS[state.settings.length] || LENGTHS.normal;
  const words = art.content ? art.content.split(/\s+/).length : 0;
  const mins = art.status === "done" ? Math.max(1, Math.round(words / 190)) : o.minutes || len.minutes;
  $("#reader-meta").textContent = `${fmtDay(art.day, { day: "numeric", month: "short" })} · ${mins} dk`;

  let bodyHtml = "";
  if (art.status === "error") {
    bodyHtml = (art.content ? md(art.content) : "") +
      `<div class="err-box">${esc(art.error || "Yazı oluşturulamadı.")}<br><button class="btn small" id="retry-art">Tekrar dene</button></div>`;
  } else if (art.status === "done") {
    bodyHtml = md(art.content);
  } else if (art.content) {
    bodyHtml = md(art.content).replace(/<\/(p|li|h2|h3)>(?![\s\S]*<\/(p|li|h2|h3)>)/, '<span class="caret"></span></$1>');
  } else if (writing.has(art.id)) {
    bodyHtml = `<div class="writing"><span class="pulse"><i></i><i></i><i></i></span> Senin için yazılıyor… (yaklaşık bir dakika)</div>`;
  } else {
    bodyHtml = `<div class="err-box">Yazı yarım kalmış.<br><button class="btn small" id="retry-art">Yeniden yaz</button></div>`;
  }

  $("#article").innerHTML = `
    <div class="a-cat">${esc(o.category)}</div>
    <h1>${esc(o.title)}</h1>
    <p class="a-hook">${esc(o.hook)}</p>
    ${bodyHtml}`;

  const retry = $("#retry-art");
  if (retry) retry.onclick = () => startWriting(art);

  const end = $("#article-end");
  end.hidden = art.status !== "done";
  $$(".rate .chip").forEach((c) => c.classList.toggle("on", art.rating !== null && String(art.rating) === c.dataset.rate));
  updateProgress();
}

function rate(value) {
  const art = state.articles[currentArticleId];
  if (!art) return;
  const weight = (r) => (r === 1 ? [1.5, 0.75] : r === -1 ? [-1.5, -0.75] : [0, 0]);
  const [pc, pt] = weight(art.rating);
  bumpProfile(art.option, -pc, -pt); // önceki puanı geri al
  art.rating = art.rating === value ? null : value;
  const [nc, nt] = weight(art.rating);
  bumpProfile(art.option, nc, nt);
  save();
  renderArticle();
  if (art.rating !== null) toast("Teşekkürler — önerilerine yansıtacağım.");
}

function updateProgress() {
  if (currentView !== "reader") return;
  const h = document.documentElement.scrollHeight - innerHeight;
  $("#read-progress").style.width = h > 0 ? `${Math.min(100, (scrollY / h) * 100)}%` : "0%";
}

// ----- notes

let notesTimer;
function openNotes() {
  const art = state.articles[currentArticleId];
  if (!art) return;
  $("#notes-text").value = art.notes || "";
  $("#notes-saved").textContent = "";
  $("#sheet-backdrop").hidden = false;
  $("#notes-sheet").classList.add("open");
  $("#notes-sheet").setAttribute("aria-hidden", "false");
}
function closeNotes() {
  $("#sheet-backdrop").hidden = true;
  $("#notes-sheet").classList.remove("open");
  $("#notes-sheet").setAttribute("aria-hidden", "true");
}
function saveNotes() {
  const art = state.articles[currentArticleId];
  if (!art) return;
  art.notes = $("#notes-text").value;
  save();
  $("#notes-saved").textContent = "Kaydedildi";
}

function selectionInArticle() {
  const sel = getSelection();
  if (!sel || sel.isCollapsed) return "";
  const node = sel.anchorNode;
  if (!node || !$("#article").contains(node.nodeType === 1 ? node : node.parentNode)) return "";
  return sel.toString().trim();
}

// ----- library

let libFilter = "all";
function renderLibrary() {
  let arts = Object.values(state.articles).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (libFilter === "notes") arts = arts.filter((a) => a.notes?.trim());
  if (libFilter === "fav") arts = arts.filter((a) => a.rating === 1);
  const list = $("#lib-list");
  if (!arts.length) {
    list.innerHTML = `<li class="empty">${libFilter === "all" ? "Henüz okuma yok. Bugünün yazısını seçtiğinde burada görünecek." : "Burada henüz bir şey yok."}</li>`;
    return;
  }
  list.innerHTML = arts.map((a) => `
    <li class="lib-item" data-open="${a.id}">
      <div class="meta"><span class="c">${esc(a.option.category)}</span><span>${fmtDay(a.day, { day: "numeric", month: "long", year: "numeric" })}</span>${a.rating === 1 ? "<span>· ♥</span>" : ""}</div>
      <h4>${esc(a.option.title)}</h4>
      ${a.notes?.trim() ? `<p class="note-prev">${esc(a.notes.trim())}</p>` : ""}
    </li>`).join("");
  $$("[data-open]", list).forEach((li) => (li.onclick = () => openReader(li.dataset.open)));
}

// ----- settings

function renderSettings() {
  const s = state.settings;
  $("#set-key").value = s.apiKey;
  $("#set-model").value = s.model;
  $("#set-length").value = s.length;
  $("#set-font").value = s.fontScale;
  $("#set-theme").value = s.theme;
  $("#key-status").textContent = s.apiKey ? "Anahtar kayıtlı." : "";
  $("#key-status").className = "hint";

  const cats = Object.entries(state.profile.cats).filter(([, v]) => v > 0.2).sort((a, b) => b[1] - a[1]);
  $("#interest").innerHTML = cats.length
    ? cats.map(([k, v]) => `<span class="tag">${esc(k)}<b>${"•".repeat(Math.min(5, Math.ceil(v / 2)))}</b></span>`).join("")
    : `<span class="hint">Birkaç gün seçim yaptıkça burada ilgi alanların belirecek.</span>`;
}

function applyAppearance() {
  const s = state.settings;
  document.documentElement.style.setProperty("--font-scale", s.fontScale);
  if (s.theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", s.theme);
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------------------------------------------------------------- events

function bind() {
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) show(go.dataset.go);
  });

  $("#reader-back").onclick = () => show(returnView);
  $("#reader-notes-toggle").onclick = openNotes;
  $("#open-notes-end").onclick = openNotes;
  $("#notes-close").onclick = closeNotes;
  $("#sheet-backdrop").onclick = closeNotes;
  $$(".rate .chip").forEach((c) => (c.onclick = () => rate(Number(c.dataset.rate))));

  $("#notes-text").addEventListener("input", () => {
    $("#notes-saved").textContent = "";
    clearTimeout(notesTimer);
    notesTimer = setTimeout(saveNotes, 400);
  });

  document.addEventListener("selectionchange", () => {
    if (currentView !== "reader") return;
    $("#quote-btn").hidden = !selectionInArticle();
  });
  $("#quote-btn").addEventListener("pointerdown", (e) => e.preventDefault()); // seçimi kaybetme
  $("#quote-btn").onclick = () => {
    const text = selectionInArticle();
    if (!text) return;
    const art = state.articles[currentArticleId];
    const quoted = text.split("\n").map((l) => "> " + l).join("\n");
    art.notes = (art.notes ? art.notes.replace(/\s*$/, "") + "\n\n" : "") + quoted + "\n\n";
    save();
    getSelection().removeAllRanges();
    $("#quote-btn").hidden = true;
    openNotes();
    const ta = $("#notes-text");
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  };

  addEventListener("scroll", updateProgress, { passive: true });

  // settings
  $("#key-eye").onclick = () => {
    const i = $("#set-key");
    i.type = i.type === "password" ? "text" : "password";
  };
  $("#key-save").onclick = () => {
    state.settings.apiKey = $("#set-key").value.trim();
    save();
    $("#key-status").textContent = state.settings.apiKey ? "Kaydedildi." : "Anahtar silindi.";
    $("#key-status").className = "hint ok";
  };
  $("#key-test").onclick = async () => {
    const st = $("#key-status");
    state.settings.apiKey = $("#set-key").value.trim();
    save();
    st.className = "hint";
    st.textContent = "Test ediliyor…";
    let Anthropic;
    try {
      const c = await getClient();
      Anthropic = c.Anthropic;
      await c.client.models.retrieve(state.settings.model);
      st.textContent = "Bağlantı başarılı. Hazırsın!";
      st.className = "hint ok";
    } catch (err) {
      st.textContent = friendlyError(err, Anthropic);
      st.className = "hint err";
    }
  };
  $("#set-model").onchange = (e) => { state.settings.model = e.target.value; fallbackDisabled = false; save(); };
  $("#set-length").onchange = (e) => { state.settings.length = e.target.value; save(); };
  $("#set-font").oninput = (e) => { state.settings.fontScale = Number(e.target.value); applyAppearance(); save(); };
  $("#set-theme").onchange = (e) => { state.settings.theme = e.target.value; applyAppearance(); save(); };

  $("#profile-reset").onclick = () => {
    if (!confirm("İlgi profili sıfırlansın mı? Okumaların ve notların silinmez.")) return;
    state.profile = { cats: {}, tags: {} };
    save();
    renderSettings();
  };

  $$("#lib-filter .seg-btn").forEach((b) => (b.onclick = () => {
    libFilter = b.dataset.f;
    $$("#lib-filter .seg-btn").forEach((x) => x.classList.toggle("active", x === b));
    renderLibrary();
  }));

  $("#export-notes").onclick = () => {
    const arts = Object.values(state.articles).filter((a) => a.notes?.trim()).sort((a, b) => (a.day > b.day ? 1 : -1));
    if (!arts.length) return toast("Henüz not yok.");
    const text = "# Sabah Okuması — Notlarım\n\n" + arts.map((a) =>
      `## ${a.option.title}\n*${fmtDay(a.day, { day: "numeric", month: "long", year: "numeric" })} · ${a.option.category}*\n\n${a.notes.trim()}\n`).join("\n---\n\n");
    download(`sabah-okumasi-notlar-${dayKey()}.md`, text, "text/markdown");
  };
  $("#export-json").onclick = () => {
    const copy = { ...state, settings: { ...state.settings, apiKey: "" } }; // anahtar yedeğe girmez
    download(`sabah-okumasi-yedek-${dayKey()}.json`, JSON.stringify(copy, null, 2), "application/json");
  };
  $("#import-json").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== "object" || !data.articles || !data.days) throw new Error("bad");
      if (!confirm("Yedek yüklensin mi? Bu cihazdaki okumalar yedektekilerle birleştirilecek.")) return;
      state.articles = { ...data.articles, ...state.articles };
      state.days = { ...data.days, ...state.days };
      if (data.profile) state.profile = data.profile;
      save();
      toast("Yedek yüklendi.");
      renderSettings();
    } catch {
      toast("Bu dosya geçerli bir yedek değil.");
    } finally {
      e.target.value = "";
    }
  };

  // 04:00'te yeni gün
  let lastDay = dayKey();
  const checkDay = () => {
    const k = dayKey();
    if (k !== lastDay) { lastDay = k; if (currentView === "today") renderToday(); }
  };
  const scheduleRollover = () => setTimeout(() => { checkDay(); scheduleRollover(); }, nextRollover() - new Date());
  scheduleRollover();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkDay(); });
  setInterval(() => { if (currentView === "today" && !document.hidden) { const el = $(".below span"); if (el) el.textContent = `Yeni seçenekler ${untilNext()} sonra`; } }, 60e3);
}

// ---------------------------------------------------------------- start

applyAppearance();
bind();
show("today");

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
