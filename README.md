# Repro: Safari leaves a stale caret behind when a scroll pins the caret during an edit

Editing in a ProseMirror editor inside a short scrolling container leaves a
second caret painted at the caret's previous screen position. It persists
indefinitely, frozen at whatever opacity Safari's caret fade animation happened
to be at, and is erased only by moving the caret over it or typing.

**Confirmed on** `@tiptap/core@3.29.2`, `@tiptap/starter-kit@3.29.2`,
`prosemirror-view@1.42.2`, in **Safari 26.3 on macOS 26.3 (25D125)**.
**Chrome is unaffected.**

We could not reproduce this without ProseMirror. Hand-written editors making the
same DOM change with the same scroll stay clean, so the trigger may be specific
to how ProseMirror updates the DOM, and the minimal operation behind it is not
yet known.

## Run

```bash
npm install
npm run dev
```

Open the printed URL in **Safari**.

## Steps

1. Click into the editor and put the caret at the start of a line near the
   bottom. Not the first line, which never reproduces it.
2. Press **Shift+Return** a few times. Not plain Return, which splits the
   paragraph into a new block and does not reproduce it. Deleting lines can
   also produce the ghost when the delete scrolls the box, less reliably.
3. A second caret remains at the caret's previous screen position.

The blink phase matters, so give it several attempts.

## Required conditions

All four are necessary; none alone is sufficient.

1. **The caret already sits immediately after a hard break.** Content made of
   separate `<p>` blocks does not reproduce it, however the caret got there.
   This is why the very first line never reproduces it: nothing precedes it.
2. **The edit adds or removes a hard break.** Insertion reproduces it readily;
   deletion only when it happens to scroll the box. A plain Return splits the
   paragraph into a new block and does **not** reproduce it, even though
   ProseMirror scrolls the caret into view either way, so the trigger is
   inline-level rather than a block split.
3. **ProseMirror performs the edit.** Hand-written editors making the same DOM
   mutation with the same scroll do not reproduce it, including ones that
   replicate ProseMirror's trailing `<br>`, its `<p>` wrapper, and in-place
   text-node patching. Checked with the other three conditions verified on each
   attempt, including confirming that the container actually scrolled.
4. **The container scrolls so the caret ends at the same screen position.**
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
- **The DOM ProseMirror produces.** See condition 3 above.
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

That it needs a hard break both before the caret and as the edit, and never
reproduces on a paragraph split, points at the line-break caret path
specifically. WebKit computes caret geometry for these
positions in `computeCaretRectForLineBreak`, which has its own open report,
[bug 243850](https://bugs.webkit.org/show_bug.cgi?id=243850) (an assertion
failure, so a different symptom, but the same function). An alternative reading
is that a paragraph split creates a new block box and so forces a wider
invalidation that scrubs the stale caret, the same way a container resize does.
Both readings fit the evidence.

Unrelated to this bug: deleting near the top of the box can leave the caret
scrolled out of view. That happens in Chrome as well, so it is editor behaviour
rather than a rendering fault, and is not what this report is about.

What remains unknown is which part of ProseMirror's update cycle is also
required, given that hand-written equivalents stay clean. Candidates are its
`DOMObserver` stop/start around DOM writes and its scroll-position save/restore
during redraws.

