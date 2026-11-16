---
title: Security you can inspect
description: Verify who published an image. Inspect its build inputs, dependency versions, license evidence, and vulnerability matches.
---

Security starts with evidence. Every extension page links to the exact published image digest and the platform-specific SBOMs available for it. The website retrieves these records from GHCR and checks their content digests. **This checks content integrity, not publisher authenticity.** Verify the publisher yourself with Cosign before relying on an image.

## Verify the publisher

Install [Cosign](https://docs.sigstore.dev/cosign/system_config/installation/), [Docker Buildx](https://docs.docker.com/build/install-buildx/), [jq](https://jqlang.org/), [Grype](https://github.com/anchore/grype), and optionally [Grant](https://github.com/anchore/grant). You do not need the extension build toolchain.

Copy a digest-pinned image reference from its extension page. Select the exact workflow identity for its publisher and build type:

| Publisher / build | Workflow identity |
| --- | --- |
| CNPG Extensions / Debian | `https://github.com/cnpg-extensions/postgres-extensions-containers/.github/workflows/bake_targets.yml@refs/heads/main` |
| CNPG Extensions / PGRX or Universe | `https://github.com/cnpg-extensions/postgres-extensions-containers/.github/workflows/source-build-targets.yml@refs/heads/main` |

Upstream CloudNativePG images have their own publisher identity; follow [their verification instructions](https://github.com/cloudnative-pg/postgres-extensions-containers). Do not apply the CNPG Extensions identity to another publisher.

```sh
IMAGE='ghcr.io/cnpg-extensions/EXTENSION@sha256:DIGEST'
IDENTITY='https://github.com/cnpg-extensions/postgres-extensions-containers/.github/workflows/bake_targets.yml@refs/heads/main'

cosign verify "$IMAGE" \
  --certificate-identity="$IDENTITY" \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com' \
  --new-bundle-format=false
```

Replace the placeholders and check for a successful verification. The legacy bundle option matches this project's current signing format. A valid index signature binds the platform manifests and their attached SBOM and BuildKit provenance.

## Inspect build provenance

```sh
docker buildx imagetools inspect "$IMAGE" \
  --format '{{ json (index .Provenance "linux/amd64").SLSA }}' \
  > provenance.json

jq . provenance.json
```

Review the recorded source revision, build inputs, and parameters. Inspecting provenance alone is not signature verification. Use `linux/arm64` to inspect ARM64 evidence. For a single-platform index, confirm its platform and use `.Provenance.SLSA` instead.

## Extract the package inventory

```sh
docker buildx imagetools inspect "$IMAGE" \
  --format '{{ json (index .SBOM "linux/amd64").SPDX }}' \
  > image.spdx.json

jq -r '.packages[] | [.name, .versionInfo] | @tsv' image.spdx.json
```

For a single-platform index, use `.SBOM.SPDX`. Inspect both architectures if you deploy both. The extension SBOM covers shipped extension files and dependencies; **inspect and scan the PostgreSQL base image separately**.

{{< evidence-example >}}

## Licenses {#licenses}

List all package license expressions, or inspect one package by its exact SBOM name:

```sh
jq -r '.packages[] |
  [.name, .versionInfo, .licenseDeclared, .licenseConcluded] |
  @tsv' image.spdx.json

PACKAGE='postgresql-18-cron'
jq --arg name "$PACKAGE" '.packages[] |
  select(.name == $name) |
  {name, versionInfo, licenseDeclared, licenseConcluded,
   licenseInfoFromFiles}' image.spdx.json
```

The generated example above shows output from an actual published SBOM. The extension pages expose the same fields for every package, plus any extracted license texts. A recipe's top-level license is not a substitute for the complete container inventory.

`NOASSERTION` means the document makes no assertion. `LicenseRef-…` can refer to custom or unclassified terms. Preserve `AND` and `OR` expressions when assessing obligations; do not treat them as interchangeable. With Grant:

```sh
grant list image.spdx.json
grant list image.spdx.json MIT
```

For original notice text and checksum-based entries, follow the [SBOM guide's notice retrieval instructions](https://github.com/cnpg-extensions/cnpg-sbom-generator#retrieve-an-original-notice).

## Vulnerability findings {#vulnerabilities}

```sh
grype db update
grype sbom:image.spdx.json -o table
grype sbom:image.spdx.json -o json > vulnerabilities.json
```

The website's nightly build updates Grype's vulnerability database and scans each available platform-specific SPDX inventory. Grype matches package identities and versions against its aggregated advisory data, including distribution and language ecosystem sources. Results include the advisory, package, severity, and recorded fix version. Follow the linked advisory for context.

No severity or “won't fix” filters are applied to website reports. A match is not proof that an issue is exploitable in your workload. Zero matches are not a guarantee of safety. A failed or unavailable scan is labeled explicitly, never reported as zero vulnerabilities. Each report includes its scan timestamp, scanner version, database metadata, architecture, and image digest.

The results are refreshed when the site builds, not queried live in your browser. Check the displayed timestamps: a delayed or failed nightly build leaves the previous site's dated evidence in place.

## Rapid updates, on your schedule {#updates}

Catalog refreshes run daily and after successful extension builds. Eligible dependency updates are automated after required checks pass; major updates and cases requiring SQL-version review remain manual. [Read the current update policy](https://github.com/cnpg-extensions/postgres-extensions-containers#automated-dependency-updates).

Your CronJob initiates catalog updates at the start of your maintenance window. It does not impose a rollout end time. Catalog-referencing clusters adopt changed image references; SQL extension upgrades can still need an explicit version change or `ALTER EXTENSION … UPDATE`. [Set up monitoring before scheduling updates](../getting-started/).

## Sources and scope

This guide follows the project's [SBOM and authenticity documentation](https://github.com/cnpg-extensions/postgres-extensions-containers#sboms-and-authenticity) and the [shared SBOM generator guide](https://github.com/cnpg-extensions/cnpg-sbom-generator#inspect-an-image). Those documents remain authoritative for publisher-specific details.
