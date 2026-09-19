import { expect, test } from "bun:test";
import { modKeyLabel } from "../../src/web/lib/platform.ts";

test("Mac では ⌘、それ以外は Ctrl", () => {
  expect(modKeyLabel("MacIntel")).toBe("⌘");
  expect(modKeyLabel("Win32")).toBe("Ctrl");
  expect(modKeyLabel("Linux x86_64")).toBe("Ctrl");
});
