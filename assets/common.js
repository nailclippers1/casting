// Shared helpers for the casting site (loaded by all pages)
const Casting = (() => {
  let _data = null;

  async function loadData() {
    if (_data) return _data;
    const res = await fetch("data/works.json", { cache: "no-cache" });
    _data = await res.json();
    return _data;
  }

  function config() { return _data ? _data.config : {}; }

  function getWorkId() {
    return new URLSearchParams(location.search).get("work") || "";
  }
  function findWork(data, id) {
    return data.works.find(w => w.id === id) || null;
  }

  // stable anonymous token per browser (for soft dedup)
  function token() {
    let t = localStorage.getItem("casting_token");
    if (!t) {
      t = (crypto.randomUUID ? crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(16).slice(2));
      localStorage.setItem("casting_token", t);
    }
    return t;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // deterministic avatar (color + initial) when no product image
  function avatarHTML(name) {
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    const initial = esc(String(name).trim().charAt(0) || "?");
    return `<div class="avatar" style="background:hsl(${h},55%,55%)">${initial}</div>`;
  }

  // candidate visual: product image (Amazon) if present, else avatar
  function candidateVisual(c) {
    if (c.product && c.product.image) {
      const inner = `<img class="photo" src="${esc(c.product.image)}" alt="${esc(c.name)}" loading="lazy">`;
      return c.product.url
        ? inner + `<a class="amazon" href="${esc(c.product.url)}" target="_blank" rel="nofollow sponsored noopener" onclick="event.stopPropagation()">Amazonで見る</a>`
        : inner;
    }
    return avatarHTML(c.name);
  }

  function applyTheme(work) {
    if (work && work.theme) document.documentElement.style.setProperty("--theme", work.theme);
  }

  function renderDisclosure() {
    const el = document.getElementById("disclosure");
    if (el && config().disclosure) el.textContent = config().disclosure;
  }

  async function apiGet(path) {
    const r = await fetch(config().apiBase + path, { method: "GET" });
    if (!r.ok) throw new Error("api " + r.status);
    return r.json();
  }
  async function apiPost(path, body) {
    const r = await fetch(config().apiBase + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return r.json();
  }

  // optional Cloudflare Turnstile token (empty string if not configured)
  function turnstileToken() {
    try { return (window.turnstile && document.querySelector("[name=cf-turnstile-response]")?.value) || ""; }
    catch { return ""; }
  }

  // render ranking + percentage bars for a work's results
  // results: { charId: { actorName: count } }, myPicks: { charId: actorName }
  function renderResults(container, work, results, myPicks) {
    myPicks = myPicks || {};
    container.innerHTML = "";
    work.characters.forEach(ch => {
      const tally = (results && results[ch.id]) || {};
      const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      const total = entries.reduce((s, [, n]) => s + n, 0);
      const block = document.createElement("div");
      block.className = "res-char";
      let html = `<h3>${esc(ch.icon || "")} ${esc(ch.name)}</h3>`;
      if (!entries.length) {
        html += `<div class="msg">まだ投票がありません</div>`;
      } else {
        entries.forEach(([actor, n]) => {
          const pct = total ? Math.round((n / total) * 100) : 0;
          const mine = myPicks[ch.id] === actor;
          html += `<div class="bar-row${mine ? " mine" : ""}">
            <div class="label">${esc(actor)}${mine ? '<span class="mine-badge">あなた</span>' : ""}</div>
            <div class="track"><div class="fill" style="width:${pct}%"></div></div>
            <div class="pct">${n}票 / ${pct}%</div></div>`;
        });
      }
      block.innerHTML = html;
      container.appendChild(block);
    });
  }

  return { loadData, config, getWorkId, findWork, token, esc, avatarHTML,
           candidateVisual, applyTheme, renderDisclosure, apiGet, apiPost,
           turnstileToken, renderResults };
})();
