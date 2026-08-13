# Repro: Safari leaves a stale caret behind when a scroll pins the caret during an edit

Editing in a ProseMirror editor inside a short scrolling container leaves a
second caret painted at the caret's previous screen position. It persists
indefinitely, frozen at whatever opacity Safari's caret fade animation happened
to be at, and is erased only by moving the caret over it or typing.

**Confirmed on** `@tiptap/core@3.29.2`, `@tiptap/starter-kit@3.29.2`,
`prosemirror-view@1.42.2`, in **Safari 26.3 on macOS 26.3 (25D125)**.
**Chrome is unaffected.**

## Run

```bash
npm install
npm run dev
```

Open the printed URL in **Safari**.

## Steps

1. Click into the editor.
2. Put the caret at the **start of a line near the bottom** of the box.
3. Press **Shift+Enter** a few times. Deleting a line from the middle of the
   content sometimes reproduces it too, less reliably than inserting.
4. A second caret remains at the caret's previous screen position. Don't move
   the mouse or type while looking, since either erases it.

The blink phase matters, so give it several attempts. Whether the stranded
caret looks solid or half faded depends on where the fade animation was when it
got stranded, and it stays at that opacity.

## Required conditions

Both are necessary; neither alone is sufficient.

1. **ProseMirror performs the edit.** Hand-written editors making the same DOM
   mutation with the same scroll do not reproduce it, including ones that
   replicate ProseMirror's trailing `<br>`, its `<p>` wrapper, and in-place
   text-node patching.
2. **The container scrolls so the caret ends at the same screen position.**
   With `overflow: visible`, where the caret visibly moves outside the box,
   there is no ghost. Setting `handleScrollToSelection: () => true`, which
   suppresses ProseMirror's scroll entirely, also eliminates it; that is the
   only intervention found that does, and it works only by letting the caret
   leave the visible area, so it is not a usable fix.

A resize is **not** required, and in fact suppresses the bug: when the container
grows with its content, the resulting relayout appears to invalidate the region.
Fixed-size and scrolling containers reproduce.

## Ruled out

- **ProseMirror's stylesheet.** Reproduces with `injectCSS: false`.
- **The DOM ProseMirror produces.** See condition 1 above.
- **The scroll implementation.** Replacing ProseMirror's scroll with a manual
  `scrollTop` adjustment, synchronous or deferred a frame, still reproduces.
- **CSS repaint hints.** `will-change: transform`, `transform: translateZ(0)`,
  `contain: paint`, `backface-visibility: hidden`, and `will-change: contents`,
  all applied to the editable element, all reproduce.
- **Forced repaints from JS.** Toggling opacity after the edit, both inside the
  transaction and on the next frame, still reproduces.

## Why it looks like a WebKit bug

Nothing in page CSS or in the editing code suppresses it, and Chrome renders the
same DOM and the same scroll correctly. A caret frozen mid-fade is a paint that
was never erased rather than anything the page can produce.
[WebKit changeset 281136](https://trac.webkit.org/changeset/281136/webkit)
describes this class of defect: when a block changes size during layout, WebKit
can fail to invalidate the old content area, "potentially leaving painting
artefacts behind."

What remains unknown is which part of ProseMirror's update cycle is also
required, given that hand-written equivalents stay clean. Candidates are its
`DOMObserver` stop/start around DOM writes and its scroll-position save/restore
during redraws.
