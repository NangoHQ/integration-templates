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

# Default command
DEFAULT_COMMAND="npx nango compile"

# Use the first argument as the command or fallback to default
COMMAND=${1:-$DEFAULT_COMMAND}
shift
SKIP_SANDBOX=${2:-false}
shift
integrations=("$@")

export NANGO_CLI_UPGRADE_MODE=ignore

TEMP_DIRECTORY=tmp-run-integration-template

for integration in "${integrations[@]}"; do
    if [ "$SKIP_SANDBOX" == "true" ]; then
        if [[ -L "$integration/syncs" || -L "$integration/actions" ]]; then
            echo "Skipping directory $integration because syncs or actions is a symlink"
            continue
        fi
    fi

    rm -rf $TEMP_DIRECTORY
    mkdir -p $TEMP_DIRECTORY/nango-integrations
    cp -r integrations/$integration $TEMP_DIRECTORY/nango-integrations

    mv $TEMP_DIRECTORY/nango-integrations/$integration/nango.yaml $TEMP_DIRECTORY/nango-integrations/nango.yaml
    eval "$SED_CMD 's|\${PWD}|$integration|' $TEMP_DIRECTORY/nango-integrations/nango.yaml"

    [ -f $TEMP_DIRECTORY/nango-integrations/*.ts ] && mv $TEMP_DIRECTORY/nango-integrations/*.ts $TEMP_DIRECTORY/nango-integrations/$integration/

    pushd $TEMP_DIRECTORY/nango-integrations

    # Run the command dynamically
    eval "$COMMAND"

    popd

    if [ "$COMMAND" == "npx nango compile" ]; then
        cp $TEMP_DIRECTORY/nango-integrations/models.ts integrations/models.ts
    fi

    rm -rf $TEMP_DIRECTORY
done
