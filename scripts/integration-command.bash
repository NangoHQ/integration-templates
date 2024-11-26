#!/bin/bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

# Default command
DEFAULT_COMMAND="npx nango compile"

# Use the first argument as the command or fallback to default
COMMAND=${1:-$DEFAULT_COMMAND}
shift
integrations=("$@")

export NANGO_CLI_UPGRADE_MODE=ignore

TEMP_DIRECTORY=tmp-run-integration-template

for integration in "${integrations[@]}"; do
    rm -rf $TEMP_DIRECTORY
    mkdir -p $TEMP_DIRECTORY/nango-integrations
    cp -r integrations/$integration $TEMP_DIRECTORY/nango-integrations

    mv $TEMP_DIRECTORY/nango-integrations/$integration/nango.yaml $TEMP_DIRECTORY/nango-integrations/nango.yaml
    sed -i '' "s|\${PWD}|$integration|g" $TEMP_DIRECTORY/nango-integrations/nango.yaml

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
