#!/bin/bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

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

    if [[ -L "$integration/syncs" || -L "$integration/actions" ]]; then
        echo "Skipping directory $integration because syncs or actions is a symlink"
        continue
    fi

    mkdir -p "$integration/nango-integrations/$integration"

    # Copy everything except the nango-integrations directory
    rsync -av --exclude='nango-integrations' "$integration/" "$integration/nango-integrations/$integration" --quiet

    pushd "$integration/nango-integrations"

    cp "$integration/nango.yaml" .

    sed -i '' "s|${PWD}|$integration|g" nango.yaml

    # Generate nango integration
    npx nango generate
    sed -i '' "s|$integration|\${PWD}|g" nango.yaml

    popd

    # Delete everything except the nango-integrations directory
    find "$integration"/* -maxdepth 0 -name 'nango-integrations' -prune -o -exec rm -rf {} +
done
