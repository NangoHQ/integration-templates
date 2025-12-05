#!/usr/bin/env node

/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
/* eslint-disable no-console */
/* eslint-disable @nangohq/custom-integrations-linting/no-console-log */
/* eslint-disable @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed */

import { readFile, writeFile, readdir, lstat, readlink } from 'fs/promises';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import type { NangoYamlParsedIntegration } from '@nangohq/types';
import chalk from 'chalk';
import { errorToString } from './utils.js';
import type { ZeroFlow } from './types.js';

const root = join(import.meta.dirname, '..', '..', '..');

// Symlink mappings: symlink name -> target name
const SYMLINKS: Record<string, string> = {
    'airtable-pat': 'airtable',
    'avalara-sandbox': 'avalara',
    bamboo: 'bamboohr-basic',
    'bill-sandbox': 'bill',
    'dialpad-sandbox': 'dialpad',
    'docusign-sandbox': 'docusign',
    'github-app-oauth': 'github-app',
    'gong-oauth': 'gong',
    'gorgias-basic': 'gorgias',
    greenhouse: 'greenhouse-basic',
    'gusto-demo': 'gusto',
    'lever-basic': 'lever',
    'lever-basic-sandbox': 'lever',
    'lever-sandbox': 'lever',
    'okta-preview': 'okta',
    'quickbooks-sandbox': 'quickbooks',
    'ramp-sandbox': 'ramp',
    'ring-central-sandbox': 'ring-central',
    'salesforce-sandbox': 'salesforce',
    'stripe-app-sandbox': 'stripe-app'
};

async function main(): Promise<void> {
    console.log('Compiling all integration templates to flows.zero.json');
    console.log();

    // Load nango version from package.json
    const packageJsonPath = join(root, 'package.json');
    let nangoVersion = 'unknown';
    try {
        const packageJsonContent = await readFile(packageJsonPath, 'utf8');
        const packageData = JSON.parse(packageJsonContent);
        nangoVersion = (packageData['devDependencies']['nango'] || 'unknown').replace('^', '');
        console.log(`Nango version: ${chalk.blue(nangoVersion)}`);
    } catch (error) {
        console.error(`${chalk.red('err')} Could not read nango version: ${(error as Error).message}`);
        process.exit(1);
    }

    const integrationsPath = join(root, 'integrations');

    // Step 1: Run npx nango compile from the integrations directory
    console.log();
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`Running: ${chalk.blue('npx nango compile')}`);
    console.log(chalk.gray('─'.repeat(40)));

    try {
        execSync('npx nango compile', {
            cwd: integrationsPath,
            stdio: 'inherit',
            env: {
                ...process.env,
                NANGO_CLI_UPGRADE_MODE: 'ignore'
            }
        });
    } catch (error) {
        console.error(`${chalk.red('err')} nango compile failed: ${errorToString(error)}`);
        process.exit(1);
    }

    console.log(chalk.gray('─'.repeat(40)));
    console.log();
    console.log('Compile complete. Reading generated files...');

    // Step 2: Read the generated nango.json and schema.json from integrations/.nango/
    const nangoJsonPath = join(integrationsPath, '.nango', 'nango.json');
    const schemaJsonPath = join(integrationsPath, '.nango', 'schema.json');

    let nangoData: NangoYamlParsedIntegration[];
    let jsonSchema: unknown;

    try {
        const nangoJsonContent = await readFile(nangoJsonPath, 'utf8');
        nangoData = JSON.parse(nangoJsonContent) as NangoYamlParsedIntegration[];
        console.log(`  Read nango.json: ${chalk.green(nangoData.length)} integrations found`);
    } catch (error) {
        console.error(`${chalk.red('err')} Could not read nango.json: ${errorToString(error)}`);
        process.exit(1);
    }

    try {
        const schemaJsonContent = await readFile(schemaJsonPath, 'utf8');
        jsonSchema = JSON.parse(schemaJsonContent);
        console.log(`  Read schema.json: ${chalk.green('OK')}`);
    } catch (error) {
        console.error(`${chalk.red('err')} Could not read schema.json: ${errorToString(error)}`);
        process.exit(1);
    }

    // Step 3: Transform to ZeroFlow format
    // Each integration in nangoData already has providerConfigKey set
    // Filter jsonSchema to only include models used by each integration
    const fullSchema = jsonSchema as { $schema?: string; $comment?: string; definitions: Record<string, unknown> };

    const aggregatedFlows: ZeroFlow[] = nangoData.map((integration) => {
        // Collect all used models from syncs and actions
        const usedModels = new Set<string>();

        for (const sync of integration.syncs || []) {
            if (sync.usedModels) {
                for (const model of sync.usedModels) {
                    usedModels.add(model);
                }
            }
        }

        for (const action of integration.actions || []) {
            if (action.usedModels) {
                for (const model of action.usedModels) {
                    usedModels.add(model);
                }
            }
        }

        // Filter definitions to only include used models
        const filteredDefinitions: Record<string, unknown> = {};
        for (const modelName of usedModels) {
            if (fullSchema.definitions[modelName]) {
                filteredDefinitions[modelName] = fullSchema.definitions[modelName];
            }
        }

        const filteredJsonSchema = {
            $schema: fullSchema.$schema,
            $comment: fullSchema.$comment,
            definitions: filteredDefinitions
        };

        return {
            ...integration,
            jsonSchema: filteredJsonSchema,
            sdkVersion: nangoVersion,
            symLinkTargetName: null
        };
    });

    // Step 4: Add symlink entries
    // For each symlink, create an entry that references its target
    console.log();
    console.log('Adding symlink entries...');
    const integrationsByKey = new Map(aggregatedFlows.map((flow) => [flow.providerConfigKey, flow]));

    for (const [symlinkName, targetName] of Object.entries(SYMLINKS)) {
        const targetFlow = integrationsByKey.get(targetName);
        if (targetFlow) {
            const symlinkFlow: ZeroFlow = {
                ...targetFlow,
                providerConfigKey: symlinkName,
                symLinkTargetName: targetName
            };
            aggregatedFlows.push(symlinkFlow);
            console.log(`  ${chalk.blue(symlinkName)} -> ${targetName}`);
        } else {
            console.log(`  ${chalk.yellow('warn')} Target ${targetName} not found for symlink ${symlinkName}`);
        }
    }

    // Sort by providerConfigKey for consistent output
    aggregatedFlows.sort((a, b) => a.providerConfigKey.localeCompare(b.providerConfigKey));

    console.log();
    console.log(`Total flows aggregated: ${chalk.green(aggregatedFlows.length)}`);

    // Step 5: Write the aggregated flows to flows.zero.json
    const outputPath = join(root, 'internal/flows.zero.json');
    await writeFile(outputPath, JSON.stringify(aggregatedFlows, null, 4), 'utf8');

    // Format with prettier
    execSync('prettier -w internal/flows.zero.json', {
        stdio: 'pipe',
        cwd: root
    });

    console.log(`Output written to: ${chalk.green(outputPath)}`);
    console.log();
    console.log(chalk.green('Done!'));
}

// Run the script
main().catch(async (error) => {
    const errorMessage = `Script failed: ${error}`;

    console.error(errorMessage);
    process.stderr.write(`\n${errorMessage}\n`);

    process.stdout.write('');
    process.stderr.write('');
    await new Promise((resolve) => setTimeout(resolve, 100));

    process.exit(1);
});
