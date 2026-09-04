# HodgeForm 10-minute quickstart

Goal: get a real repository to its first frozen gate without learning a policy language.

## 1. Install and authenticate

Use the HodgeForm deployment URL and create a workspace API token from **Overview → Developer access**. Standard CI tokens can submit candidates/evidence but cannot approve a release. If a requirement needs independent evidence, first register an independent verifier principal and create a verifier-bound token.

```sh
export HODGEFORM_URL=https://hodgeform.example.com
export HODGEFORM_TOKEN=hf_live_...
```

## 2. Create the repository and local intent

```sh
hodgeform repository create my-agent
hodgeform init
```

Open `hodgeform.agent.json` and set only:

```json
{
  "repositorySlug": "my-agent",
  "artifactPath": "./src"
}
```

Leave `policy.pack` as `auto` unless your security team explicitly requires a stronger pack.

## 3. See what authority HodgeForm detects

```sh
hodgeform scan ./src
```

HodgeForm deterministically reports detected capabilities and recommends the least appropriate standard pack. Incomplete scan coverage does not count as evidence that a capability is absent.

## 4. Freeze the candidate

```sh
hodgeform candidate submit
hodgeform gate explain <candidate-id>
```

The CLI hashes the exact artifact tree, scans it, unions detected authority with declared capabilities, resolves `auto` to an explicit policy-pack intent, freezes the candidate on the server, and attaches the artifact-bound capability scan.

From here, CI/verifiers attach the missing evidence. A human performs the release decision in HodgeForm when the frozen obligations are satisfied. CI can then fetch and verify the signed receipt using an independently pinned public key.

```sh
hodgeform receipt fetch <candidate-id> --out receipt.json
hodgeform gate verify receipt.json --public-key hodgeform.pub
```

For normal onboarding, a developer should not need to author formal logic or more than a handful of policy-intent lines. Organization policy overlays remain server-authoritative and can only make the gate stricter.


## Optional: prove the trust boundary locally

```sh
hodgeform demo
hodgeform benchmark
```

The demo exercises the four canonical bypass attempts. The benchmark checks semantic authority-to-obligation compilation and evidence-admissibility rules using frozen local fixtures. Neither is a substitute for your own environment-specific release evidence.
