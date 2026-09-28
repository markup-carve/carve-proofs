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
