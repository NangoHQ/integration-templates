#!/bin/bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

integration=("$npm_config_integration")

cd integrations

mkdir -p $integration/nango-integrations/$integration

# copy everything except the nango-integrations directory
rsync -av --exclude='nango-integrations' $integration/ $integration/nango-integrations/$integration --quiet

pushd $integration/nango-integrations
mv $integration/nango.yaml .
sed -i '' "s|\${PWD}|$integration|g" nango.yaml

npx nango compile

cp models.ts ../../models.ts
popd

rsync -av $integration/nango-integrations/$integration/ $integration/ --quiet
mv $integration/nango-integrations/nango.yaml $integration/
# Remove the nango-integrations directory
rm -rf $integration/nango-integrations
