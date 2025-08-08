#!/bin/bash

if [ -n "$npm_config_integration" ]; then
    integrations=("$npm_config_integration")
else
    cd integrations
    integrations=($(ls -d */ | sed 's/\///g'))
    cd ..
fi

cd integrations

for integration in "${integrations[@]}" ; do
    # Check if the nango-integrations directory exists
    if [ -d "$integration/nango-integrations/$integration" ]; then
        # Move files back to their original location
        rsync -av $integration/nango-integrations/$integration/ $integration/ --quiet
        mv $integration/nango-integrations/nango.yaml $integration/
        # Remove the nango-integrations directory
        rm -rf $integration/nango-integrations
    fi
done
