import { describe, expect, test } from "bun:test";
import type { Questions } from "../../src/contract/jev.ts";
import { findLesson, LESSONS, neighbors, PARTS } from "../../src/web/lessons/index.ts";
import { type LessonId, lessonId } from "../../src/web/lessons/types.ts";
import { renderMarkdown } from "../../src/web/lib/markdown.ts";
import { runUserCode } from "../../src/web/runner/execute.ts";
import { type CallResponse, emptyRun, type RunEvent, type RunRecord, reduceRun } from "../../src/web/runner/record.ts";
import { createRuntime } from "../../src/web/runner/scope.ts";
import { fakeAnswers, fakeTransport } from "./fake-transport.ts";

const settings = { provider: "typesafe" as const, model: "jev-latest", llmModel: "openai/gpt-5.6-luna" };

/** レッスンのコードを偽の API で実行し、実行記録を返す。 */
async function runLesson(code: string): Promise<RunRecord> {
  const events: RunEvent[] = [];
  const runtime = createRuntime(fakeTransport(), (e) => events.push(e), settings);
  const result = await runUserCode(code, runtime.globals);
  await runtime.whenIdle();
  events.push(
    result.ok ? { type: "done", ok: true, value: result.value } : { type: "done", ok: false, error: result.error },
  );
  return events.reduce(reduceRun, emptyRun());
}

/** 課題の判定を試すための実行記録を組み立てる。 */
function recordOf(
  calls: ReadonlyArray<{
    kind?: "jev" | "llm-evaluate";
    request: { state?: unknown; questions: Questions };
    answers?: Record<string, unknown>;
  }>,
  shown: ReadonlyArray<unknown> = [],
): RunRecord {
  const events: RunEvent[] = calls.flatMap((call, index): RunEvent[] => {
    const response = {
      model: "jev-1.13.0",
      answers: call.answers ?? fakeAnswers(call.request.questions),
      usage: { input_tokens: 1, output_tokens: 0 },
    } as CallResponse;
    return [
      { type: "call-start", id: index + 1, kind: call.kind ?? "jev", request: call.request },
      { type: "call-end", id: index + 1, ok: true, response },
    ];
  });
  const shows: RunEvent[] = shown.map((value) => ({ type: "show", value }));
  return [...events, ...shows, { type: "done", ok: true } as RunEvent].reduce(reduceRun, emptyRun());
}

const check = (id: string, run: RunRecord) => {
  const exercise = findLesson(id)?.exercise;
  if (!exercise) throw new Error(`${id} に課題がありません`);
  return exercise.check(run);
};

