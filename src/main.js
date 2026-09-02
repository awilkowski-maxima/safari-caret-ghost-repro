import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

// One paragraph joined by hard breaks, deliberately. Separate <p> blocks do not
// reproduce the bug: the caret has to already sit after a <br>.
const content =
  "<p>first line<br>second line<br>third line<br>" +
  "fourth line<br>fifth line<br>sixth line</p>";

new Editor({
  element: document.querySelector("#editor"),
  extensions: [StarterKit],
  content,
});
