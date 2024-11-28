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
    if [[ -L "integrations/$integration/syncs" ]] || [[ -L "integrations/$integration/actions" ]]; then
        TARGET=$(realpath "integrations/$integration/nango.yaml") # Or `readlink -f` on Linux

        pushd "integrations/$integration" > /dev/null

        if [[ -n "$TARGET" ]]; then
            echo "Replacing symlink for $integration/nango.yaml with its target content"
            rm nango.yaml
            cp -L "$TARGET" nango.yaml
        else
            echo "Failed to resolve symlink for $integration/nango.yaml"
        fi

        popd > /dev/null
    fi
done


for integration in "${integrations[@]}"; do
    eval "$SED_CMD 's|\${PWD}|$integration|' integrations/$integration/nango.yaml"
done
