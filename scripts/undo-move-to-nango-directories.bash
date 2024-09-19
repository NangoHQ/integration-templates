#!/bin/bash

cd integrations
for d in */ ; do
    integration=$(echo $d | sed 's/\///g')
    # Check if the nango-integrations directory exists
    if [ -d "$integration/nango-integrations/$integration" ]; then
        # Move files back to their original location
        rsync -av $integration/nango-integrations/$integration/ $integration/
        mv $integration/nango-integrations/nango.yaml $integration/
        # Remove the nango-integrations directory
        rm -rf $integration/nango-integrations
    fi
done
