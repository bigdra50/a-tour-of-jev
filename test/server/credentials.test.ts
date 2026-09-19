import { describe, expect, test } from "bun:test";
import { maskKey, parseEnvFile, resolveCredentials } from "../../src/server/credentials.ts";

const env = (vars: Record<string, string | undefined>) => ({
  origin: { ja: "環境変数", en: "environment variable" },
  vars,
});
const file = (vars: Record<string, string | undefined>) => ({ origin: ".env.local", vars });

describe("resolveCredentials", () => {
  test("何も無ければどちらも未設定", () => {
    const creds = resolveCredentials([env({})]);
    expect(creds.typesafe).toBeUndefined();
    expect(creds.gateway).toBeUndefined();
  });

  test("TYPESAFE_API_KEY は TypeSafe API のキー", () => {
    const creds = resolveCredentials([env({ TYPESAFE_API_KEY: "ts_live_abcd" })]);
    expect(creds.typesafe).toEqual({
      key: "ts_live_abcd",
      from: { ja: "TYPESAFE_API_KEY（環境変数）", en: "TYPESAFE_API_KEY (environment variable)" },
    });
    expect(creds.gateway).toBeUndefined();
  });

  test("AI SDK の TypeSafe プロバイダが読む TYPESAFE_AI_API_KEY も使える", () => {
    const creds = resolveCredentials([env({ TYPESAFE_AI_API_KEY: "ts_x" })]);
    expect(creds.typesafe?.key).toBe("ts_x");
  });

  test("AI_GATEWAY_API_KEY は Gateway のキー", () => {
    const creds = resolveCredentials([env({ AI_GATEWAY_API_KEY: "vck_1234" })]);
    expect(creds.gateway).toEqual({
      key: "vck_1234",
      from: { ja: "AI_GATEWAY_API_KEY（環境変数）", en: "AI_GATEWAY_API_KEY (environment variable)" },
    });
  });

  test("TYPESAFE_API_KEY に vck_ のキーが入っていれば Gateway 用に回し、注記を残す", () => {
    const creds = resolveCredentials([env({ TYPESAFE_API_KEY: "vck_secretvalue" })]);
    expect(creds.typesafe).toBeUndefined();
    expect(creds.gateway?.key).toBe("vck_secretvalue");
    for (const lang of ["ja", "en"] as const) {
      const notes = creds.notes.map((note) => note[lang]).join();
      expect(notes).toContain("TYPESAFE_API_KEY");
      expect(notes).not.toContain("secretvalue");
    }
  });

  test("環境変数が .env.local の同名変数を隠していても、両方のキーを拾う", () => {
    const creds = resolveCredentials([
      env({ TYPESAFE_API_KEY: "vck_gateway" }),
      file({ TYPESAFE_API_KEY: "ts_official" }),
    ]);
    expect(creds.gateway?.key).toBe("vck_gateway");
    expect(creds.typesafe).toEqual({
      key: "ts_official",
      from: { ja: "TYPESAFE_API_KEY（.env.local）", en: "TYPESAFE_API_KEY (.env.local)" },
    });
  });

  test("先に渡したソースが優先される", () => {
    const creds = resolveCredentials([
      env({ TYPESAFE_API_KEY: "ts_from_env" }),
      file({ TYPESAFE_API_KEY: "ts_from_file" }),
    ]);
    expect(creds.typesafe?.key).toBe("ts_from_env");
  });

  test("空白だけの値は無視し、前後の空白は取り除く", () => {
    const creds = resolveCredentials([env({ TYPESAFE_API_KEY: "   ", AI_GATEWAY_API_KEY: "  vck_trim \n" })]);
    expect(creds.typesafe).toBeUndefined();
    expect(creds.gateway?.key).toBe("vck_trim");
  });
});

describe("maskKey", () => {
  test("接頭辞と末尾 4 文字だけ残す", () => {
    expect(maskKey("vck_abcdefgh1234")).toBe("vck_…1234");
    expect(maskKey("ts_live_abcdefgh9876")).toBe("ts_…9876");
  });

  test("接頭辞が無いキーは末尾 4 文字だけ", () => {
    expect(maskKey("abcdefgh1234")).toBe("…1234");
  });

  test("短すぎるキーは伏せ字だけ", () => {
    expect(maskKey("abc")).toBe("…");
  });
});

describe("parseEnvFile", () => {
  test("KEY=VALUE を読み、コメントと空行を飛ばす", () => {
    const text = [
      "# comment",
      "",
      "TYPESAFE_API_KEY=ts_1",
      "export AI_GATEWAY_API_KEY=vck_2",
      'QUOTED="with space"',
      "SINGLE='single'",
      "EMPTY=",
    ].join("\n");
    expect(parseEnvFile(text)).toEqual({
      TYPESAFE_API_KEY: "ts_1",
      AI_GATEWAY_API_KEY: "vck_2",
      QUOTED: "with space",
      SINGLE: "single",
      EMPTY: "",
    });
  });
});
