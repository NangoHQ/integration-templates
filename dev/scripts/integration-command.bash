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
SKIP_SANDBOX=${1:-false}
shift
integrations=("$@")

export NANGO_CLI_UPGRADE_MODE=ignore

TEMP_DIRECTORY=tmp-run-integration-template

for integration in "${integrations[@]}"; do
    if [ "$SKIP_SANDBOX" == "true" ]; then
        if [[ -L "integrations/$integration/syncs" ]] || [[ -L "integrations/$integration/actions" ]]; then
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

    #ts_files=($TEMP_DIRECTORY/nango-integrations/*.ts)
    #if [ ${#ts_files[@]} -gt 0 ]; then
        #mv "${ts_files[@]}" "$TEMP_DIRECTORY/nango-integrations/$integration/"
    #fi

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

    if [ -d $TEMP_DIRECTORY/nango-integrations/.nango ]; then
        cp -r $TEMP_DIRECTORY/nango-integrations/.nango integrations/$integration
    fi

    # if command contains ts-to-zod then move the schema.zod.ts file to the integration directory
    if [[ "$COMMAND" == *"ts-to-zod"* ]]; then
        mv $TEMP_DIRECTORY/nango-integrations/$integration/schema.zod.ts integrations/$integration/schema.zod.ts
    fi

    if [[ "$COMMAND" == *"generate:docs"* ]]; then
        # copy all markdown files over
        if [ -d "integrations/$integration/syncs" ]; then
            cp $TEMP_DIRECTORY/nango-integrations/$integration/syncs/*.md integrations/$integration/syncs/
        fi
        if [ -d "integrations/$integration/actions" ]; then
            cp $TEMP_DIRECTORY/nango-integrations/$integration/actions/*.md integrations/$integration/actions/
        fi
    fi

    if [[ "$COMMAND" == *"migrate"* ]]; then
        cp $TEMP_DIRECTORY/nango-integrations/models.ts $TEMP_DIRECTORY/nango-integrations/$integration/models.ts
        cp $TEMP_DIRECTORY/nango-integrations/index.ts $TEMP_DIRECTORY/nango-integrations/$integration/index.ts
        mv $TEMP_DIRECTORY/nango-integrations/$integration templates/$integration
    fi

    rm -rf $TEMP_DIRECTORY
done
