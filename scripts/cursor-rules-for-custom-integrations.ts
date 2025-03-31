import fs from 'fs';

const INSTRUCTIONS_PATH = './WRITING_INTEGRATION_SCRIPTS.md';
const ADVANCED_PATTERNS_PATH = './ADVANCED_INTEGRATION_SCRIPT_PATTERNS.md';
const OUTPUT_PATH = './rules-for-custom-nango-integrations/nango-best-practices.mdc';

const CUSTOM_FRONTMATTER = `---
description: nango-integrations best practice rules for integration files
glob: nango-integrations/*
ruleType: always
alwaysApply: true
---

`;

const PERSONA_SECTION = `# Persona

You are a top tier integrations engineer. You are methodical, pragmatic and systematic in how you write integration scripts. You follow best practices and look carefully at existing patterns and coding styles in this existing project. You will always attempt to test your work by using the "dryrun" command, and will use a connection if provided to test or will discover a valid connection by using the API to fetch one. You always run the available commands to ensure your work compiles, lints successfully and has a valid nango.yaml.

`;

const INTEGRATIONS_DIRECTORY_STRUCTURE_SECTION = `
# Integration Directory Structure

Your integration should follow this directory structure for consistency and maintainability:

\`\`\`
nango-integrations/
├── nango.yaml              # Main configuration file
├── models.ts               # Auto-generated models from nango.yaml
├── schema.zod.ts          # Generated zod schemas for validation
└── \${integrationName}/
    ├── types.ts           # Third-party API response types
    ├── actions/           # Directory for action implementations
    │   ├── create-user.ts
    │   ├── update-user.ts
    │   └── delete-user.ts
    ├── syncs/             # Directory for sync implementations
    │   ├── users.ts
    │   └── teams.ts
    └── mappers/          # Shared data transformation functions
        ├── to-user.ts
        └── to-team.ts
\`\`\`

## Key Components

1. **Root Level Files**:
   - \`nango.yaml\`: Main configuration file for all integrations
   - \`models.ts\`: Auto-generated models from nango.yaml
   - \`schema.zod.ts\`: Generated validation schemas

2. **Integration Level Files**:
   - \`types.ts\`: Third-party API response types specific to the integration

3. **Actions Directory**:
   - One file per action
   - Named after the action (e.g., \`create-user.ts\`, \`update-user.ts\`)
   - Each file exports a default \`runAction\` function

4. **Syncs Directory**:
   - One file per sync
   - Named after the sync (e.g., \`users.ts\`, \`teams.ts\`)
   - Each file exports a default \`fetchData\` function

5. **Mappers Directory**:
   - Shared data transformation functions
   - Named with pattern \`to-\${entity}.ts\`
   - Used by both actions and syncs
`;

const CUSTOM_DRYRUN_SECTION = `
### Running Tests

Test scripts directly against the third-party API using dryrun:

\`\`\`bash
npx nango dryrun \${scriptName} \${connectionId} --integration-id \${INTEGRATION} --auto-confirm
\`\`\`

Example:
\`\`\`bash
npx nango dryrun settings g --integration-id google-calendar --auto-confirm
\`\`\`

### Dryrun Options

- \`--auto-confirm\`: Skip prompts and show all output
\`\`\`bash
npx nango dryrun settings g --auto-confirm --integration-id google-calendar
\`\`\`


## Script Helpers

-   \`npx nango dryrun \${scriptName} \${connectionId} -e \${Optional environment}\` --integration-id \${INTEGRATION}
-   \`npx nango compile\` -- ensure all integrations compile
-   \`npx nango generate\` -- when adding an integration or updating the nango.yaml this command should be ran to update the models.ts file and also the schema auto generated files
-   \`npx nango sync:config.check\` -- ensure the nango.yaml is valid and could compile successfully 
`;

const DEPLOY_SECTION = `
## Deploying Integrations

Once your integration is complete and tested, you can deploy it using the Nango CLI:

\`\`\`bash
npx nango deploy <environment>
\`\`\`

### Deployment Options

- \`--auto-confirm\`: Skip all confirmation prompts
- \`--debug\`: Run CLI in debug mode with verbose logging
- \`-v, --version [version]\`: Tag this deployment with a version (useful for rollbacks)
- \`-s, --sync [syncName]\`: Deploy only a specific sync
- \`-a, --action [actionName]\`: Deploy only a specific action
- \`-i, --integration [integrationId]\`: Deploy all scripts for a specific integration
- \`--allow-destructive\`: Allow destructive changes without confirmation (use with caution)

### Examples

Deploy everything to production:
\`\`\`bash
npx nango deploy production
\`\`\`

Deploy a specific sync to staging:
\`\`\`bash
npx nango deploy staging -s contacts
\`\`\`

Deploy an integration with version tag:
\`\`\`bash
npx nango deploy production -i salesforce -v 1.0.0
\`\`\`

Deploy with auto-confirmation:
\`\`\`bash
npx nango deploy staging --auto-confirm
\`\`\`
`;

function main() {
    // Read the base instructions and advanced patterns
    const instructionsMd = fs.readFileSync(INSTRUCTIONS_PATH, 'utf-8');
    const advancedPatternsMd = fs.readFileSync(ADVANCED_PATTERNS_PATH, 'utf-8');

    // Split the content to remove both the old dryrun examples and the Running Tests section
    let [mainContent] = instructionsMd.split('For example, to test with one of these connections:');

    // Combine all content in the desired order
    const fullContent =
        CUSTOM_FRONTMATTER +
        PERSONA_SECTION +
        mainContent +
        INTEGRATIONS_DIRECTORY_STRUCTURE_SECTION +
        '\n\n' +
        advancedPatternsMd +
        CUSTOM_DRYRUN_SECTION +
        DEPLOY_SECTION;

    // Write the combined content to the output file
    fs.writeFileSync(OUTPUT_PATH, fullContent);
    console.log(`✅ MDC file written to: ${OUTPUT_PATH}`);
}

main();
