# djot.v: executable checks and theorem scope

Tested [djot.v 3279f36](https://github.com/hon-gyu/djot.v/tree/3279f362fbbcc6d33c3a2795252f903ab0a7288f), using the packaged OCaml code with its default Djot profile and positions disabled. OCaml 4.14.2; Dune 3.23.1.

## Behavior

These are 140 observations through each of two views of the same parser, not 280 independent inputs. The shared projection folds soft breaks into spaces, removes reference definitions and flattens sections. It retains heading attributes and code bytes. Unsupported nodes fail the adapter.

| Check | Raw block parser | Document API |
|---|---:|---:|
| Wrapping unchanged | 32/35 | 32/35 |
| Container payload unchanged | 40/40 | 36/40 |
| Reference syntax unchanged | 12/12 | 12/12 |
| HTML changes after definition | n/a | 4/12 |
| Finished prefix unchanged after append | 35/36 | 35/36 |

The HTML resolution checks and five dialect probes always use the document API; their duplicate records across views are not independent raw-parser checks. All observations completed without adapter errors. The three wrapping differences involve code-span bytes. Reference resolution deliberately changes four HTML outputs while syntax classification stays local.

All four document-level container differences involve headings: for `# Heading\n\ntail\n`, the automatic ID belongs to a top-level section; inside a quote or list it belongs to the heading. The shared projection drops the section wrapper but keeps the heading ID. Raw parsing passes all 40 cases. This is a stage and projection distinction, not a counterexample to raw container uniformity. See the exact trees in [the observations](djot-v-results.json).

All 36 streaming checks pass both composition and preservation of committed blocks under the adapter projection. They split prefix and suffix into lines, call `run_lines` on the prefix, then resume with its state. For the list/list fixture, finishing the prefix produces one list but `run_lines` has committed zero blocks. The finished list can grow and change tightness when another item arrives. This explains the one append difference without contradicting committed-block stability.

## Formal checks and extraction boundary

The upstream Rocq project builds with Rocq 9.2 and stdlib 9.1. Each of these eight theorems prints `Closed under the global context`:

- `hard_wrap_one_para`
- `hard_wrap_para_then_rest`
- `quote_uniformity`
- `list_uniformity`
- `prefix_determinism`
- `no_future_line_dependence`
- `classify_inlines_locality`
- `iscan_str_no_reread`

The [compiler transcript](djot-v-proofs.json) records the full signatures. Hard wrapping requires the configuration and line conditions in the theorem; it preserves a paragraph's structure, not arbitrary inline bytes. Quote uniformity has a header condition. List uniformity requires valid markers and items in the canonical layout. Prefix stability concerns emitted blocks, not an EOF-finished tree. Inline locality concerns classification before reference resolution.

Fresh extraction differs from the packaged kernel under this toolchain. The [complete extraction diff](djot-v-extraction.diff) records the discrepancy; the upstream `ocaml-pkg-check-current` command also failed (its status and output are in the proof evidence). The diff includes generated BinNat and FMapAVL modules. Fresh files have trailing whitespace removed, matching the upstream consistency command. This run does not establish why they differ or semantic inequivalence. The behavioral and timing results use the pinned packaged kernel. The theorem checks cover Rocq definitions; extraction overrides, the public API and runtime complexity are outside these checks.

## Native measurements

Packaged OCaml default profile, positions off. Serial processes per size; startup and input transfer excluded. 200ms warmup, five batches of at least 20ms with 16-call time checks. Full major GC before each batch. Allocation is Gc.allocated_bytes per call. 60s worker deadline.

Host: AMD Ryzen 9 PRO 7940HS w/ Radeon 780M Graphics, linux/x64. The parse phase calls `Doc.of_string` and includes document processing. Render calls `Html.of_doc` on an already parsed document; html combines both. Five batches per point; medians below use process CPU time. Host load and all wall/CPU/allocation samples are in [the raw measurements](djot-v-timings.json). All seven families completed parse, render and combined-HTML measurements. These runs do not support a cross-runtime speed ranking against earlier JavaScript runs.

| Family | Phase | Size range | CPU ms, first → last | Allocation bytes, first → last |
|---|---|---:|---:|---:|
| long-line | parse | 1024 → 8192 | 0.2824 → 3.0412 | 95202 → 740330 |
| long-line | render | 1024 → 8192 | 0.1108 → 1.0424 | 16274 → 123802 |
| long-line | html | 1024 → 8192 | 0.4587 → 5.0728 | 111482 → 864122 |
| unmatched-brackets | parse | 16 → 1024 | 0.0214 → 1.4989 | 12072 → 1089634 |
| unmatched-brackets | render | 16 → 1024 | 0.0016 → 0.0241 | 960 → 3984 |
| unmatched-brackets | html | 16 → 1024 | 0.0231 → 1.4201 | 13032 → 1093618 |
| unmatched-closers | parse | 1024 → 8192 | 0.6946 → 5.3869 | 157810 → 1240178 |
| unmatched-closers | render | 1024 → 8192 | 0.0270 → 0.2296 | 3985 → 25490 |
| unmatched-closers | html | 1024 → 8192 | 0.8283 → 7.8296 | 161794 → 1265666 |
| unclosed-code | parse | 1024 → 8192 | 3.4784 → 39.3411 | 930530 → 7417570 |
| unclosed-code | render | 1024 → 8192 | 0.1250 → 0.7934 | 16547 → 124069 |
| unclosed-code | html | 1024 → 8192 | 4.2369 → 35.3967 | 947074 → 7541634 |
| many-paragraphs | parse | 128 → 1024 | 0.7953 → 5.5976 | 434506 → 3473738 |
| many-paragraphs | render | 128 → 1024 | 0.2150 → 1.8180 | 114994 → 919602 |
| many-paragraphs | html | 128 → 1024 | 0.6860 → 10.4184 | 549490 → 4393330 |
| nested-quotes | parse | 8 → 192 | 0.0117 → 0.2127 | 11552 → 277994 |
| nested-quotes | render | 8 → 192 | 0.0086 → 0.1666 | 5545 → 112085 |
| nested-quotes | html | 8 → 192 | 0.0196 → 0.4704 | 17096 → 390074 |
| nested-lists | parse | 8 → 192 | 0.0234 → 0.7993 | 21520 → 729189 |
| nested-lists | render | 8 → 192 | 0.0159 → 0.3660 | 7760 → 166370 |
| nested-lists | html | 8 → 192 | 0.0343 → 1.2694 | 29281 → 895562 |

Sizes mean repeated words, delimiters, paragraphs or nesting depth as defined in [the fixtures](../scripts/properties/scaling-cases.mjs). All 12 nested fixtures were checked to produce their requested AST depth, up to 192.

For nested-quotes, depth 64 → 128 gives 2.25× parse CPU and 2.17× allocation.

For nested-lists, depth 64 → 128 gives 2.68× parse CPU and 2.35× allocation.

These finite ranges do not establish an asymptotic bound. They provide regression fixtures and support measuring depth separately from document length.

## Reproduce

Run from the repository root after `npm ci`, with the OCaml/Dune and Rocq versions above available through opam:

```sh
npm run build:djot-v
npm run check:djot-v -- --check reports/djot-v-results.json --output reports/djot-v-results.json
npm run bench:djot-v
npm run proof:djot-v
npm run report:djot-v
```

The proof command records its evidence and exits nonzero on extraction mismatch. CI rebuilds the packaged runtime and checks deterministic observations. Timing and the full upstream proof/extraction check are recorded local runs, not CI gates.
