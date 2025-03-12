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

# Check if npm_config_integration is set
if [ -n "$npm_config_integration" ]; then
    integrations=("$npm_config_integration/")
else
    cd integrations
    integrations=(*/)
    cd ..
fi

cd integrations

for d in "${integrations[@]}" ; do
    integration=$(echo $d | sed 's/\///g')
    INTEGRATION_DIR="$integration"

    # If syncs or actions is a symlink, we need to resolve them
    if [[ -L "$INTEGRATION_DIR/syncs" ]] || [[ -L "$INTEGRATION_DIR/actions" ]]; then
        echo "Processing integration: $integration"

        pushd "$INTEGRATION_DIR" > /dev/null

        find . -maxdepth 1 -type l 2>/dev/null | while read -r symlink; do
            TARGET=$(realpath "$symlink")

            if [[ -n "$TARGET" && -e "$TARGET" ]]; then
                echo "Replacing symlink $symlink with actual content from $TARGET"
                rm "$symlink"
                cp -L "$TARGET" "$symlink"
            else
                echo "Failed to resolve symlink: $symlink"
            fi
        done

        for symlink in $(find syncs actions -type l 2>/dev/null); do
            TARGET=$(realpath "$symlink")

            if [[ -n "$TARGET" && -e "$TARGET" ]]; then
                echo "Replacing symlink $symlink with actual content from $TARGET"
                rm "$symlink"
                cp -L "$TARGET" "$symlink"
            else
                echo "Failed to resolve symlink: $symlink"
            fi
        done

        popd > /dev/null
    fi
done

for d in "${integrations[@]}"; do
    integration=$(echo $d | sed 's/\///g')
    eval "$SED_CMD 's|\${PWD}|$integration|' $integration/nango.yaml"
done
