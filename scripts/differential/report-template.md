# Differential testing found a footnote conformance bug

The packaged `djot.v` parser moves a lazy continuation line out of its footnote and into the main document. Current `djot.js` keeps it inside the note, as the Djot syntax reference requires.

Tested pins:

| Implementation | Revision |
|---|---|
| djot.v | [`3279f36`](https://github.com/hon-gyu/djot.v/tree/3279f362fbbcc6d33c3a2795252f903ab0a7288f) |
| Current djot.js at the time of this run | [`d93aff3`](https://github.com/jgm/djot.js/tree/d93aff39561a4306c8d59cebd9e07cc6712e1be3) |
| Released djot.js, secondary comparison | npm `@djot/djot` 0.3.2 |

## Lazy footnote continuation

```djot
[^n]: a
b

[^n]
```

| Result | djot.js at d93aff3 | djot.v at 3279f36 |
|---|---|---|
| Footnote paragraph | `a` followed by `b` | Only `a` |
| Extra main-document paragraph | None | `<p>b</p>` |

The [footnote syntax](https://github.com/jgm/djot/blob/d77f8a0cbea6785c42b3e2b03463195b5ca6f7c7/doc/syntax.md#footnote) permits subsequent paragraph lines to omit indentation. This input has no intervening blank line, so `b` belongs to the footnote paragraph.

Two controls agree in both parsers: indent `b` by one space and it stays in the note; put a blank line before an unindented `b` and it becomes a main-document paragraph. An unreferenced note exposes the same bug more compactly:

```djot
[^n]: a
b
```

Djot.js renders nothing, while djot.v renders `<p>b</p>`.

The [`PFoot` branch](https://github.com/hon-gyu/djot.v/blob/3279f362fbbcc6d33c3a2795252f903ab0a7288f/theories/Step.v#L2177) accepts blank or sufficiently indented continuation lines, then closes the footnote for other lines. It does not take the lazy-paragraph continuation branch used elsewhere. No upstream fix was attempted. Two [Rocq witnesses](../scripts/differential/FootnoteWitness.v) also check the block shapes directly: the lazy case has a footnote followed by a top-level paragraph; the indented case has only a footnote. Both are [closed under the global context](djot-differential-proofs.json). The discrepancy is therefore present in the Rocq source model as well as the packaged runtime. The [default API](https://github.com/hon-gyu/djot.v/blob/3279f362fbbcc6d33c3a2795252f903ab0a7288f/dist/src/djot.ml#L245) selects the [Djot profile](https://github.com/hon-gyu/djot.v/blob/3279f362fbbcc6d33c3a2795252f903ab0a7288f/theories/Profile.v#L41), whose inline and block settings match the witness; both use semantic positions.

[footnote-lazy.test](../tests/differential/footnote-lazy.test) contains four cases in djot.js's conformance-test format: the referenced and unreferenced failures, plus both controls. Expected HTML matches current djot.js. Our runner verifies the file against fresh outputs. The djot.v conformance harness reads this format: running its `test/diff.exe` with the packaged parser as `--subject` produced [two matches, two mismatches and zero errors](djot-differential-upstream.txt). The file is ready for that harness and would add four passing cases to djot.js. Its two failing djot.v cases expose the bug.

## Separate renderer candidate: unresolved image alt text

```djot
![x][r]
```

Djot.js emits `<p><img></p>`; djot.v emits `<p><img alt="x"></p>`. Adding `[r]: /target` makes both render the same image, with alt text and a source. The collapsed form `![x][]` has the same unresolved-reference difference.

In [djot.js's renderer](https://github.com/jgm/djot.js/blob/d93aff39561a4306c8d59cebd9e07cc6712e1be3/src/html.ts#L411), the reference-image branch assigns `alt` only when reference lookup succeeds. Retaining the available alt text on lookup failure is a concrete renderer improvement to discuss. The syntax reference does not specify the exact HTML fallback for an unresolved image, so this report does not label it a specification violation.

## Sweep and triage

The deterministic corpus has {{inputs}} distinct inputs: combinations of inline constructs, containers and document context, three-block sequences, and 750 seeded document attempts with duplicates removed. It covers references, heading IDs, attributes, incomplete syntax, tables and footnotes. Every input uses the default profiles.

| Exact HTML comparison | Different inputs |
|---|---:|
| Current djot.js versus djot.v | {{currentDifferences}} |
| npm djot.js 0.3.2 versus djot.v | {{releasedDifferences}} |
| Current versus npm djot.js | {{releaseDrift}} |

These counts are candidate inputs, not distinct bugs. No HTML whitespace, attribute ordering or other serialization is normalized. Of the current comparison, {{matches}} inputs match exactly. [The raw record](djot-differential.json) contains every observed disagreement, both JavaScript outputs, native output, pins, suite digest, focused controls and reductions.

The focused triage also checks three already documented differences: [recovered attributes inside containers and escaped closing brackets in reference labels](https://github.com/hon-gyu/djot.v/blob/3279f362fbbcc6d33c3a2795252f903ab0a7288f/.project/djotjs-divergences.md), and the intentional use of rendered smart punctuation in heading IDs. Those are not presented as new findings. A duplicate footnote-reference ID difference in npm 0.3.2 is already fixed in the current source revision. The focused fixture records that agreement as a control.

Twelve focused cases were checked in both batch and fresh processes for all three readers. JavaScript batch runs reset smart-quote defaults using upstream's test-harness recipe. Native messages use byte-length framing; the focused Unicode case checks that framing against a fresh process.

A character-deletion reducer shrinks the two selected families while retaining a valid two-line footnote or a nonempty reference image. It reaches these inputs:

```djot
[^e]: a
a
```

```djot
![a][g]
```
 No single-character deletion that stays in the selected family retains a disagreement. This is a local minimality claim, not a proof of globally shortest inputs. Combined-input disagreements have not all been assigned independent root causes.

## Reproduce

From the repository root with dependencies installed and OCaml 4.14.2 / Dune 3.23.1 available through opam:

```sh
npm run build:djot-v
npm run build:djot-differential
npm run check:djot-differential -- --check reports/djot-differential.json
# With Rocq 9.2 / stdlib 9.1 installed:
npm run proof:djot-differential -- --check reports/djot-differential-proofs.json
```

The build fetches the pinned djot.js source, installs its locked build dependencies in ignored `.cache/`, compiles it with TypeScript 4.9.4, and builds a separate native HTML driver. It verifies source revisions and records compiled-output hashes. Add `--output <path>` to save fresh observations; with `--check`, writing happens only after the snapshot comparison passes.

CI runs the same deterministic comparison. The native observations use the packaged kernel; the earlier [Rocq/extraction consistency discrepancy](djot-v.md#formal-checks-and-extraction-boundary) remains a separate result. Nothing here claims a proof of full Djot conformance.
