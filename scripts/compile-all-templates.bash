#!/bin/bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

if [ -n "$npm_config_integration" ]; then
    integrations=("$npm_config_integration")
else
    cd integrations
    integrations=($(ls -d */ | sed 's/\///g'))
    cd ..
fi

cd integrations
for integration in "${integrations[@]}" ; do
    mkdir -p $integration/nango-integrations/$integration

    # copy everything except the nango-integrations directory
    rsync -av --exclude='nango-integrations' $integration/ $integration/nango-integrations/$integration --quiet

    pushd $integration/nango-integrations
    mv $integration/nango.yaml .

    npx nango compile
    popd

    # delete everything except the nango-integrations directory
    find $integration/* -maxdepth 0 -name 'nango-integrations' -prune -o -exec rm -rf {} +
done