describe("レッスンの形", () => {
  test("ID が重複していない", () => {
    const ids = LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("すべてのレッスンが目次の部に属し、各部に 1 つ以上のレッスンがある", () => {
    const partIds = PARTS.map((part) => part.id);
    for (const lesson of LESSONS) expect(partIds).toContain(lesson.part);
    for (const part of PARTS) expect(LESSONS.some((lesson) => lesson.part === part.id)).toBe(true);
  });

  test("目次の順番は部の順番と一致する", () => {
    const order = LESSONS.map((lesson) => PARTS.findIndex((part) => part.id === lesson.part));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test.each(LESSONS.map((lesson) => [lesson.id, lesson] as const))("%s: 必須項目が埋まっている", (_, lesson) => {
    expect(lesson.title.trim()).not.toBe("");
    expect(lesson.lead.trim()).not.toBe("");
    expect(lesson.body.trim()).not.toBe("");
    expect(lesson.code.trim()).not.toBe("");
    expect(lesson.docs.length).toBeGreaterThan(0);
    for (const doc of lesson.docs) expect(doc.url).toStartWith("https://");
  });

  test.each(LESSONS.map((lesson) => [lesson.id, lesson] as const))(
    "%s: 本文が Markdown として描画できる",
    (_, lesson) => {
      const html = renderMarkdown(lesson.body);
      // エスケープ漏れがあると「\`」がそのまま残る
      expect(html).not.toContain("\\`");
      expect(html).not.toContain("${");
    },
  );
});

describe("レッスンのコードが最後まで動く（偽の API で実行）", () => {
  test.each(LESSONS.map((lesson) => [lesson.id, lesson] as const))("%s", async (_, lesson) => {
    const run = await runLesson(lesson.code);
    expect(run.error).toBeUndefined();
    expect(run.status).toBe("done");
    expect(run.calls.length).toBeGreaterThan(0);
    expect(run.calls.every((call) => call.status === "ok")).toBe(true);
  });
});

describe("課題の判定", () => {
  test.each(LESSONS.filter((l) => l.exercise).map((l) => [l.id, l] as const))(
    "%s: 何も実行していなければ合格にならない",
    (_, lesson) => {
      expect(lesson.exercise?.check(emptyRun()).pass).toBe(false);
    },
  );

  test("hello: is_urgent が 0.2 未満で合格", () => {
    const q = { is_urgent: { type: "noul" as const, instructions: "?" } };
    expect(
      check("hello", recordOf([{ request: { questions: q }, answers: { is_urgent: { type: "noul", noul: 0.1 } } }]))
        .pass,
    ).toBe(true);
    expect(
      check("hello", recordOf([{ request: { questions: q }, answers: { is_urgent: { type: "noul", noul: 0.9 } } }]))
        .pass,
    ).toBe(false);
  });

  test("choice: billing を confidence 0.8 以上で合格", () => {
    const q = { department: { type: "choice" as const, criteria: { billing: null } } };
    const answer = (choice: string, confidence: number) => ({ department: { type: "choice", choice, confidence } });
    expect(check("choice", recordOf([{ request: { questions: q }, answers: answer("billing", 0.9) }])).pass).toBe(true);
    expect(check("choice", recordOf([{ request: { questions: q }, answers: answer("billing", 0.5) }])).pass).toBe(
      false,
    );
    expect(check("choice", recordOf([{ request: { questions: q }, answers: answer("returns", 0.9) }])).pass).toBe(
      false,
    );
  });

  test("score: state を変えず、レベルを構造化して confidence 0.8 以上で合格", () => {
    const structured = {
      severity: {
        type: "score" as const,
        criteria: [
          { what: "a", examples: ["x"] },
          { what: "b", examples: ["y"] },
          { what: "c", examples: ["z"] },
        ],
      },
    };
    const plain = { severity: { type: "score" as const, criteria: ["a", "b", "c"] } };
    const answers = { severity: { type: "score", score: 1, confidence: 0.9 } };
    const state = "The export button crashes the settings page in Safari.";
    expect(check("score", recordOf([{ request: { state, questions: structured }, answers }])).pass).toBe(true);
    expect(check("score", recordOf([{ request: { state, questions: plain }, answers }])).pass).toBe(false);
    expect(check("score", recordOf([{ request: { state: "other", questions: structured }, answers }])).pass).toBe(
      false,
    );
  });

  test("state: messages[1] を指す Noul が 0.5 未満で合格", () => {
    const q = { support: { type: "noul" as const, instructions: "Does `ticket.messages[1].text` request a refund?" } };
    expect(
      check("state", recordOf([{ request: { questions: q }, answers: { support: { type: "noul", noul: 0.1 } } }])).pass,
    ).toBe(true);
    expect(
      check("state", recordOf([{ request: { questions: q }, answers: { support: { type: "noul", noul: 0.8 } } }])).pass,
    ).toBe(false);
  });

  test("atomic: 合成した spam_risk が 0.2 未満で合格", () => {
    const ids = ["requests_credentials", "sender_mismatch", "unexpected_reward"];
    const q = Object.fromEntries(ids.map((id) => [id, { type: "noul" as const, instructions: "?" }]));
    const answers = (p: number) => Object.fromEntries(ids.map((id) => [id, { type: "noul", noul: p }]));
    expect(check("atomic", recordOf([{ request: { questions: q }, answers: answers(0.05) }])).pass).toBe(true);
    expect(check("atomic", recordOf([{ request: { questions: q }, answers: answers(0.5) }])).pass).toBe(false);
  });

  test("fanout: 6 問以上をまとめて聞けば合格", () => {
    const q = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`q${i}`, { type: "noul" as const }]));
    expect(check("fanout", recordOf([{ request: { questions: q(6) } }])).pass).toBe(true);
    expect(check("fanout", recordOf([{ request: { questions: q(5) } }])).pass).toBe(false);
  });

  test("confidence: 表の行動が 4 種類で合格", () => {
    const row = (行動: string) => ({ 行動 });
    const four = [row("a"), row("b"), row("c"), row("d")];
    expect(check("confidence", recordOf([], [four])).pass).toBe(true);
    expect(check("confidence", recordOf([], [four.slice(0, 3)])).pass).toBe(false);
  });

  test("workflow: quarantine の行があれば合格", () => {
    expect(check("workflow", recordOf([], [[{ action: "billing" }, { action: "quarantine" }]])).pass).toBe(true);
    expect(check("workflow", recordOf([], [[{ action: "billing" }]])).pass).toBe(false);
  });

  test("composite: PDF がログイン障害より上、見た目のずれが最下位で合格", () => {
    const rows = (...names: string[]) => names.map((ticket) => ({ ticket }));
    const pdf = "Export to PDF fails…";
    const login = "Nobody on our team can…";
    const icon = "The export icon is…";
    expect(check("composite", recordOf([], [rows(pdf, login, icon)])).pass).toBe(true);
    expect(check("composite", recordOf([], [rows(login, pdf, icon)])).pass).toBe(false);
    expect(check("composite", recordOf([], [rows(pdf, icon, login)])).pass).toBe(false);
  });

  test("two-step: 3 回呼んで葉を選べば合格", () => {
    const q = { c: { type: "choice" as const, criteria: { x: null } } };
    const pick = (choice: string) => ({ c: { type: "choice", choice } });
    const calls = [
      { request: { questions: q }, answers: pick("Sporting Goods") },
      { request: { questions: q }, answers: pick("Cycling") },
      { request: { questions: q }, answers: pick("Bike Bottles & Cages") },
    ];
    expect(check("two-step", recordOf(calls)).pass).toBe(true);
    expect(check("two-step", recordOf(calls.slice(0, 2))).pass).toBe(false);
  });

  test("vs-llm: Jev と LLM を 5 回ずつ呼べば合格", () => {
    const q = { r: { type: "noul" as const } };
    const five = (kind: "jev" | "llm-evaluate") =>
      Array.from({ length: 5 }, () => ({ kind, request: { questions: q } }));
    expect(check("vs-llm", recordOf([...five("jev"), ...five("llm-evaluate")])).pass).toBe(true);
    expect(check("vs-llm", recordOf(five("jev"))).pass).toBe(false);
  });

  test("with-llm: breaks_policy が 0.5 を超えれば合格", () => {
    const q = { breaks_policy: { type: "noul" as const } };
    const answers = (p: number) => ({ breaks_policy: { type: "noul", noul: p } });
    expect(check("with-llm", recordOf([{ request: { questions: q }, answers: answers(0.9) }])).pass).toBe(true);
    expect(check("with-llm", recordOf([{ request: { questions: q }, answers: answers(0.1) }])).pass).toBe(false);
  });
});

describe("前後のレッスン", () => {
  test("最初は前が無く、最後は次が無い", () => {
    const first = LESSONS[0]?.id as LessonId;
    const last = LESSONS.at(-1)?.id as LessonId;
    expect(neighbors(first).previous).toBeUndefined();
    expect(neighbors(first).next?.id).toBe(LESSONS[1]?.id as LessonId);
    expect(neighbors(last).next).toBeUndefined();
  });

  test("知らない ID は空", () => {
    expect(neighbors(lessonId("nope"))).toEqual({});
  });
});
