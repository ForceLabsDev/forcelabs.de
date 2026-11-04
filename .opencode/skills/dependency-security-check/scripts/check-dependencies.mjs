#!/usr/bin/env node
/**
 * Dependency security check.
 *
 * - Audits the full dependency tree with `pnpm audit`.
 * - Checks direct dependencies for newer versions and whether they are
 *   eligible under the project's `minimumReleaseAge` policy.
 * - For every advisory, finds the earliest patched version that is eligible
 *   under the same policy.
 *
 * Usage:
 *   node .opencode/skills/dependency-security-check/scripts/check-dependencies.mjs [--json] [--root <dir>]
 */

import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {join, resolve} from "node:path";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const rootArg = args.indexOf("--root");
const root = resolve(rootArg !== -1 ? args[rootArg + 1] : process.cwd());

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch {
        return null;
    }
}

function runPnpmJson(pnpmArgs) {
    const result = spawnSync("pnpm", pnpmArgs, {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
    });

    if (!result.stdout?.trim()) {
        return null;
    }

    try {
        return JSON.parse(result.stdout);
    } catch {
        return null;
    }
}

function readReleaseAgeMinutes() {
    const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
    const match = workspace.match(/^minimumReleaseAge:\s*(\d+)\s*$/m);
    return match ? Number(match[1]) : 0;
}

function parseVersion(version) {
    const [core, pre] = String(version).split("-", 2);
    const parts = core.split(".").map((part) => Number.parseInt(part, 10));
    while (parts.length < 3) {
        parts.push(0);
    }
    return {parts, pre};
}

function compareVersions(a, b) {
    const left = parseVersion(a);
    const right = parseVersion(b);

    for (let i = 0; i < 3; i += 1) {
        if (left.parts[i] !== right.parts[i]) {
            return left.parts[i] - right.parts[i];
        }
    }

    if (left.pre === right.pre) {
        return 0;
    }
    if (!left.pre) {
        return 1;
    }
    if (!right.pre) {
        return -1;
    }
    return left.pre < right.pre ? -1 : 1;
}

function parsePartial(version) {
    const match = String(version).match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$/);
    if (!match) {
        return null;
    }

    const parts = [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
    return {
        parts,
        exact: match[2] !== undefined && match[3] !== undefined,
    };
}

function upperBound(base, caret) {
    const [major, minor, patch] = base.parts;

    if (caret) {
        if (major > 0) {
            return [major + 1, 0, 0];
        }
        if (minor > 0) {
            return [0, minor + 1, 0];
        }
        return [0, 0, patch + 1];
    }

    if (base.exact) {
        return [major, minor + 1, 0];
    }
    return [major + 1, 0, 0];
}

function satisfiesComparator(version, comparator) {
    if (comparator === "*" || comparator === "x") {
        return true;
    }

    const match = comparator.match(/^(>=|<=|>|<|=)?\s*v?(.+)$/);
    if (!match) {
        return false;
    }

    const operator = match[1] ?? "=";
    let target = match[2];

    if (target.startsWith("^") || target.startsWith("~")) {
        const caret = target.startsWith("^");
        target = target.slice(1);
        const base = parsePartial(target);
        if (!base) {
            return false;
        }
        const upper = upperBound(base, caret);
        return (
            compareVersions(version, base.parts.join(".")) >= 0 &&
            compareVersions(version, upper.join(".")) < 0
        );
    }

    const base = parsePartial(target);
    if (!base) {
        return false;
    }

    const comparison = compareVersions(version, base.parts.join("."));
    switch (operator) {
        case ">=":
            return comparison >= 0;
        case ">":
            return comparison > 0;
        case "<=":
            return comparison <= 0;
        case "<":
            return comparison < 0;
        default:
            return base.exact ? comparison === 0 : comparison >= 0;
    }
}

function satisfies(version, range) {
    if (!range || range === "*") {
        return true;
    }

    return range.split("||").some((alternative) =>
        alternative
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .every((comparator) => satisfiesComparator(version, comparator))
    );
}

const packumentCache = new Map();

