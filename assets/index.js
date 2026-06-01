(async function () {
  const data = await Casting.loadData();
  Casting.renderDisclosure();
  const ul = document.getElementById("works");
  ul.innerHTML = data.works.map(w => {
    const cover = (w.product && w.product.image)
      ? `<img src="${Casting.esc(w.product.image)}" alt="" style="width:80px;height:112px;object-fit:cover;border-radius:6px;display:block;margin:0 auto 8px">`
      : "";
    return `<li><a href="vote.html?work=${w.id}">${cover}${Casting.esc(w.title)}</a></li>`;
  }).join("");
})();
