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

TEMP_DIRECTORY=tmp-run-integration-template

# Process each integration
for integration in "${integrations[@]}" ; do
    if [ ! -d "./integrations/$integration/mocks" ]; then
        echo "Skipping $integration"
        continue
    fi
    rm -rf $TEMP_DIRECTORY
    mkdir -p $TEMP_DIRECTORY/nango-integrations
    cp -r integrations/$integration $TEMP_DIRECTORY/nango-integrations

    mv $TEMP_DIRECTORY/nango-integrations/$integration/nango.yaml $TEMP_DIRECTORY/nango-integrations/nango.yaml
    sed -i '' "s|\${PWD}|$integration|g" $TEMP_DIRECTORY/nango-integrations/nango.yaml

    [ -f $TEMP_DIRECTORY/nango-integrations/*.ts ] && mv $TEMP_DIRECTORY/nango-integrations/*.ts $TEMP_DIRECTORY/nango-integrations/$integration/

    pushd $TEMP_DIRECTORY/nango-integrations

    npx nango generate
    npx tsx ../../scripts/tests/generate-tests.ts $integration

    popd

    cp -r $TEMP_DIRECTORY/nango-integrations/$integration/tests integrations/$integration
    rm -rf $TEMP_DIRECTORY
done
