// Inline SVG icons on a 24x24 grid. They inherit currentColor.
const PATHS = {
  attack:
    '<path d="M4 3l8.5 8.5-1.6 1.6L2.4 4.6 2 2.8 4 3z"/><path d="M20 3l-8.5 8.5 1.6 1.6 8.5-8.5.4-1.8L20 3z" opacity=".55"/><path d="M6.2 14.4l3.4 3.4-1.7 1.7-1.1-1.1L4 21.2 2.8 20l2.8-2.8-1.1-1.1 1.7-1.7zM17.8 14.4l1.7 1.7-1.1 1.1 2.8 2.8-1.2 1.2-2.8-2.8-1.1 1.1-1.7-1.7 3.4-3.4z"/>',
  health:
    '<path d="M12 21s-7.5-4.6-9.4-9.3C1.2 8.3 3.3 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.7 0 5.8 3.8 4.4 7.2C19.5 16.4 12 21 12 21z"/>',
  coin:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1.4"/>',
  flag: '<path d="M5 2h2v20H5z"/><path d="M8 3h11l-2.5 4L19 11H8z"/>',
  bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
  sabres:
    '<path d="M4 3l8.5 8.5-1.6 1.6L2.4 4.6 2 2.8 4 3zM20 3l-8.5 8.5 1.6 1.6 8.5-8.5.4-1.8L20 3zM6.2 14.4l3.4 3.4-1.7 1.7-1.1-1.1L4 21.2 2.8 20l2.8-2.8-1.1-1.1zM17.8 14.4l1.7 1.7-1.1 1.1 2.8 2.8-1.2 1.2-2.8-2.8-1.1 1.1-1.7-1.7z"/>',
  sabre: '<path d="M20.5 2.5c-4 5-8.6 9.6-13.5 13l-1.6-1.6C9 9.1 14.5 5 20.5 2.5z"/><path d="M4.2 14.6l5.2 5.2-1.5 1.5-1.3-1.3-2.3 2.3-1.4-1.4 2.3-2.3-1.3-1.3z"/>',
  cycle:
    '<path d="M12 4a8 8 0 017.4 5H22l-3.5 4.5L15 9h2.2A6 6 0 006.4 9.6L4.6 8.7A8 8 0 0112 4zM12 20a8 8 0 01-7.4-5H2l3.5-4.5L9 15H6.8a6 6 0 0010.8-.6l1.8.9A8 8 0 0112 20z"/>',
  front: '<path d="M3 11h12V6l7 6-7 6v-5H3z"/>',
  fallen: '<path d="M11 2h2v5h5v2h-5v13h-2V9H6V7h5z"/>',
  chevron: '<path d="M3 6l9 6 9-6v4l-9 6-9-6z"/>',
  square: '<path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 8h8v8H8z" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  horse:
    '<path d="M19.5 3.5l-3 1.6c-3.2-.4-6.2 1.3-7.4 4.3L7.5 13.6 4 15.2l1.2 2.4 3.4-1.2.9 5.1h2.6l-.4-4.6c2.1-.7 3.6-2.2 4.2-4.3l2.5 1 1.6-2.1-2.4-3.2c.9-.9 1.7-2.3 1.9-4.8z"/>',
  cannon: '<circle cx="8" cy="17" r="4"/><path d="M8.8 12.3l11.7-6.8 1.3 2.3-11.7 6.8zM13 17h8v2h-8z"/>',
  infantry: '<path d="M11 2h2l.5 6H17v2h-3.4l.4 4H16l-1 8h-2l-.4-6h-1.2L11 22H9l-1-8h2l.4-4H7V8h3.5z"/>',
  lock: '<path d="M7 10V7a5 5 0 0110 0v3h1v11H6V10h1zm2 0h6V7a3 3 0 00-6 0v3z"/>',
  target: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.8"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z"/>',
  ration: '<path d="M5 9h14l-1.4 11H6.4zM8 9V6a4 4 0 018 0v3h-2V6a2 2 0 00-4 0v3z"/>',
};

export function icon(name, className = "") {
  const body = PATHS[name] || PATHS.target;
  return `<svg class="ico ${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
}
