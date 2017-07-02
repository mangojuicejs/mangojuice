export const isWindowDefined =
  typeof document !== "undefined" && document.querySelectorAll;

export const querySelector = selector =>
  document.querySelectorAll(selector);
