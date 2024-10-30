#!/bin/bash

# Functions to suppress pushd and popd output
pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

# Check if pre-commit flag is set
if [ -n "$npm_config_pre_commit" ]; then
    integrations=($(git status --porcelain | grep '^ M integrations/' | sed -E 's|^ M integrations/([^/]+)/.*|\1|' | uniq))
else
    if [ -n "$npm_config_integration" ]; then
        integrations=("$npm_config_integration")
    else
        cd integrations
        integrations=($(ls -d */ | sed 's/\///g'))
        cd ..
    fi
fi

export NANGO_CLI_UPGRADE_MODE=ignore

# Process each integration
for integration in "${integrations[@]}" ; do
    if [ ! -d "./integrations/$integration/mocks" ]; then
        echo "Skipping $integration"
        continue
    fi
    mkdir -p integrations/$integration/nango-integrations/$integration

    # Copy everything except the nango-integrations directory
    rsync -av --exclude='nango-integrations' integrations/$integration/ integrations/$integration/nango-integrations/$integration --quiet

    pushd integrations/$integration/nango-integrations
    mv $integration/nango.yaml .
    npx nango generate
    npx tsx ../../../scripts/tests/generate-tests.ts $integration
    popd

    # Delete everything except the nango-integrations directory
    find integrations/$integration/* -maxdepth 0 -name 'nango-integrations' -prune -o -exec rm -rf {} +
done
