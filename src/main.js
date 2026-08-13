import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

const content = "<p>first line<br>second line<br>third line<br>fourth line</p>";

new Editor({
  element: document.querySelector("#editor"),
  extensions: [StarterKit],
  content,
});
