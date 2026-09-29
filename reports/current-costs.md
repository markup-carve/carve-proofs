# Current reader cost investigation

Recorded at 2026-09-29T14:11:46.518Z, using Carve JS `7b6e57b69dced437822647682838688100ca65c6` and the
Djot/CommonMark package versions in the [raw observations](current-costs.json).
The [cross-reader timing report](comparison.md) and this longer-sample run are
separate experiments. Their absolute timings must not be spliced together.

## Position options, phases and allocation

Wall cells show round 1 / round 2 median (minimum–maximum), not confidence
intervals. CPU cells also keep the rounds separate and show process
CPU time, including worker threads. Allocation is sampled churn per operation,
including collected objects; it is neither retained heap nor peak RSS. Timing
medians retain each fresh worker's seven batches; pooling would hide the large
drift between rounds. CPU profiles and allocation combine both rounds and divide
by their total operation counts. These timings do not support speed rankings.

| Fixture | Phase | Variant | Wall ms, round 1 / 2 median (min–max) | CPU ms, round 1 / 2 median | Sampled allocation KiB/op |
|---|---|---|---:|---:|---:|
| long-line | parse | carve | 0.630 (0.584–0.645) / 0.627 (0.589–0.663) | 0.737 / 0.739 | 10.0 |
| long-line | parse | carve-no-positions | 0.547 (0.522–0.573) / 0.522 (0.467–0.540) | 0.637 / 0.613 | 12.7 |
| long-line | parse | djot | 0.119 (0.115–0.122) / 0.132 (0.128–0.147) | 0.130 / 0.145 | 14.5 |
| long-line | parse | djot-positions | 0.209 (0.192–0.262) / 0.197 (0.188–0.200) | 0.277 / 0.248 | 18.5 |
| long-line | parse | commonmark | 0.030 (0.028–0.031) / 0.030 (0.029–0.032) | 0.030 / 0.030 | 42.0 |
| long-line | html | carve | 1.738 (1.672–1.933) / 1.649 (1.608–1.844) | 2.024 / 1.852 | 1325.7 |
| long-line | html | djot | 0.133 (0.127–0.161) / 0.133 (0.127–0.151) | 0.151 / 0.146 | 17.0 |
| long-line | html | commonmark | 0.031 (0.030–0.035) / 0.031 (0.030–0.035) | 0.032 / 0.032 | 42.4 |
| unclosed-code | parse | carve | 0.399 (0.381–0.411) / 0.413 (0.402–0.438) | 0.431 / 0.439 | 9.9 |
| unclosed-code | parse | carve-no-positions | 0.363 (0.350–0.387) / 0.395 (0.362–0.412) | 0.409 / 0.440 | 12.4 |
| unclosed-code | parse | djot | 0.116 (0.113–0.131) / 0.129 (0.121–0.133) | 0.130 / 0.143 | 18.5 |
| unclosed-code | parse | djot-positions | 0.217 (0.216–0.224) / 0.226 (0.209–0.308) | 0.289 / 0.302 | 19.7 |
| unclosed-code | parse | commonmark | 0.058 (0.053–0.060) / 0.058 (0.056–0.062) | 0.062 / 0.061 | 42.4 |
| unclosed-code | html | carve | 1.915 (1.784–1.946) / 1.917 (1.833–2.264) | 2.023 / 2.054 | 1317.5 |
| unclosed-code | html | djot | 0.124 (0.115–0.149) / 0.125 (0.119–0.134) | 0.136 / 0.141 | 19.0 |
| unclosed-code | html | commonmark | 0.093 (0.071–0.158) / 0.061 (0.056–0.066) | 0.105 / 0.066 | 42.6 |
| many-paragraphs | parse | carve | 7.372 (5.553–8.591) / 17.542 (8.914–24.389) | 12.736 / 24.308 | 4801.8 |
| many-paragraphs | parse | carve-no-positions | 9.361 (7.915–10.569) / 21.387 (16.090–24.345) | 14.880 / 26.292 | 5769.5 |
| many-paragraphs | parse | djot | 3.479 (2.610–4.655) / 6.285 (4.542–6.964) | 5.707 / 10.041 | 2581.9 |
| many-paragraphs | parse | djot-positions | 4.621 (2.978–8.109) / 9.570 (6.565–11.939) | 7.032 / 12.936 | 3201.6 |
| many-paragraphs | parse | commonmark | 0.630 (0.549–0.727) / 0.679 (0.520–0.911) | 0.686 / 0.696 | 1331.2 |
| many-paragraphs | html | carve | 9.476 (6.448–13.641) / 6.256 (2.263–7.291) | 5.978 / 5.240 | 1432.4 |
| many-paragraphs | html | djot | 22.158 (14.071–40.623) / 22.972 (13.768–39.609) | 12.400 / 12.656 | 2810.6 |
| many-paragraphs | html | commonmark | 2.556 (1.225–4.093) / 2.873 (1.537–4.982) | 1.307 / 1.371 | 1662.6 |
| nested-quotes | parse | carve | 1.799 (1.135–3.408) / 2.380 (1.594–3.723) | 1.948 / 2.319 | 1389.3 |
| nested-quotes | parse | carve-no-positions | 3.891 (1.781–5.134) / 4.450 (3.406–6.098) | 2.760 / 2.960 | 1472.9 |
| nested-quotes | parse | djot | 1.993 (0.455–3.405) / 1.314 (0.333–1.667) | 0.843 / 0.614 | 280.3 |
| nested-quotes | parse | djot-positions | 1.297 (0.495–2.485) / 1.780 (0.293–2.331) | 0.601 / 1.192 | 337.7 |
| nested-quotes | parse | commonmark | 0.218 (0.118–0.242) / 0.218 (0.142–0.260) | 0.075 / 0.072 | 127.3 |
| nested-quotes | html | carve | 3.415 (3.276–5.859) / 5.338 (4.358–6.624) | 3.265 / 4.051 | 1862.7 |
| nested-quotes | html | djot | 0.907 (0.430–1.771) / 0.836 (0.450–1.633) | 0.907 / 0.930 | 347.6 |
| nested-quotes | html | commonmark | 0.154 (0.103–0.241) / 0.146 (0.107–0.204) | 0.113 / 0.109 | 178.6 |
| nested-lists | parse | carve | 7.262 (6.537–12.680) / 10.303 (4.846–12.942) | 7.097 / 6.203 | 2767.2 |
| nested-lists | parse | carve-no-positions | 3.510 (3.298–3.846) / 1.682 (1.338–4.084) | 4.815 / 2.809 | 3002.2 |
| nested-lists | parse | djot | 1.369 (1.254–2.374) / 0.787 (0.649–0.910) | 2.522 / 1.486 | 890.6 |
| nested-lists | parse | djot-positions | 0.966 (0.706–1.287) / 0.928 (0.817–1.583) | 1.749 / 1.657 | 1010.3 |
| nested-lists | parse | commonmark | 0.336 (0.306–0.373) / 0.304 (0.290–0.343) | 0.342 / 0.313 | 308.1 |
| nested-lists | html | carve | 9.053 (7.181–14.863) / 2.195 (1.623–3.608) | 7.284 / 3.412 | 3605.8 |
| nested-lists | html | djot | 1.173 (0.853–3.309) / 0.697 (0.651–0.840) | 2.009 / 1.370 | 1009.3 |
| nested-lists | html | commonmark | 0.333 (0.305–0.349) / 0.340 (0.327–0.368) | 0.340 / 0.344 | 419.0 |

