#!/bin/bash

if [ -n "$npm_config_integration" ]; then
    integrations=("$npm_config_integration")
else
    cd integrations
    integrations=($(ls -d */ | sed 's/\///g'))
    cd ..
fi

bash scripts/integration-command.bash "npx nango generate && npx ts-to-zod .nango/schema.ts _CURRENT_INTEGRATION_/schema.zod.ts" "false" "${integrations[@]}"
