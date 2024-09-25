#!/bin/bash

# Functions to suppress pushd and popd output
pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

if [ -n "$1" ]; then
    # If an integration is passed, use it
    integrations=("$1")
else
    cd integrations
    integrations=($(ls -d */ | sed 's/\///g'))
    cd ..
fi

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