Carve's [positions option](https://github.com/markup-carve/carve-js/blob/7b6e57b69dced437822647682838688100ca65c6/src/source-positions.ts) removes fields from the
finished tree. It still constructs positions during parsing and skips the final
codepoint conversion when disabled. Treat it as an output-shape option, not a
switch that removes all positioning work. Djot's sourcePositions option enables
its position tracking. These variants expose costs; their position formats and
feature sets are not identical.

The [HTML entrypoint](https://github.com/markup-carve/carve-js/blob/7b6e57b69dced437822647682838688100ca65c6/src/index.ts) tries a direct HTML path before building
an AST. Untimed probes record which path accepts each fixture and check direct
output against the public HTML entrypoint: direct: long-line, many-paragraphs; ast: unclosed-code, nested-quotes, nested-lists. An AST fallback still
pays for the rejected direct-path attempt. The unclosed-code HTML profile
attributes substantial sampled work to that eligibility scan; choosing the AST
path does not mean that the fast-path code did no work.
The phases must not be added or interpreted as a single pipeline breakdown.

## Sampled hotspots

Self time per operation below comes from separate CPU profiles, divided by the
number of calls in those profile windows, not from the timing batches. Runtime
and profiler frames are omitted from the CPU shortlist. Heap frames include
runtime allocation sites. Full frame locations remain in the JSON; line numbers
refer to installed JavaScript, not the linked TypeScript.

| Fixture | Phase | Largest Carve CPU frames, sampled self ms/op | Largest allocation frames |
|---|---|---|---|
| long-line | parse | `scanInlineInner` 0.161 ms/op; `dropTrailingWhitespace` 0.057 ms/op; `toCodepointPositions` 0.051 ms/op | `Map` 1.4 KiB/op; `collectLinkDefs` 1.2 KiB/op; `push` 0.9 KiB/op |
| long-line | html | `renderInline` 1.136 ms/op; `renderBlocks` 0.198 ms/op; `inlineComplex` 0.157 ms/op | `renderInline` 1100.9 KiB/op; `inlineComplex` 182.3 KiB/op; `join` 40.0 KiB/op |
| unclosed-code | parse | `newlineIndices` 0.094 ms/op; `verbatimSpanEnd` 0.086 ms/op; `trimUnclosedRun` 0.055 ms/op | `Map` 1.6 KiB/op; `Set` 1.0 KiB/op; `collectLinkDefs` 0.9 KiB/op |
| unclosed-code | html | `inlineComplex` 1.070 ms/op; `renderInline` 0.167 ms/op; `verbatimSpanEnd` 0.097 ms/op | `inlineComplex` 1288.0 KiB/op; `Map` 4.5 KiB/op; `smartToken` 3.6 KiB/op |
| many-paragraphs | parse | `collectLinkDefs` 1.810 ms/op; `parseParagraph` 0.406 ms/op; `parseBlockInner` 0.404 ms/op | `collectLinkDefs` 1655.6 KiB/op; `parseParagraph` 837.4 KiB/op; `scanInlineInner` 472.0 KiB/op |
| many-paragraphs | html | `renderInline` 0.860 ms/op; `renderBlocks` 0.780 ms/op; `blockish` 0.367 ms/op | `renderBlocks` 532.3 KiB/op; `renderInline` 297.2 KiB/op; `push` 123.5 KiB/op |
| nested-quotes | parse | `parseBlockInner` 0.203 ms/op; `Lexer` 0.138 ms/op; `parseBlockQuote` 0.122 ms/op | `Map` 349.1 KiB/op; `Set` 171.3 KiB/op; `parseBlockQuote` 169.3 KiB/op |
| nested-quotes | html | `parseBlockInner` 0.270 ms/op; `parseBlockQuote` 0.149 ms/op; `Lexer` 0.135 ms/op | `Map` 356.3 KiB/op; `parseBlockQuote` 172.9 KiB/op; `Set` 171.7 KiB/op |
| nested-lists | parse | `parseList` 1.583 ms/op; `parseBlockInner` 0.594 ms/op; `attachBlockPos` 0.439 ms/op | `Map` 561.2 KiB/op; `parseList` 545.0 KiB/op; `Set` 373.4 KiB/op |
| nested-lists | html | `parseList` 0.489 ms/op; `parseBlockInner` 0.125 ms/op; `visit` 0.119 ms/op | `Map` 555.4 KiB/op; `parseList` 547.6 KiB/op; `Set` 368.0 KiB/op |

## Next implementation work

1. Remove per-character suffix slices from the direct HTML eligibility scan
   and inspect its delimiter scan, including rejected attempts before AST
   fallback. Use the per-operation CPU and allocation
   frames above to select the next target. Inspect newline indexing, trailing
   whitespace handling, codepoint detection and the direct HTML text path.
   Preserve exact Unicode offsets and authored code bytes in regression checks.
2. Reduce definition-prepass work and per-line allocations on documents without
   definitions. First check which state the prepass supplies to later parsing;
   bypassing it based only on a missing marker could change ownership.
3. Allocate container maps, sets and buffers only when their features need them.
   The nesting fixes removed selected repeated scans, but each level still builds
   lexer and list state. Preserve independent mutable state between containers.

The profiles identify candidates for changes, not measured speedups from changes
that have not been implemented. No parser performance fix is claimed by this refresh.
The ownership refresh is tracked separately in
[PR #6](https://github.com/markup-carve/carve-proofs/pull/6). Ownership and
performance snapshots use separate reader pins.

## Method and limits

Two fresh-worker rounds per fixture and phase, with reversed variant order in the second round. Parse and full HTML measured separately at the largest existing fixture per family. 500ms warmup, seven batches of at least 100ms with GC before each; separate 500ms CPU profile and 50-call heap sample at 4096 bytes, including collected objects. Position variants preserve the same reader tree after removing positions. Shared host; samples are not performance thresholds.

Host load averaged 17.78, 27.44, 21.72 at the start and
23.8, 25.58, 22.02 at the end on 16
logical CPUs. This was not an idle-host run. Scheduling, JIT state and GC can
change ratios, even with reversed variant order. Overlapping sample ranges do
not establish an ordering. Confirm improvements with controlled paired runs before setting
budgets. Position-variant trees are checked against their default reader after
removing position fields, outside the measured operations.

Reproduce with `npm run profile:costs` and `npm run report:costs`.
The site's "Current costs and positions" dataset provides charts and exact exports.
