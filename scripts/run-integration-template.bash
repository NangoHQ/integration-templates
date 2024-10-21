#!/bin/bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

TEMP_DIRECTORY=tmp-run-integration-template

NANGO_HOSTPORT_DEFAULT=http://localhost:3003

ITERATIONS=1
INPUT_JSON=""
USE_ITERATIONS=false

# optional arguments
for arg in "$@"; do
    case $arg in
        KEY=*)
            NANGO_SECRET_KEY_DEV="${arg#*=}"
            shift
            ;;
        HOST=*)
            NANGO_HOSTPORT="${arg#*=}"
            shift
            ;;
        --iterations=*)
            ITERATIONS="${arg#*=}"
            USE_ITERATIONS=true
            shift
            ;;
    esac
done

if [ -z "$NANGO_SECRET_KEY_DEV" ]; then
    echo "NANGO_SECRET_KEY_DEV must be set"
    exit 1
fi

# Fallback to default values if not set by arguments
NANGO_HOSTPORT=${NANGO_HOSTPORT:-$NANGO_HOSTPORT_DEFAULT}

INTEGRATION=$1
shift


rm -rf $TEMP_DIRECTORY
mkdir -p $TEMP_DIRECTORY/nango-integrations
cp -r integrations/$INTEGRATION $TEMP_DIRECTORY/nango-integrations

mv $TEMP_DIRECTORY/nango-integrations/$INTEGRATION/nango.yaml $TEMP_DIRECTORY/nango-integrations/nango.yaml

[ -f $TEMP_DIRECTORY/nango-integrations/*.ts ] && mv $TEMP_DIRECTORY/nango-integrations/*.ts $TEMP_DIRECTORY/nango-integrations/$INTEGRATION/

pushd $TEMP_DIRECTORY/nango-integrations

if $USE_ITERATIONS; then
    # parse the string in between @ and .json
    JSON_FILE_NAME=$(echo $@ | sed 's/.*@\(.*\)\.json/\1/').json
    ORIGINAL_JSON="${JSON_FILE_NAME}.bak"
    cp $JSON_FILE_NAME $JSON_FILE_NAME.bak
    INPUT_JSON=$JSON_FILE_NAME
fi

# Loop to run the command the specified number of iterations
for ((i=1; i<=ITERATIONS; i++)); do
    if $USE_ITERATIONS && [ -n "$INPUT_JSON" ] && [[ "$INPUT_JSON" == *.json ]]; then
        PRE_REPLACE_CONTENTS=$(cat $INPUT_JSON)
        sed -i '' -e "s/\${iteration}/$i/g" "$INPUT_JSON"
    fi

    NANGO_MOCKS_RESPONSE_DIRECTORY="../../integrations/" NANGO_SECRET_KEY_DEV=$NANGO_SECRET_KEY_DEV NANGO_HOSTPORT=$NANGO_HOSTPORT npx nango "$@"

    if $USE_ITERATIONS && [ -n "$INPUT_JSON" ] && [[ "$INPUT_JSON" == *.json ]]; then
        echo "$PRE_REPLACE_CONTENTS" > $INPUT_JSON
    fi
done

if $USE_ITERATIONS && [ -f "$ORIGINAL_JSON" ]; then
    mv "$ORIGINAL_JSON" "$INPUT_JSON"
fi

popd
rm -rf $TEMP_DIRECTORY
