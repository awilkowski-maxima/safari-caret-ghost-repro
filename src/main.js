import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { schema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import "prosemirror-view/style/prosemirror.css";

const LINES = [
  "first line", "second line", "third line", "fourth line", "fifth line",
  "sixth line", "seventh line", "eighth line", "ninth line", "tenth line",
];

const hardBreak = schema.nodes.hard_break;

// One paragraph joined by hard breaks, deliberately. Separate paragraphs do not
// reproduce the bug: the caret has to already sit after a hard break.
const inline = [];
LINES.forEach((line, i) => {
  if (i) inline.push(hardBreak.create());
  inline.push(schema.text(line));
});
const doc = schema.node("doc", null, [schema.node("paragraph", null, inline)]);

// The standard hard-break recipe. Its scrollIntoView() is what holds the caret
// at a fixed screen position, which the bug requires.
const insertHardBreak = (state, dispatch) => {
  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(hardBreak.create()).scrollIntoView());
  }
  return true;
};

new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc,
    plugins: [keymap({ "Shift-Enter": insertHardBreak }), keymap(baseKeymap)],
  }),
});
