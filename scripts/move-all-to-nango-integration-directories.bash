#!/bin/bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

cd integrations
for d in */ ; do
    integration=$(echo $d | sed 's/\///g')
    mkdir -p $integration/nango-integrations/$integration

    # copy everything except the nango-integrations directory
    rsync -av --exclude='nango-integrations' $integration/ $integration/nango-integrations/$integration

    pushd $integration/nango-integrations
    npx nango generate
    popd

    # delete everything except the nango-integrations directory
    find $integration/* -maxdepth 0 -name 'nango-integrations' -prune -o -exec rm -rf {} +
done
