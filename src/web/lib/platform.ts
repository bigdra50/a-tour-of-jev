/** 実行のショートカットに使う修飾キーの表記。Mac は ⌘、それ以外は Ctrl。 */
export const modKeyLabel = (platform: string): "⌘" | "Ctrl" => (/Mac|iPhone|iPad/.test(platform) ? "⌘" : "Ctrl");

export const currentModKey = (): "⌘" | "Ctrl" =>
  typeof navigator === "undefined" ? "Ctrl" : modKeyLabel(navigator.platform || navigator.userAgent);