async function getPackument(name) {
    if (!packumentCache.has(name)) {
        const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
        packumentCache.set(
            name,
            fetch(url, {headers: {accept: "application/json"}})
                .then((response) => (response.ok ? response.json() : null))
                .catch(() => null)
        );
    }
    return packumentCache.get(name);
}

async function mapLimit(items, limit, callback) {
    const results = new Array(items.length);
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const current = index;
            index += 1;
            results[current] = await callback(items[current]);
        }
    }

    await Promise.all(
        Array.from({length: Math.min(limit, items.length)}, () => worker())
    );
    return results;
}

function stableVersions(packument) {
    return Object.entries(packument?.time ?? {})
        .filter(([version]) => version !== "created" && version !== "modified")
        .filter(([version]) => !version.includes("-"))
        .map(([version, published]) => ({version, published, timestamp: Date.parse(published)}))
        .filter((entry) => Number.isFinite(entry.timestamp))
        .sort((a, b) => compareVersions(a.version, b.version));
}

function latestEligibleVersion(packument, cutoff) {
    const versions = stableVersions(packument);
    let eligible = null;

    for (const entry of versions) {
        if (entry.timestamp <= cutoff) {
            eligible = entry;
        }
    }

    return eligible;
}

function earliestPatchedVersion(packument, range, minimumVersion) {
    for (const entry of stableVersions(packument)) {
        if (minimumVersion && compareVersions(entry.version, minimumVersion) < 0) {
            continue;
        }
        if (satisfies(entry.version, range)) {
            return entry;
        }
    }
    return null;
}

function formatDate(timestamp) {
    return new Date(timestamp).toISOString();
}

function classifyPaths(paths, prodRoots) {
    let prod = false;
    for (const path of paths) {
        const rootPackage = path.split(">")[1];
        if (rootPackage && prodRoots.has(rootPackage)) {
            prod = true;
        }
    }
    return prod ? "prod" : "dev";
}

