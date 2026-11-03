// One shared tooltip for every [data-tip] element on the page. Shows on hover
// and keyboard focus, and is clamped to the viewport so it never clips.
let tip;
let current;

export function installTooltips(root = document) {
  if (tip) return;
  tip = document.createElement("div");
  tip.className = "ucard-tip";
  tip.setAttribute("role", "tooltip");
  tip.id = "ucard-tip";
  tip.hidden = true;
  document.body.append(tip);

  root.addEventListener("pointerover", (e) => show(e.target.closest?.("[data-tip]")));
  root.addEventListener("pointerout", (e) => {
    if (current && !current.contains(e.relatedTarget)) hide();
  });
  root.addEventListener("focusin", (e) => show(e.target.closest?.("[data-tip]")));
  root.addEventListener("focusout", hide);
  window.addEventListener("scroll", hide, { passive: true });
  document.addEventListener("keydown", (e) => e.key === "Escape" && hide());
}

function show(el) {
  if (!el || el === current) return;
  current = el;
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  el.setAttribute("aria-describedby", tip.id);

  const gap = 8;
  const margin = 8;
  const a = el.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  let left = a.left + a.width / 2 - t.width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - t.width - margin));
  let top = a.top - t.height - gap;
  if (top < margin) top = a.bottom + gap;
  tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

function hide() {
  if (!tip || !current) return;
  current.removeAttribute("aria-describedby");
  current = null;
  tip.hidden = true;
}
