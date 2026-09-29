# Remaining container tail work

Baseline: `github:markup-carve/carve-js#8fe00fd672e1d9af43fe1f92ca1cc64387412990`.
Candidate: `github:markup-carve/carve-js#06c76fe8a80551b0d0f6f41a5cf56d6eeba62bfb`.
This records the changes in merged [parser PR #2378](https://github.com/markup-carve/carve-js/pull/2378)
and candidate [PR #2379](https://github.com/markup-carve/carve-js/pull/2379).
The immutable candidate snapshot is evaluated separately from the established
comparison reader. The PR branch may advance; these results describe only the
commit pinned above.

| Fixture | Matched lengths at depth 128, baseline → candidate | Candidate matched growth, 64 → 128 | Candidate input exposure growth, 64 → 128 | Suffix lengths at depth 128, baseline → candidate |
|---|---:|---:|---:|---:|
| quotes | 1411 → 1411 | 2.00× | 3.85× | 0 → 0 |
| bullets | 2557 → 2557 | 2.00× | 3.88× | 0 → 0 |
| ordered | 177723 → 5115 | 2.00× | 3.91× | 0 → 0 |
| tasks | 202245 → 6402 | 2.00× | 3.92× | 0 → 0 |
| attributes | 256497 → 12267 | 2.00× | 3.92× | 49152 → 0 |
| lazy-quotes | 18304 → 1667 | 2.00× | 3.75× | 512 → 512 |
| multiline-quotes | 3076 → 3076 | 2.00× | 3.88× | 0 → 0 |
| blank-lists | 1013007 → 8694 | 2.06× | 3.91× | 16640 → 0 |
| comment-lists | 73630 → 8862 | 2.05× | 3.79× | 17152 → 0 |
| indented-lists | 23930 → 7930 | 2.07× | 3.88× | 16640 → 0 |

The fixtures cover ordered and task markers, attached attributes, lazy quotes,
and indented, blank-separated and comment-bearing list continuations. Plain quotes, bullets and multiline quotes are
controls. Each reader must retain the requested nesting, preserve the terminal
payload and produce the same complete AST, including source positions.

The candidate uses prefix recognition for ordered/task markers and attributes.
Lazy quote tracking reuses the terminator check. Literal list dedents carry their
source origins and remaining whitespace widths; transformed lines retain the
fallback checks. Blank restoration reuses the same facts, and comment-block
tracking skips the marker walk when no pair of fences can close. The lazy fixture's four-character continuation still incurs one
suffix comparison per level, so its suffix work grows with depth.

Nine additional candidate observations use 100,000-character payloads under
attributed bullet, ordered and task markers. The parser's seam counter records
only the initial source normalization, with no attributed-tail reconstruction.
These counters cover selected copies, not total allocation. Their charts have a
candidate series only: the baseline does not instrument the same copy sites.

Deterministic counters in separate parses. UTF-16 input, successful match and suffix argument lengths; global forward progress. These are not engine steps or wall times. Complete ASTs and source positions are checked.
Failed non-global scans and non-regex operations are outside the matched-length
counter. Input exposure still grows roughly fourfold when depth doubles: it charges the
whole remaining string even to anchored checks that inspect only a prefix. It
is not a count of characters actually inspected. A separate bound guards
terminator-scan input. The counters cover these
fixtures and do not establish whole-parser complexity.

Reproduce with `npm run check:container-tails`. Raw observations are in
[container-tail-work.json](container-tail-work.json); the evidence site's
"Remaining container tails" dataset exports SVG, PNG, CSV and JSON charts.
