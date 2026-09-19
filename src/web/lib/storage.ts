// ブラウザの保存領域は、プライベートウィンドウなどで使えないことがある。
// 読み書きに失敗しても画面は動くように、失敗は既定値と無視に倒す。

type Store = "local" | "session";

const storageOf = (store: Store): Storage | undefined => {
  try {
    return store === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
};

const PREFIX = "a-tour-of-jev:v1:";

export function load<T>(key: string, fallback: T, store: Store = "local"): T {
  try {
    const raw = storageOf(store)?.getItem(PREFIX + key);
    return raw === null || raw === undefined ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown, store: Store = "local"): void {
  try {
    storageOf(store)?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 保存できなくても、この画面の中では値を持ち続けるので問題ない
  }
}

export function remove(key: string, store: Store = "local"): void {
  try {
    storageOf(store)?.removeItem(PREFIX + key);
  } catch {
    // 同上
  }
}
