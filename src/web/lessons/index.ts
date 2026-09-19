import { basics } from "./part1-basics.ts";
import { inputs } from "./part2-inputs.ts";
import { scale } from "./part3-scale.ts";
import { workflow } from "./part4-workflow.ts";
import { limits } from "./part5-limits.ts";
import { playground } from "./playground.ts";
import type { Lesson, LessonId, Part } from "./types.ts";

export const PARTS: readonly Part[] = [
  { id: "basics", title: "はじめの一歩" },
  { id: "inputs", title: "入力を設計する" },
  { id: "scale", title: "速さ・確率・費用" },
  { id: "workflow", title: "コードで組み立てる" },
  { id: "limits", title: "限界と組み合わせ" },
  { id: "free", title: "自由に試す" },
];

/** 目次の順番。前後の移動もこの順番で行う。 */
export const LESSONS: readonly Lesson[] = [...basics, ...inputs, ...scale, ...workflow, ...limits, playground];

export const findLesson = (id: string): Lesson | undefined => LESSONS.find((lesson) => lesson.id === id);

export function neighbors(id: LessonId): { readonly previous?: Lesson; readonly next?: Lesson } {
  const index = LESSONS.findIndex((lesson) => lesson.id === id);
  if (index < 0) return {};
  const previous = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  return { ...(previous ? { previous } : {}), ...(next ? { next } : {}) };
}
