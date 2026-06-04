"use client";

import { useImperativeHandle, forwardRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";

export type ZenEditorHandle = {
  focusEnd: () => void;
  insertText: (text: string) => void;
};

/**
 * The Zen answer field. A real TipTap/ProseMirror editor (no hand-rolled
 * contenteditable): markdown input rules ("- " → bullet, "# " → heading) come
 * from StarterKit, content persists as clean Markdown (Mirror-readable), and the
 * Zen keyboard scheme is wired here:
 *   Enter            → newline / continue list (TipTap default)
 *   ⌘/⇧ + Enter      → next question  (onNext)
 *   ⌘/⇧ + Backspace  → previous       (onPrev)
 */
export const ZenEditor = forwardRef<
  ZenEditorHandle,
  {
    value: string;
    placeholder: string;
    onChange: (markdown: string) => void;
    onNext: () => void;
    onPrev: () => void;
  }
>(function ZenEditor({ value, placeholder, onChange, onNext, onPrev }, ref) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: value,
    autofocus: "end",
    editorProps: {
      attributes: { class: "zen-prose" },
      handleKeyDown(_view, event) {
        if (event.key === "Enter" && (event.metaKey || event.shiftKey)) {
          event.preventDefault();
          onNext();
          return true;
        }
        if (event.key === "Backspace" && (event.metaKey || event.shiftKey)) {
          event.preventDefault();
          onPrev();
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      const md = (editor.storage as any).markdown.getMarkdown();
      onChange(md);
    },
  });

  useImperativeHandle(ref, () => ({
    focusEnd: () => editor?.chain().focus("end").run(),
    insertText: (text: string) => editor?.chain().focus().insertContent(text).run(),
  }));

  // Note: this component is REMOUNTED per question (keyed on the question in
  // ZenCore), so `content: value` + autofocus handle load/focus on mount. We
  // deliberately do not sync `value` after mount — that avoids clobbering the
  // user's live keystrokes and the stale-content race it caused.
  return <EditorContent editor={editor} />;
});
