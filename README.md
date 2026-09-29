# Carve proofs

Checked models of [Carve](https://github.com/markup-carve/carve) parsing rules,
with tests comparing their predictions against the executable
specification and the pinned JavaScript engine. The Carve repository remains the
authority for language rules.

The layout model covers boundary transitions, column ownership, stored
continuation claims and decoding of measured indentation and quote prefixes.
Its 26 theorems compile without additional assumptions. Seventeen authored
traces agree with the executable specification and pinned JavaScript engine.
The model applies the list-specific rules in §24 C3 where they qualify Part 0.
It remains a partial model, not a verified implementation of the full parser.

## Setup

Use Node 24 or newer, Git, Rocq core 9.2.0 and standard library 9.1.0.

```sh
git clone --recurse-submodules https://github.com/markup-carve/carve-proofs.git
cd carve-proofs
GIT_CONFIG_COUNT=2 \
  GIT_CONFIG_KEY_0=url.https://github.com/.insteadOf \
  GIT_CONFIG_VALUE_0=ssh://git@github.com/ \
  GIT_CONFIG_KEY_1=url.https://github.com/.insteadOf \
  GIT_CONFIG_VALUE_1=git@github.com: npm ci
npm test
npm run proof:layout
```

The Git settings above fetch the public npm Git dependency over HTTPS.

For an existing clone, run `git submodule update --init` first. If Rocq is
installed in an opam switch, use `opam exec -- npm run proof:layout`.
`npm run proof:layout:evidence` runs the JavaScript comparisons without a proof
compiler and explicitly reports that it has not checked the proofs.

## Specification revision

The [spec submodule](spec) pins Carve to the revision used for the comparisons.
The npm manifest and lockfile pin the matching JS engine and parser dependency;
the runner rejects dependency pins that disagree with that specification.
Updating the submodule requires rerunning the proofs and reviewing any changed
trace or discrepancy.

See the [layout model](proofs/layout/README.md) for theorem scope, preconditions,
recorded differences and trust boundaries. CI runs the tests and compiler check
on pull requests and pushes to `main`.

## Language properties and scaling

The [property report](reports/properties.md) records wrapping, container,
reference-locality and append-stability checks against the pinned readers,
plus timing measurements for seven input families. It identifies specified
exceptions to the broad guarantees and records the nesting performance signal.

Run `npm run check:properties` for deterministic comparisons and
`npm run bench:scaling` for timed measurements. `npm test` includes the
comparisons and selected layout-work budgets. These checks do not extend the
scope of the Rocq proofs.

## Reader comparison and nesting profiles

The [three-reader comparison](reports/comparison.md) tests equivalent Carve,
Djot and CommonMark inputs and measures their default JavaScript APIs on the
same machine. Language differences are recorded explicitly. CI checks the
reviewed observations; timing measurements are optional.

The [nesting profile](reports/nesting-profile.md) separates parsing, rendering,
allocation and regex work. It identifies repeated prefix inspection that the
original layout counters miss. Regression ceilings cover its regex-mediated portion without
claiming a linear parser bound.

Run `npm run check:comparison`, `npm run bench:comparison` and
`npm run profile:nesting` to collect evidence. Regenerate the reports with
`npm run report:comparison` and `npm run report:profiling`.

## djot.v extraction

The [djot.v report](reports/djot-v.md) checks the pinned OCaml package against
the shared fixtures, separates raw parsing from document processing, and
records streaming composition and native timing measurements. It also records
eight theorem assumption checks and the extraction diff under our toolchain.

Run `npm run build:djot-v` with OCaml 4.14.2 and Dune 3.23.1 available through
opam, then `npm run check:djot-v -- --check reports/djot-v-results.json`.
`DJOT_V_OPAM_SWITCH` selects an optional opam switch. The build downloads the
pinned public source into ignored `.cache/`. `npm run bench:djot-v` records
timings. `npm run proof:djot-v` requires Rocq 9.2 and stdlib 9.1, builds the
upstream project, prints theorem assumptions and checks extraction consistency.
The proof command exits nonzero when extraction differs; inspect the recorded
diff before drawing conclusions about the packaged code.

The [extension fixtures](tests/djot-extensions/README.md) demonstrate one syntax
tradeoff: enabling list interruption permits sublists without blank lines, but
can turn a hard wrap into a new list. Portable JSON expectations, a native
runner and eight Rocq witnesses make the example reproducible. Run
`npm run check:djot-extensions` and `npm run proof:djot-extensions` after building
the pinned package.

The [differential report](reports/djot-differential.md) compares 4,177 inputs
against pinned current djot.js, its npm release and djot.v. It includes a
footnote conformance bug, an unresolved-image rendering candidate, controls
and a portable upstream test fixture. Run `npm run build:djot-differential`
and `npm run check:djot-differential` after building the native package.

## Four-reader ownership matrix

The [ownership report](reports/ownership.md) compares 472 inputs across pinned
versions of the executable specification, JavaScript, PHP and Rust. It records
43 structural disagreements, reduced examples and proposed specification
decisions for nested ownership. Run `npm run build:ownership`, then
`npm run check:ownership -- --check reports/ownership-results.json`.
The matrix uses separate pins and does not extend the layout proofs.
