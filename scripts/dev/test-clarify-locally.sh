#!/usr/bin/env bash
# Test Clarify integration templates against a local Nango dev stack.
#
# Prerequisites:
#   - Nango running locally with the clarify provider (feat/providers-clarify branch)
#   - A Clarify connection in dev (default connection id below)
#
# Usage:
#   ./scripts/dev/test-clarify-locally.sh
#   CLARIFY_CONNECTION_ID=<uuid> NANGO_SECRET_KEY_DEV=<key> ./scripts/dev/test-clarify-locally.sh --dryrun
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NANGO_REPO="${NANGO_REPO:-$ROOT/../nango}"
CONNECTION_ID="${CLARIFY_CONNECTION_ID:-7cef7bd8-319f-4631-8759-d2c520814e96}"
INTEGRATION_ID="${CLARIFY_INTEGRATION_ID:-clarify}"
DRYRUN=false

for arg in "$@"; do
    if [[ "$arg" == "--dryrun" ]]; then
        DRYRUN=true
    fi
done

echo "==> Unit tests (mocked proxy)"
cd "$ROOT/integrations"
npm test -- --run clarify/tests/clarify-list-lists.test.ts

if [[ "$DRYRUN" != true ]]; then
    echo ""
    echo "Skipping live dryrun (pass --dryrun to hit local Nango)."
    echo "Set NANGO_SECRET_KEY_DEV and optionally CLARIFY_CONNECTION_ID."
    exit 0
fi

if [[ -z "${NANGO_SECRET_KEY_DEV:-}" ]]; then
    echo "NANGO_SECRET_KEY_DEV is required for --dryrun" >&2
    exit 1
fi

export NANGO_HOSTPORT="${NANGO_HOSTPORT:-http://localhost:3003}"

echo ""
echo "==> Live dryrun: list-lists (connection $CONNECTION_ID)"
cd "$ROOT/integrations"
npx nango dryrun list-lists "$CONNECTION_ID" -e dev --integration-id "$INTEGRATION_ID" --input '{"limit":1}'

echo ""
echo "==> Sync clarify flow into local nango (for dashboard Browse templates)"
if [[ -f "$ROOT/internal/flows.zero.json" && -d "$NANGO_REPO/packages/shared" ]]; then
    node <<'NODE'
const fs = require('fs');
const templatesPath = process.argv[1];
const nangoPath = process.argv[2];
const flows = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
const clarify = flows.find((f) => f.providerConfigKey === 'clarify');
if (!clarify) {
    console.error('No clarify entry in internal/flows.zero.json — run npm run compile:integrations first');
    process.exit(1);
}
const target = `${nangoPath}/packages/shared/flows.zero.json`;
const nangoFlows = JSON.parse(fs.readFileSync(target, 'utf8'));
const idx = nangoFlows.findIndex((f) => f.providerConfigKey === 'clarify');
if (idx >= 0) {
    nangoFlows[idx] = clarify;
} else {
    nangoFlows.push(clarify);
    nangoFlows.sort((a, b) => a.providerConfigKey.localeCompare(b.providerConfigKey));
}
fs.writeFileSync(target, JSON.stringify(nangoFlows, null, 4));
console.log('Updated clarify entry in', target);
NODE
    "$ROOT/internal/flows.zero.json" "$NANGO_REPO"
    echo "Restart the Nango server to pick up flows.zero.json, then deploy templates from the dashboard."
else
    echo "Run npm run compile:integrations and ensure NANGO_REPO points at your nango fork."
fi
