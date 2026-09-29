# Four-reader ownership matrix

The matrix records 472 inputs against independently pinned Carve readers. There
are 43 structural HTML disagreements and 429 agreements. Every input completes
in all four readers. The disagreements fall into eleven investigation families;
these counts do not establish eleven independent bugs.

| Family | Inputs | Disagreements |
|---|---:|---:|
| Footnote/list fences, columns 2 through 8 | 42 | 0 |
| Empty and visible blocks in lists and quoted lists | 30 | 0 |
| Boundary, indentation and follower combinations | 400 | 43 |

[Reader pins](../scripts/ownership/pins.json) identify the exact source revisions.
The executable specification is a derived checker, not the language authority.
These pins are independent of the older specification submodule and layout
proofs. This experiment adds no Rocq theorem.

## Issue seeds

[Carve #2598](https://github.com/markup-carve/carve/issues/2598) is resolved at
these pins. [Carve #2605](https://github.com/markup-carve/carve/pull/2605) pins the
block interpretation after a footnote quote, and
[carve-js #2361](https://github.com/markup-carve/carve-js/pull/2361) fixes fence
rebasing. All 42 code and visible raw HTML fence cases now agree across the four
readers, including columns 2 through 8 and both control hosts: a footnote
starting with prose and a list starting with a quote.

Compared with the [previous evidence](https://github.com/markup-carve/carve-proofs/blob/3496c574f1b40b27dc102aef0327a9eb1dcc6abd/reports/ownership-results.json),
only twelve JS outputs changed: the code and raw fences at columns 3 through 8
after a footnote quote. Each changed from an inline-code interpretation to the
block output already produced by the other readers. The remaining 460 inputs
are unchanged, including all 43 unresolved disagreements. Every spec, PHP and
Rust output is unchanged. The input suite and comparison projection are also
unchanged; the PHP and Rust pins stay fixed. The resolved family remains in the
matrix as a regression check and is removed from the active reductions.

The empty-comment seed from
[Carve #2567](https://github.com/markup-carve/carve/issues/2567) now renders a tight
item in all four readers. All 30 empty-slot and visible-block controls agree
under the projection. This records current agreement; it does not identify the
fix or establish agreement for the issue's entire original grid.

## Decisions for the remaining families

These are proposed resolutions for review in the Carve specification repository.
The evidence baseline records observed behavior, including disagreements. It
does not declare a majority result correct or silently turn these proposals
into normative expectations.

The principal clauses are [Part 0 owner selection and block bases](https://github.com/markup-carve/carve/blob/44c267b0e2eece256cefbcd718408326db6e8487/resources/spec/01-layout.ebnf),
[§10 paragraph interruption](https://github.com/markup-carve/carve/blob/44c267b0e2eece256cefbcd718408326db6e8487/resources/spec/14-semantics-blocks.ebnf),
and [§24 C3 list ownership](https://github.com/markup-carve/carve/blob/44c267b0e2eece256cefbcd718408326db6e8487/resources/spec/16-semantics-comments-security.ebnf).
CARVE-P0-004 gives a recognized opener beyond the minimum content column its
own authored block base.

| Investigation family | Cases | Observation | Recommended decision or missing specification fixture |
|---|---:|---|---|
| `opener-after-content-comment` | 9 | JS/PHP recognize a block; spec/Rust retain marker text. | Apply P0-004 after paragraph closure. Pin heading, quote and matched fence at a column beyond the item's minimum. |
| `marker-below-content` | 4 | Spec retains marker text; engines open a sublist. | C3 requires a child to reach the content column. Reject below-column child creation; explicitly settle retained text versus reclassification in the surviving context after the comment. |
| `quote-lazy-interruption` | 3 | For heading/fence followers, Rust opens an outer block. For a quote follower, Rust consumes the marker; the others keep it as text. | Pin both interruption coordinates and whether a below-item-column quote marker can satisfy the nested quote prefix. Keep these as open selection questions until the fixtures are normative. |
| `quote-comment-opener` | 3 | Rust retains opener text; others recognize a block in the outer item. | Close the quote paragraph at the comment and apply P0-004 in the surviving item. Pin the enclosing stack explicitly. |
| `nested-lazy-code` | 2 | PHP moves code payload outside the nested lists. | A below-column line admitted as lazy text or retained after a low comment must remain in its paragraph's container (C3). Pin the full multiline code span and its payload owner. |
| `nested-comment-outer-opener` | 4 | At column 2, Rust keeps the follower in the inner item; others select the outer item or its child block. | Select ownership and interruption per frame after a below-column comment. Retention must not substitute for opener classification. |
| `nested-comment-inner-opener` | 4 | At column 4, Rust selects the outer item; others put the new block in the inner item. | State which inner frame survives the comment. If it survives, P0-004 assigns the reached opener to that innermost frame. |
| `nested-content-comment-opener` | 3 | All recognize the block. Spec/Rust put it in the inner item; JS/PHP select the outer item. | Settle the surviving stack when the comment reaches the outer content column but misses the inner one. Block recognition is agreed; ownership remains open. |
| `nested-comment-retention` | 4 | PHP moves the follower to document level; others retain it in the inner item. | Specify how below-column retention in the inner item interacts with a comment at the outer item's content column. Keep the exact owner open until the nested-stack rule is stated. |
| `nested-comment-marker` | 1 | Spec makes an inner sibling, JS/Rust a deeper child, PHP a document list. | Apply sibling recognition before retention and require the selected parent's content column for a child. Pin which frame survives; the single-frame model cannot decide this shape. |
| `nested-comment-blank` | 6 | Rust selects the outer item where others retain or reopen inner content. | A blank clears retention but does not by itself decide all later ownership. Pin surviving frames and explicit-prefix re-entry separately from lazy retention. |

[Raw observations](ownership-results.json) preserve the original source,
parameters, complete HTML from each reader and the reader partition for every
input. [Reduced examples](ownership-reductions.json) retain one witness per
investigation family. The family labels describe the original inputs, not a
proof that every case in a family has one cause.

## Comparison and reduction limits

The comparison parses HTML with parse5, sorts attributes, collapses whitespace
in ordinary text, and removes whitespace-only children in structural contexts.
It trims ordinary text at block edges and preserves element nesting, paragraph wrappers, attributes, and whitespace
inside code and preformatted elements. Raw HTML remains available for checking
serialization differences. This is a structural comparison for these fixtures,
not a general equivalence test or a direct comparison of parser ASTs. Empty
block slots that leave no DOM structure can be invisible to this projection.
The empty-slot family intentionally includes dropped `=latex` blocks; their
HTML cannot establish the invisible block's owner. The fence family uses
visible `=html` payloads so its raw-block placement remains observable.

The matrix uses ASCII spaces and two container levels. It covers ordinary
continuation, blank lines, comments at two columns, comments followed by blanks,
and text/heading/list/quote/fence followers. Tabs, Unicode columns, deeper stacks,
matched comment fences and `+` attachment need separate cases.

The reducer deletes one character at a time while preserving the layout,
delimiters and nonempty lowercase word runs. It restarts after each accepted
deletion until no single deletion preserves that skeleton and the exact reader
partition. Errors remain fatal. This minimizes word payloads while keeping the
ownership geometry fixed. It does not find globally shortest witnesses or prove
a common cause; interpretation still requires the original case and controls.

## Reproduce

Use Node 24+, PHP 8.2+ with mbstring and a Rust toolchain compatible with the pinned lockfile.
The build fetches public pinned source into ignored `.cache/ownership/`, installs
locked JS dependencies and builds the Rust CLI. Cargo uses `CARGO_TARGET_DIR`
when set, otherwise a shared `cargo-shared/carve-proofs` directory under the
system temporary directory. The build copies the CLI into the evidence cache
and hashes that copy. PHP uses a local PSR-4 loader
for the pinned source, which has no required Composer libraries. Readers run
with their default rendering configuration; each PHP and Rust observation uses
a fresh process. The spec and JS APIs share a process across the matrix.

```sh
npm ci
npm run build:ownership
npm run check:ownership -- --check reports/ownership-results.json
npm run reduce:ownership -- --check reports/ownership-reductions.json
node --test tests/ownership.test.mjs
```

Use `--output <path>` to record observations after reviewing changed pins or
cases. With `--check`, a changed output fails before writing. Builds record
runtime versions and hashes of the Rust binary and generated JS modules;
the runner rejects dirty source checkouts, wrong revisions and modified build
artifacts. CI rebuilds the readers and checks both committed evidence files.
