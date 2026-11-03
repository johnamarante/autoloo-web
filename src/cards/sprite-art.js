// Lays out one or more unit sprites the way Unity draws them on the battlefield.
//
// In Unity every sprite is trimmed to its drawn content, pivots on its center,
// and is 1 world unit per 100 SVG pixels times the prefab's localScale. Layered
// units (a gun plus its gunner) share one center point. Reproducing that here
// keeps every card at the same scale as the game itself.

/**
 * @param {Array} layers  Sprite records ({ src, unityScale, size, bounds, offset? }), back to
 *                        front. offset [x, y] nudges a layer in Unity units (y up).
 * @param {object} opts   emPerUnit: em per Unity unit (Infinity to fit), maxW/maxH: box in em.
 * @returns {{ width, height, layers: Array<{ src, left, top, width, height }> }} all in em.
 */
export function layoutSprites(layers, { emPerUnit = Infinity, maxW, maxH }) {
  const placed = layers.map((s) => {
    const k = s.unityScale / 100; // SVG px -> Unity units
    const [bx, by, bw, bh] = s.bounds;
    const cw = bw * k;
    const ch = bh * k;
    const [ox, oy] = s.offset || [0, 0];
    // Content center sits at the offset (screen y runs down, Unity y runs up).
    const cx = ox;
    const cy = -oy;
    return {
      src: s.src,
      x: cx - cw / 2 - bx * k,
      y: cy - ch / 2 - by * k,
      w: s.size[0] * k,
      h: s.size[1] * k,
      left: cx - cw / 2,
      right: cx + cw / 2,
      top: cy - ch / 2,
      bottom: cy + ch / 2,
    };
  });

  const minX = Math.min(...placed.map((p) => p.left));
  const maxX = Math.max(...placed.map((p) => p.right));
  const minY = Math.min(...placed.map((p) => p.top));
  const maxY = Math.max(...placed.map((p) => p.bottom));
  const unionW = maxX - minX;
  const unionH = maxY - minY;

  const f = Math.min(emPerUnit, maxW / unionW, maxH / unionH);
  return {
    width: unionW * f,
    height: unionH * f,
    layers: placed.map((p) => ({
      src: p.src,
      left: (p.x - minX) * f,
      top: (p.y - minY) * f,
      width: p.w * f,
      height: p.h * f,
    })),
  };
}

/** Renders a layout as positioned <img> elements inside a sized stage. */
export function spriteStageHtml(layout, className) {
  const em = (n) => `${n.toFixed(3)}em`;
  const imgs = layout.layers
    .map(
      (l) =>
        `<img src="${l.src}" alt="" decoding="async" style="left:${em(l.left)};top:${em(l.top)};width:${em(l.width)};height:${em(l.height)}">`
    )
    .join("");
  return `<div class="${className}" style="width:${em(layout.width)};height:${em(layout.height)}">${imgs}</div>`;
}
