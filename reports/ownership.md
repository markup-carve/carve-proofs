# Four-reader ownership matrix

The matrix records 472 inputs against independently pinned Carve readers. There
are 55 structural HTML disagreements and 417 agreements. Every input completes
in all four readers. The disagreements fall into twelve investigation families;
these counts do not establish twelve independent bugs.

| Family | Inputs | Disagreements |
|---|---:|---:|
| Footnote/list fences, columns 2 through 8 | 42 | 12 |
| Empty and visible blocks in lists and quoted lists | 30 | 0 |
| Boundary, indentation and follower combinations | 400 | 43 |

[Reader pins](../scripts/ownership/pins.json) identify the exact source revisions.
The executable specification is a derived checker, not the language authority.
These pins are independent of the older specification submodule and layout
proofs. This experiment adds no Rocq theorem.

## Issue seeds

[Carve #2598](https://github.com/markup-carve/carve/issues/2598) reproduces:
following a quote on a footnote definition line, JS treats a fence at columns
3 through 8 as inline code. The specification, PHP and Rust produce a code
block. Visible raw HTML fences give the corresponding split. Column 2 agrees, as do both
control hosts: a footnote starting with prose and a list starting with a quote.

The current rule already gives a basis for resolving this family:
[CARVE-P0-004](https://github.com/markup-carve/carve/blob/c48e4778f972e42495132adf76b9e371d7d4365a/resources/spec/01-layout.ebnf)
says a recognized opener beyond the minimum content column establishes its
own block base, and explicitly includes footnote bodies. Recommended decision:
pin the block interpretation with the quote/prose controls, then correct JS.
A preceding quote should not change this rule.

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

The principal clauses are [Part 0 owner selection and block bases](https://github.com/markup-carve/carve/blob/c48e4778f972e42495132adf76b9e371d7d4365a/resources/spec/01-layout.ebnf),
[§10 paragraph interruption](https://github.com/markup-carve/carve/blob/c48e4778f972e42495132adf76b9e371d7d4365a/resources/spec/14-semantics-blocks.ebnf),
and [§24 C3 list ownership](https://github.com/markup-carve/carve/blob/c48e4778f972e42495132adf76b9e371d7d4365a/resources/spec/16-semantics-comments-security.ebnf).

| Investigation family | Cases | Observation | Recommended decision or missing specification fixture |
|---|---:|---|---|
| `footnote-fence-base` | 12 | JS alone produces inline code. | Apply P0-004's authored block base, as above. |
| `opener-after-content-comment` | 9 | JS/PHP recognize a block; spec/Rust retain marker text. | Apply P0-004 after paragraph closure too. Pin heading, quote and matched fence at a column beyond the item's minimum. |
| `marker-below-content` | 4 | Spec retains marker text; engines open a sublist. | C3 requires a child to reach the content column. Reject below-column child creation; explicitly settle retained text versus reclassification in the surviving context after the comment. |
| `quote-lazy-interruption` | 3 | Rust opens a block outside the quote; others retain quoted text. | Pin the coordinate system in which interruption eligibility is tested before a missing quote prefix is supplied by a claim. Preserve this as an open selection question until that fixture is normative. |
| `quote-comment-opener` | 3 | Rust retains opener text; others recognize a block in the outer item. | Close the quote paragraph at the comment and apply P0-004 in the surviving item. Pin the enclosing stack explicitly. |
| `nested-lazy-code` | 2 | PHP moves code payload outside the nested lists. | A below-column line admitted as lazy text must remain in its paragraph's container (C3). Pin the full multiline code span and its payload owner. |
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
locked JS dependencies and builds the Rust CLI. PHP uses a local PSR-4 loader
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
