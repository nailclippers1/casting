(async function () {
  const root = document.getElementById("app");
  const data = await Casting.loadData();
  const work = Casting.findWork(data, Casting.getWorkId());
  Casting.renderDisclosure();

  if (!work) { root.innerHTML = '<p class="msg">作品が見つかりません。</p>'; return; }
  Casting.applyTheme(work);
  document.title = work.title + " キャスティング投票";

  const selected = {};                       // charId -> actor name
  const votedKey = "voted_" + work.id;
  const myPicksKey = "mypicks_" + work.id;
  const alreadyVoted = !!localStorage.getItem(votedKey);

  // ----- hero -----
  const cover = (work.product && work.product.image)
    ? `<a href="${Casting.esc(work.product.url || "#")}" target="_blank" rel="nofollow sponsored noopener"><img class="cover" src="${Casting.esc(work.product.image)}" alt="${Casting.esc(work.title)}"></a>`
    : "";
  let html = `<div class="topnav"><a href="index.html">← 作品一覧</a>
      <a href="results.html?work=${work.id}">結果</a>
      <a href="feed.html?work=${work.id}">みんなの配役</a></div>
    <div class="work-hero">${cover}<h1>${Casting.esc(work.title)}</h1>
      <p class="lead">${Casting.esc(work.subtitle || "ベストキャストを選んで投票！")}</p></div>
    <form id="voteForm">`;

  // ----- character blocks -----
  work.characters.forEach(ch => {
    html += `<div class="character" data-char="${ch.id}">
      <h2><span class="icon">${Casting.esc(ch.icon || "")}</span>${Casting.esc(ch.name)}</h2>
      <p class="desc">${Casting.esc(ch.desc || "")}</p>
      <div class="cards">`;
    ch.candidates.forEach(c => {
      html += `<div class="cand" data-char="${ch.id}" data-name="${Casting.esc(c.name)}">
        ${Casting.candidateVisual(c)}
        <div class="name">${Casting.esc(c.name)}</div>
        ${c.agency || c.roles ? `<div class="meta">${Casting.esc(c.roles || c.agency)}</div>` : ""}
      </div>`;
    });
    html += `<div class="cand writein" data-char="${ch.id}">
        <div class="name">✎ その他</div>
        <input type="text" placeholder="自由記入" data-char="${ch.id}">
      </div></div></div>`;
  });

  const siteKey = Casting.config().turnstileSiteKey;
  html += siteKey ? `<div class="cf-turnstile" data-sitekey="${siteKey}" style="display:flex;justify-content:center;margin-top:20px"></div>` : "";
  html += `<button type="submit" class="btn-primary-x" id="submitBtn">投票する</button>
    </form>
    <p class="msg" id="message"></p>
    <div id="liveResults"></div>`;
  root.innerHTML = html;

  const form = document.getElementById("voteForm");
  const msg = document.getElementById("message");
  const submitBtn = document.getElementById("submitBtn");

  // ----- selection behaviour (radio per character) -----
  function selectCard(charId, name, cardEl) {
    selected[charId] = name;
    document.querySelectorAll(`.cand[data-char="${charId}"]`).forEach(el => el.classList.remove("selected"));
    if (cardEl) cardEl.classList.add("selected");
  }
  root.querySelectorAll(".cand:not(.writein)").forEach(card => {
    card.addEventListener("click", () => selectCard(card.dataset.char, card.dataset.name, card));
  });
  root.querySelectorAll(".writein input").forEach(inp => {
    inp.addEventListener("input", () => {
      const charId = inp.dataset.char;
      const v = inp.value.trim();
      document.querySelectorAll(`.cand[data-char="${charId}"]`).forEach(el => el.classList.remove("selected"));
      if (v) { selected[charId] = v; inp.closest(".cand").classList.add("selected"); }
      else { delete selected[charId]; }
    });
  });

  async function showResults() {
    try {
      const r = await Casting.apiGet("/results?work=" + encodeURIComponent(work.id));
      const my = JSON.parse(localStorage.getItem(myPicksKey) || "{}");
      const box = document.getElementById("liveResults");
      box.innerHTML = `<h2 style="text-align:center;margin-top:30px">📊 みんなの投票結果</h2>
        <div class="toolbar"><button class="btn-ghost" id="shareBtn">結果をシェア</button>
        <a class="btn-ghost" href="feed.html?work=${work.id}">みんなの配役を見る</a></div>
        <div id="resBars"></div>`;
      Casting.renderResults(document.getElementById("resBars"), work, r.results || {}, my);
      document.getElementById("shareBtn").addEventListener("click", () => share(my));
    } catch (e) {
      document.getElementById("liveResults").innerHTML = '<p class="msg">結果の取得に失敗しました（サーバ準備中の可能性）。</p>';
    }
  }

  function share(my) {
    const lines = work.characters
      .filter(ch => my[ch.id])
      .map(ch => `${ch.name}=${my[ch.id]}`).join(" / ");
    const text = `『${work.title}』実写化 私の配役：${lines}`;
    const url = location.origin + location.pathname.replace(/vote\.html$/, "") + `results.html?work=${work.id}`;
    window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url), "_blank");
  }

  function lockForm() {
    submitBtn.disabled = true;
    form.querySelectorAll("input, .cand").forEach(el => el.style.pointerEvents = "none");
  }

  if (alreadyVoted) {
    msg.textContent = "この作品には投票済みです。ご協力ありがとうございました。";
    lockForm();
    showResults();
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const picks = {};
    Object.entries(selected).forEach(([k, v]) => { if (v) picks[k] = v; });
    if (!Object.keys(picks).length) { msg.textContent = "少なくとも1人は選んでください。"; return; }

    submitBtn.disabled = true;
    msg.textContent = "投票を送信中…";
    try {
      const result = await Casting.apiPost("/vote", {
        workId: work.id, picks, token: Casting.token(), turnstileToken: Casting.turnstileToken()
      });
      if (result.result === "success" || result.voteId) {
        localStorage.setItem(votedKey, "true");
        localStorage.setItem(myPicksKey, JSON.stringify(picks));
        msg.textContent = "投票が完了しました！ありがとうございます。";
        lockForm();
        showResults();
      } else {
        msg.textContent = result.message || "投票に失敗しました。";
        submitBtn.disabled = false;
      }
    } catch (err) {
      msg.textContent = "通信エラーが発生しました。時間をおいて再度お試しください。";
      submitBtn.disabled = false;
    }
  });
})();
