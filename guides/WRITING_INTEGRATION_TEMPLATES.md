### Code Generation

Generate zod models at the integration level:
```bash
npm run generate:zod --integration=${INTEGRATION}
```

### Running Tests

Test scripts directly against the third-party API using dryrun:

```bash
npm run dryrun -- ${INTEGRATION} ${scriptName} ${connectionId} --auto-confirm
```

Example:
```bash
npm run dryrun -- google-calendar settings g --auto-confirm
```

### Dryrun Options

- `--auto-confirm`: Skip prompts and show all output
```bash
npm run dryrun -- google-calendar settings g --auto-confirm
```

- `--save-responses`: Save API responses for test fixtures
```bash
npm run dryrun -- google-calendar settings g --save-responses --auto-confirm
```

- Combine options:
```bash
npm run dryrun -- google-calendar settings g --save-responses --auto-confirm
```

### Test Generation

Save responses from a dryrun using the `--save-responses` flag with dryrun

After saving responses, generate tests:
```bash
npm run generate:tests --integration=${INTEGRATION}
```

The test will create a `tmp-run-integration-template`. This directory should not be directly be interacted with but rather
is used programmatically.

This will:
1. Use saved API responses as test fixtures
2. Create test files in the `tests` directory
3. Set up proper mocking and assertions
4. Test both data saving and deletion

## Script Helpers

-   `npm run move:integrations` moves all the integrations into a `nango-integrations` directory. Accepts an optional `--integration=${INTEGRATION}` flag
-   `npm run undo:move:integrations` undo the move of integrations into a `nango-integrations` directory
-   `npm run lint-moved-integrations` lint all the integrations after moving them to the `nango-integrations` directory
-   `npm run generate:zod --integration=${INTEGRATION}` generate zod models for all integrations. 
-   `npm run compile --integration=${INTEGRATION}` moves the specified integration into a `nango-integrations` directory and attempts to compile the code
-   `npm run prettier-format` formats the typescript files according to the prettier configuration
-   `npm run generate:tests` generate test files for all integrations. Accepts an optional `--integration=${INTEGRATION}` flag
-   `npm run dryrun -- ${INTEGRATION} ${scriptName} ${connectionId} -e ${Optional environment}`