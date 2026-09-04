# TrustBench 0.1

TrustBench is the reproducible HodgeForm benchmark for the mechanism that ordinary agent eval suites do not measure: **authority-delta -> proof-obligation compilation -> evidence admissibility**.

Run:

```sh
hodgeform benchmark
# or
npm run benchmark:trust
```

The included v0.1 fixtures cover authority changes such as filesystem write, shell execution, payment authority, database writes, outbound email, PHI, secret access, and network access, plus a no-new-authority control case.

The benchmark currently reports two exact-match metrics:

1. **Authority/obligation accuracy** — whether the expected semantic authority delta compiles the expected new requirement IDs and risk class.
2. **Evidence-admissibility accuracy** — whether LLM PASS is non-authoritative, LLM counterexamples can block, same-team evidence cannot satisfy an independent requirement, and qualifying independent deterministic evidence can satisfy it.

The benchmark specification lives at `benchmarks/trustbench-v0.1.json` and is intended to remain public and competitor-adapter friendly.

## What this benchmark does not prove

TrustBench is a HodgeForm-authored product benchmark, not an independent certification and not a claim of universal AI safety. Public comparative claims should use frozen benchmark versions, disclose adapters/configuration, publish raw outputs, and ideally be reproduced by an independent third party.
