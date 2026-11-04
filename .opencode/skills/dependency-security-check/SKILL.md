---
name: Dependency Security Check
description: Audit all dependencies for known vulnerabilities and check whether newer, policy-eligible versions are available. Use when asked about dependency security, advisories, outdated packages, or whether an update can be applied under the project's minimumReleaseAge policy.
---

# Dependency Security Check

Run the check from the repository root:

```sh
pnpm check:deps
```

or directly:

```sh
node .opencode/skills/dependency-security-check/scripts/check-dependencies.mjs [--json] [--root <dir>]
```

## What it checks

- The full dependency tree via `pnpm audit` (runtime, dev, and transitive packages).
- Direct dependencies via `pnpm outdated` (current, wanted, latest).
- For every advisory, the earliest patched version at or above the installed version.
- Whether each newer or patched version is eligible under `minimumReleaseAge` from `pnpm-workspace.yaml`.

The output starts with the policy cutoff. `--json` emits the same data as structured JSON.

## Policy rules

- **Default:** respect the release-age policy. Do not install anything published after the cutoff.
- **Critical exception:** a critical advisory that affects this project must be fixed immediately, even if the fix is younger than the cutoff. Bypass the policy for that exact fix version only.
  - Keep the exception narrow: a single `minimumReleaseAgeExclude` entry for `package@version` (pnpm adds this automatically when installing the fix).
  - Do not exclude other versions, other packages, or unrelated updates.
  - Record the advisory and the reason in the commit message.
- **High, medium, low:** follow the cutoff and report the `blocked until` date.

## Workflow

1. Run `pnpm check:deps` from the repository root.
2. Read the policy cutoff and the vulnerabilities list.
3. For every **critical** advisory, determine whether it affects the project:
   - Is the package reachable at runtime (`scope: prod`), or only used by dev tooling?
   - Is the vulnerable API or feature imported or enabled? Search the codebase and configuration.
   - Does the deployed configuration match the advisory's preconditions?
4. If the issue is critical and affects the project, install the earliest patched version immediately, bypassing the cutoff for that fix version only. Re-run the check afterwards.
5. If the issue is critical but not reachable, state why (for example dev-only or feature unused) and treat it as non-critical.
6. For the remaining advisories, recommend eligible updates or report the `blocked until` date.
7. Handle outdated direct dependencies the same way.
8. If `pnpm audit` failed, say the audit could not run instead of reporting a clean result.

## Interpreting results

1. **Vulnerabilities first.** For each advisory:
   - `scope: prod` means the package is reachable from runtime dependencies; `dev` means tooling only.
   - `eligible` means the earliest patched version can be installed now. Recommend `pnpm update <package>` or the appropriate range bump.
   - `blocked until ...` means wait for that date; a normal `pnpm update` will pick it up after the cutoff, unless the critical exception applies.
2. **Then outdated direct dependencies.**
   - `eligible`: the latest version is old enough to install now.
   - `blocked until ...`: wait for that date.
   - `wanted`: the highest version already allowed by the current semver range.
