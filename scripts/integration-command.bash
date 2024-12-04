#!/bin/bash

set -e

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
        if [[ -L "$integration/syncs" ]] || [[ -L "$integration/actions" ]]; then
            echo "Skipping directory $integration because syncs or actions is a symlink"
            continue
        fi
    fi

    echo "Processing integration $integration"

    if [ ! -d "integrations/$integration" ]; then
        echo "Integration directory integrations/$integration not found"
        continue
    fi

    mkdir -p $TEMP_DIRECTORY/nango-integrations
    cp -r integrations/$integration $TEMP_DIRECTORY/nango-integrations

    if [ ! -f "$TEMP_DIRECTORY/nango-integrations/$integration/nango.yaml" ]; then
        echo "nango.yaml not found in $TEMP_DIRECTORY/nango-integrations/$integration"
        continue
    fi

    mv $TEMP_DIRECTORY/nango-integrations/$integration/nango.yaml $TEMP_DIRECTORY/nango-integrations/nango.yaml
    eval "$SED_CMD 's|\${PWD}|$integration|' $TEMP_DIRECTORY/nango-integrations/nango.yaml"

    [ -f $TEMP_DIRECTORY/nango-integrations/*.ts ] && mv $TEMP_DIRECTORY/nango-integrations/*.ts $TEMP_DIRECTORY/nango-integrations/$integration/

    pushd $TEMP_DIRECTORY/nango-integrations

    # if we need a dynamic integration then we replace the known
    # variable _CURRENT_INTEGRATION_ with the current integration
    if [[ "$COMMAND" == *"_CURRENT_INTEGRATION_"* ]]; then
        COMMAND="${COMMAND//_CURRENT_INTEGRATION_/$integration}"
    fi

    # Run the command dynamically
    eval "$COMMAND"

    popd

    if [ "$COMMAND" == "npx nango compile" ]; then
        cp $TEMP_DIRECTORY/nango-integrations/models.ts integrations/models.ts
    fi

    # if command contains ts-to-zod then move the schema.zod.ts file to the integration directory
    if [[ "$COMMAND" == *"ts-to-zod"* ]]; then
        mv $TEMP_DIRECTORY/nango-integrations/$integration/schema.zod.ts integrations/$integration/schema.zod.ts
    fi

    rm -rf $TEMP_DIRECTORY
done
