#!/bin/bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

if [ -n "$npm_config_integration" ]; then
    integrations=("$npm_config_integration")
else
    cd integrations
    integrations=($(ls -d */ | sed 's/\///g'))
    cd ..
fi

if [[ "$(uname)" == "Darwin" ]]; then
    # macOS
    SED_CMD="sed -i ''"
else
    # Linux or others
    SED_CMD="sed -i"
fi

export NANGO_CLI_UPGRADE_MODE=ignore

TEMP_DIRECTORY=tmp-run-integration-template

for integration in "${integrations[@]}"; do
    if [[ -L "integrations/$integration/syncs" || -L "integrations/$integration/actions" ]]; then
        TARGET=$(readlink "integrations/$integration/nango.yaml")
        cp "integrations/$integration/nango.yaml" "$TARGET"
    fi

    eval "$SED_CMD 's|\${PWD}|$integration|' integrations/$integration/nango.yaml"
done

