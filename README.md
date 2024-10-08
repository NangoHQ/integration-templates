<div align="center">

<img src="/assets/nango-logo.png?raw=true" width="350">

</div>

<h1 align="center">One platform for all your integrations.</h1>

<div align="center">
Ship integrations fast. Maintain full control.
</div>

<p align="center">
    <br />
    <a href="https://docs.nango.dev/" rel="dofollow"><strong>Explore the docs »</strong></a>
    <br />

  <br/>
    <a href="https://nango.dev/integrations">250+ pre-configured APIs</a>
    ·
    <a href="https://nango.dev">Website</a>
    ·
    <a href="https://docs.nango.dev/customize/guides/contribute-an-api">Contribute an API</a>
    ·
    <a href="https://nango.dev/slack">Slack Community</a>
</p>

Nango is a single API to interact with all other external APIs. It should be the only API you need to integrate to your app.

<img src="/assets/overview.png">

## Integration Templates

Public integration templates to jump start your integrations.

## Development

Please review and follow the [writing integration scripts](/WRITING_INTEGRATION_SCRIPTS.md) guidlines

Upon making a PR review please ensure you have gone through the PR checklist.

## Script Helpers
* `npm run move:integrations` moves all the integrations into a `nango-integrations` directory. Accepts an `--integration=${INTEGRATION}` flag
* `npm run undo:move:integrations` undo the move of integrations into a `nango-integrations` directory
* `npm run lint-moved-integrations` lint all the integrations after moving them to the to the `nngo-integrations` directory
* `npm run generate:zod` generate zod models for all integrations. Accepts an `--integration=${INTEGRATION}` flag. Doesn't overwrite existing zod file but if `--force` is passed it will
* `npm run compile` moves all the integrations into a `nango-integrations` directory and attempts to compile the code
* `npm run prettier-format` formats the typescript files according to the prettier configuration
* `npm run generate:tests` generate test files for all integrations. Accepts a `--integration=${INTEGRATION}` flag
