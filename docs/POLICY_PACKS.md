# Policy packs and the trust compiler

Users select intent; HodgeForm compiles deterministic obligations.

Standard packs:

- `basic` — artifact integrity, capability inventory, regression evidence.
- `networked` — adds prompt-injection/action-boundary testing for networked agents.
- `code-execution` — adds resource/isolation requirements.
- `action-taking` — adds safeguards for irreversible/external side effects.
- `high-risk` — adds separate independent verification and adversarial falsification.

Capabilities independently add obligations. For example, `filesystem.write` adds destructive-behavior and sandbox-boundary requirements even if the selected base pack is `basic`.

Organization overlays (`HODGEFORM_REQUIRED_POLICY_PACKS`) can add obligations globally. They cannot remove repository obligations. High/critical inferred risk always forces a separate human approver.

The CLI's `auto` setting is only a recommendation layer. Before submission it resolves to an explicit standard pack. The server then compiles and freezes the authoritative policy; client recommendation can never remove server obligations.
