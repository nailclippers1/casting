(async function () {
  const root = document.getElementById("app");
  const data = await Casting.loadData();
  const work = Casting.findWork(data, Casting.getWorkId());
  Casting.renderDisclosure();
  if (!work) { root.innerHTML = '<p class="msg">作品が見つかりません。</p>'; return; }
  Casting.applyTheme(work);
  document.title = work.title + " 投票結果";

  root.innerHTML = `<div class="topnav"><a href="index.html">← 作品一覧</a>
      <a href="vote.html?work=${work.id}">投票する</a>
      <a href="feed.html?work=${work.id}">みんなの配役</a></div>
    <div class="work-hero"><h1>${Casting.esc(work.title)} 投票結果</h1>
      <p class="lead">「あなた」バッジ＝あなたが選んだ配役</p></div>
    <div class="toolbar"><button class="btn-ghost" id="shareBtn">結果をシェア</button></div>
    <div id="resBars"><p class="msg">読み込み中…</p></div>`;

  const my = JSON.parse(localStorage.getItem("mypicks_" + work.id) || "{}");
  try {
    const r = await Casting.apiGet("/results?work=" + encodeURIComponent(work.id));
    Casting.renderResults(document.getElementById("resBars"), work, r.results || {}, my);
  } catch (e) {
    document.getElementById("resBars").innerHTML = '<p class="msg">結果の取得に失敗しました（サーバ準備中の可能性）。</p>';
  }

  document.getElementById("shareBtn").addEventListener("click", () => {
    const lines = work.characters.filter(ch => my[ch.id]).map(ch => `${ch.name}=${my[ch.id]}`).join(" / ");
    const text = lines ? `『${work.title}』実写化 私の配役：${lines}` : `『${work.title}』の実写化キャスティング投票！`;
    window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(location.href), "_blank");
  });
})();
