#!/bin/bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

if [[ "$(uname)" == "Darwin" ]]; then
    # macOS
    SED_CMD="sed -i ''"
else
    # Linux or others
    SED_CMD="sed -i"
fi

# Check if npm_config_integration is set
if [ -n "$npm_config_integration" ]; then
    integrations=("$npm_config_integration/")
else
    cd integrations
    integrations=(*/)
    cd ..
fi

cd integrations

for d in "${integrations[@]}" ; do
    integration=$(echo $d | sed 's/\///g')

    # Check if the integration directory exists (in case of single integration)
    if [ ! -d "$integration" ]; then
        echo "Integration directory $integration does not exist. Skipping..."
        continue
    fi

    if [[ -L "$integration/syncs" ]] || [[ -L "$integration/actions" ]]; then
        echo "Skipping directory $integration because syncs or actions is a symlink"
        continue
    fi

    mkdir -p "$integration/nango-integrations/$integration"

    # Copy everything except the nango-integrations directory
    rsync -av --exclude='nango-integrations' "$integration/" "$integration/nango-integrations/$integration" --quiet

    pushd "$integration/nango-integrations"

    # Since we've moved to inline configuration, we no longer need to copy nango.yaml
    # Instead, we need to ensure the index.ts file is properly set up
    if [ -f "$integration/index.ts" ]; then
        cp "$integration/index.ts" .
        echo "Copied index.ts for $integration"
    else
        echo "Warning: No index.ts found for $integration"
    fi

    # Generate nango integration (this may need to be updated for the new approach)
    npx nango generate

    popd

    # Delete everything except the nango-integrations directory
    find "$integration"/* -maxdepth 0 -name 'nango-integrations' -prune -o -exec rm -rf {} +
done

echo "⚠️  This script has been updated for the new inline configuration approach."
echo "The old nango.yaml approach has been replaced with inline TypeScript configuration."