async function main() {
    const pkg = readJson(join(root, "package.json"));
    if (!pkg) {
        throw new Error(`No package.json found in ${root}`);
    }

    const releaseAgeMinutes = readReleaseAgeMinutes();
    const releaseAgeDays = releaseAgeMinutes / (24 * 60);
    const cutoff = Date.now() - releaseAgeMinutes * MS_PER_MINUTE;

    const dependencies = pkg.dependencies ?? {};
    const devDependencies = pkg.devDependencies ?? {};
    const direct = {...dependencies, ...devDependencies};
    const prodRoots = new Set(Object.keys(dependencies));

    const outdatedResult = runPnpmJson(["outdated", "--json"]);
    const outdated = outdatedResult ?? {};
    const auditResult = runPnpmJson(["audit", "--json"]);
    const advisories = Object.values(auditResult?.advisories ?? {});

    const outdatedEntries = Object.entries(outdated).filter(([name]) => name in direct);

    const updateChecks = await mapLimit(outdatedEntries, 6, async ([name, info]) => {
        const packument = await getPackument(name);
        const latest = packument?.["dist-tags"]?.latest ?? info.latest ?? null;
        const latestTime = latest ? packument?.time?.[latest] : null;
        const latestTimestamp = latestTime ? Date.parse(latestTime) : null;
        const eligible = packument ? latestEligibleVersion(packument, cutoff) : null;
        const wantedTime = info.wanted ? packument?.time?.[info.wanted] : null;
        const wantedTimestamp = wantedTime ? Date.parse(wantedTime) : null;

        return {
            name,
            type: info.dependencyType ?? (name in dependencies ? "dependencies" : "devDependencies"),
            current: info.current,
            wanted: info.wanted,
            latest,
            latestPublishedAt: latestTimestamp ? formatDate(latestTimestamp) : null,
            latestEligible: eligible?.version ?? null,
            latestEligiblePublishedAt: eligible?.published ?? null,
            latestBlockedUntil:
                latestTimestamp && latestTimestamp > cutoff
                    ? formatDate(latestTimestamp + releaseAgeMinutes * MS_PER_MINUTE)
                    : null,
            wantedEligible: wantedTimestamp === null ? null : wantedTimestamp <= cutoff,
        };
    });

    const vulnerabilityChecks = await mapLimit(advisories, 6, async (advisory) => {
        const packument = await getPackument(advisory.module_name);
        const installedVersions = [
            ...new Set((advisory.findings ?? []).map((finding) => finding.version)),
        ];
        const minimumInstalled = [...installedVersions].sort(compareVersions)[0] ?? null;
        const patched = packument
            ? earliestPatchedVersion(
                  packument,
                  advisory.patched_versions,
                  minimumInstalled
              )
            : null;
        const patchedTimestamp = patched ? Date.parse(patched.published) : null;
        const paths = (advisory.findings ?? []).flatMap((finding) => finding.paths ?? []);

        return {
            package: advisory.module_name,
            severity: advisory.severity,
            title: advisory.title,
            url: advisory.url,
            vulnerableVersions: advisory.vulnerable_versions,
            patchedVersions: advisory.patched_versions,
            installedVersions,
            earliestPatched: patched?.version ?? null,
            earliestPatchedPublishedAt: patched?.published ?? null,
            earliestPatchedEligible: patchedTimestamp === null ? null : patchedTimestamp <= cutoff,
            earliestPatchedBlockedUntil:
                patchedTimestamp && patchedTimestamp > cutoff
                    ? formatDate(patchedTimestamp + releaseAgeMinutes * MS_PER_MINUTE)
                    : null,
            scope: classifyPaths(paths, prodRoots),
            affectedPaths: paths.length,
        };
    });

    const severityOrder = {critical: 0, high: 1, moderate: 2, low: 3, info: 4};
    vulnerabilityChecks.sort(
        (a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99)
    );

    const report = {
        root,
        generatedAt: formatDate(Date.now()),
        policy: {
            minimumReleaseAgeMinutes: releaseAgeMinutes,
            minimumReleaseAgeDays: releaseAgeDays,
            cutoff: formatDate(cutoff),
        },
        auditFailed: auditResult === null,
        outdatedCheckFailed: outdatedResult === null,
        vulnerabilities: vulnerabilityChecks,
        directDependencies: {
            total: Object.keys(direct).length,
            outdated: updateChecks,
        },
    };

    if (asJson) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    console.log("Dependency security check");
    console.log(`Root:   ${root}`);
    console.log(
        `Policy: minimumReleaseAge = ${releaseAgeMinutes} min (${releaseAgeDays.toFixed(1)} days)`
    );
    console.log(`Cutoff: ${report.policy.cutoff}`);
    if (report.auditFailed) {
        console.log("WARNING: pnpm audit did not return JSON; vulnerability results are incomplete.");
    }
    if (report.outdatedCheckFailed) {
        console.log("WARNING: pnpm outdated did not return JSON; update results are incomplete.");
    }
    console.log("");

    console.log(`Vulnerabilities (${report.vulnerabilities.length})`);
    if (report.vulnerabilities.length === 0) {
        console.log("  none");
    } else {
        for (const item of report.vulnerabilities) {
            const fix = item.earliestPatched
                ? `${item.earliestPatched} (${item.earliestPatchedEligible ? "eligible" : `blocked until ${item.earliestPatchedBlockedUntil}`})`
                : "no patched version found";
            console.log(
                `  ${item.package}  ${item.severity}  installed ${item.installedVersions.join(", ")}  scope ${item.scope}`
            );
            console.log(`    ${item.title}`);
            console.log(`    patched ${item.patchedVersions}; earliest fix ${fix}`);
            console.log(`    ${item.url}`);
        }
    }
    console.log("");

    console.log(
        `Direct dependencies (${report.directDependencies.total}, ${report.directDependencies.outdated.length} outdated)`
    );
    if (report.directDependencies.outdated.length === 0) {
        console.log("  all up to date");
    } else {
        for (const item of report.directDependencies.outdated) {
            let status = "unknown";
            if (item.latest) {
                if (item.latestEligible === item.latest) {
                    status = "eligible";
                } else if (item.latestBlockedUntil) {
                    status = `blocked until ${item.latestBlockedUntil}`;
                } else {
                    status = "blocked";
                }
            }
            console.log(
                `  ${item.name}  ${item.current} -> ${item.latest}  ${status}  (wanted ${item.wanted}, ${item.type})`
            );
        }
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
