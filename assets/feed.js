(async function () {
  const root = document.getElementById("app");
  const data = await Casting.loadData();
  const work = Casting.findWork(data, Casting.getWorkId());
  Casting.renderDisclosure();
  if (!work) { root.innerHTML = '<p class="msg">作品が見つかりません。</p>'; return; }
  Casting.applyTheme(work);
  document.title = work.title + " みんなの配役";

  const charName = {};
  work.characters.forEach(ch => charName[ch.id] = ch.name);
  let sort = "likes";

  root.innerHTML = `<div class="topnav"><a href="index.html">← 作品一覧</a>
      <a href="vote.html?work=${work.id}">投票する</a>
      <a href="results.html?work=${work.id}">結果</a></div>
    <div class="work-hero"><h1>${Casting.esc(work.title)} みんなの配役</h1>
      <p class="lead">いいねで「人気の配役」を応援しよう ❤️</p></div>
    <div class="toolbar">
      <button class="btn-ghost" data-sort="likes">人気順</button>
      <button class="btn-ghost" data-sort="new">新着順</button>
    </div>
    <div id="feed"><p class="msg">読み込み中…</p></div>`;

  const feedEl = document.getElementById("feed");

  function castCard(item) {
    const liked = !!localStorage.getItem("liked_" + item.id);
    const rows = work.characters
      .filter(ch => item.picks && item.picks[ch.id])
      .map(ch => `<li><span class="ch">${Casting.esc(ch.name)}</span><span>${Casting.esc(item.picks[ch.id])}</span></li>`)
      .join("");
    return `<div class="feed-card" data-id="${item.id}">
      <ul class="picks">${rows}</ul>
      <button class="like-btn${liked ? " liked" : ""}" data-id="${item.id}">❤️ <span class="cnt">${item.likes || 0}</span></button>
    </div>`;
  }

  async function load() {
    feedEl.innerHTML = '<p class="msg">読み込み中…</p>';
    try {
      const r = await Casting.apiGet(`/feed?work=${encodeURIComponent(work.id)}&sort=${sort}`);
      const items = r.items || [];
      if (!items.length) { feedEl.innerHTML = '<p class="msg">まだ投稿がありません。最初の投票をしてみよう！</p>'; return; }
      feedEl.innerHTML = items.map(castCard).join("");
      feedEl.querySelectorAll(".like-btn").forEach(btn => btn.addEventListener("click", () => like(btn)));
    } catch (e) {
      feedEl.innerHTML = '<p class="msg">取得に失敗しました（サーバ準備中の可能性）。</p>';
    }
  }

  async function like(btn) {
    const id = btn.dataset.id;
    const likedKey = "liked_" + id;
    if (localStorage.getItem(likedKey)) return;          // already liked from this browser
    btn.disabled = true;
    try {
      const r = await Casting.apiPost("/like", { voteId: id, token: Casting.token(), turnstileToken: Casting.turnstileToken() });
      if (typeof r.count === "number") {
        btn.querySelector(".cnt").textContent = r.count;
        btn.classList.add("liked");
        localStorage.setItem(likedKey, "1");
      }
    } catch (e) { /* ignore */ }
    btn.disabled = false;
  }

  document.querySelectorAll("[data-sort]").forEach(b =>
    b.addEventListener("click", () => { sort = b.dataset.sort; load(); }));
  load();
})();
