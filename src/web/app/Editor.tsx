// CodeMirror 6 のエディタ。色は CSS 変数で指定し、ライトとダークの両方に合わせる。

import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword], color: "var(--syntax-keyword)", fontWeight: "600" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--syntax-string)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--syntax-number)" },
  { tag: tags.comment, color: "var(--syntax-comment)", fontStyle: "italic" },
  { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: "var(--syntax-property)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--syntax-function)" },
  { tag: tags.punctuation, color: "var(--ink-2)" },
]);

const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--surface)", color: "var(--ink)" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.65" },
  ".cm-content": { caretColor: "var(--mass)", padding: "12px 0" },
  ".cm-gutters": { backgroundColor: "var(--surface)", color: "var(--ink-3)", border: "none" },
  ".cm-activeLine": { backgroundColor: "var(--surface-2)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--surface-2)", color: "var(--ink-2)" },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--mass-2) !important",
  },
  ".cm-matchingBracket": { backgroundColor: "var(--mass-2)", outline: "1px solid var(--mass)" },
});

export function Editor({
  initial,
  onChange,
  onRun,
  label,
}: {
  initial: string;
  onChange: (code: string) => void;
  onRun: () => void;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  // 最新のコールバックを参照する。エディタは作り直さない
  const callbacks = useRef({ onChange, onRun });
  callbacks.current = { onChange, onRun };

  // biome-ignore lint/correctness/useExhaustiveDependencies: 初期値はレッスンを開いたときだけ使う（呼び出し側が key でレッスンごとに作り直す）
  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initial,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          indentOnInput(),
          bracketMatching(),
          javascript(),
          EditorView.lineWrapping,
          syntaxHighlighting(highlight),
          theme,
          EditorState.tabSize.of(2),
          EditorView.contentAttributes.of({ "aria-label": label }),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                callbacks.current.onRun();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    return () => view.destroy();
  }, []);

  return <div className="editor" ref={host} />;
}
