/**
 * Pixel position of the caret inside a textarea, relative to its top-left.
 * Textareas expose selection *indices*, not coordinates, so we mirror the text
 * up to the caret in a hidden clone with the same typography and measure a
 * marker span — the standard mirror-div technique.
 */

// Every style that affects where text wraps and how tall a line is.
const MIRRORED = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "line-height",
  "text-transform",
  "word-spacing",
  "text-indent",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "box-sizing",
];

export type CaretPos = { left: number; top: number; lineHeight: number };

export function caretPosition(ta: HTMLTextAreaElement): CaretPos {
  const style = window.getComputedStyle(ta);
  const mirror = document.createElement("div");
  for (const prop of MIRRORED) {
    mirror.style.setProperty(prop, style.getPropertyValue(prop));
  }
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.width = `${ta.clientWidth}px`;
  mirror.textContent = ta.value.slice(0, ta.selectionEnd ?? ta.value.length);
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const pos = {
    left: marker.offsetLeft,
    top: marker.offsetTop,
    lineHeight: marker.offsetHeight || parseFloat(style.lineHeight) || 24,
  };
  mirror.remove();
  return pos;
}
