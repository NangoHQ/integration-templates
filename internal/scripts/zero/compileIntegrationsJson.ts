#!/usr/bin/env node

/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
/* eslint-disable no-console */
/* eslint-disable @nangohq/custom-integrations-linting/no-console-log */
/* eslint-disable @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed */

import { readFile, writeFile, readdir, lstat, readlink, mkdir, copyFile, rm } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import type { NangoYamlParsedIntegration } from '@nangohq/types';
import chalk from 'chalk';
import { errorToString } from './utils.js';
import type { ZeroFlow } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..', '..', '..');

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

    // Step 2.5: Distribute build files to each integration's build directory
    console.log();
    console.log('Distributing build files to integration directories...');

    const centralBuildDir = join(integrationsPath, 'build');
    if (!existsSync(centralBuildDir)) {
        console.log(`  ${chalk.yellow('warn')} No build directory found, skipping distribution`);
    } else {
        // Read all .cjs files from the central build directory
        const buildFiles = await readdir(centralBuildDir);
        const cjsFiles = buildFiles.filter((f) => f.endsWith('.cjs'));

        // Group files by integration name (prefix before first underscore)
        const filesByIntegration = new Map<string, string[]>();
        for (const file of cjsFiles) {
            // Files are named like: airtable_syncs_bases.cjs or airtable_actions_create-webhook.cjs
            const underscoreIndex = file.indexOf('_');
            if (underscoreIndex === -1) continue;

            const integrationName = file.substring(0, underscoreIndex);
            if (!filesByIntegration.has(integrationName)) {
                filesByIntegration.set(integrationName, []);
            }
            filesByIntegration.get(integrationName)!.push(file);
        }

        // Distribute files to each integration's build directory
        for (const [integrationName, files] of filesByIntegration) {
            const integrationDir = join(integrationsPath, integrationName);

            // Skip if integration directory doesn't exist
            if (!existsSync(integrationDir)) {
                continue;
            }

            // Skip symlinked directories to avoid overwriting the target's build
            const stat = await lstat(integrationDir);
            if (stat.isSymbolicLink()) {
                continue;
            }

            const integrationBuildDir = join(integrationDir, 'build');

            // Clear and recreate build directory
            if (existsSync(integrationBuildDir)) {
                await rm(integrationBuildDir, { recursive: true });
            }
            await mkdir(integrationBuildDir, { recursive: true });

            // Copy each file, keeping the original filename
            for (const file of files) {
                const sourceFile = join(centralBuildDir, file);
                const destFile = join(integrationBuildDir, file);
                await copyFile(sourceFile, destFile);
            }

            console.log(`  ${chalk.green('✓')} ${integrationName} (${files.length} files)`);
        }
    }

    const fullSchema = jsonSchema as { $schema?: string; $comment?: string; definitions: Record<string, unknown> };

    // Step 2.6: Distribute .nango files to each integration's .nango directory
    console.log();
    console.log('Distributing .nango files to integration directories...');

    // Read schema.ts from main .nango directory
    const schemaTsPath = join(integrationsPath, '.nango', 'schema.ts');
    let schemaTs = '';
    try {
        schemaTs = await readFile(schemaTsPath, 'utf8');
    } catch (error) {
        console.log(`  ${chalk.yellow('warn')} Could not read schema.ts: ${errorToString(error)}`);
    }

    for (const integration of nangoData) {
        const integrationName = integration.providerConfigKey;
        const integrationDir = join(integrationsPath, integrationName);

        // Skip if integration directory doesn't exist
        if (!existsSync(integrationDir)) {
            continue;
        }

        // Skip symlinked directories
        const stat = await lstat(integrationDir);
        if (stat.isSymbolicLink()) {
            continue;
        }

        const integrationNangoDir = join(integrationDir, '.nango');

        // Create .nango directory if it doesn't exist
        if (!existsSync(integrationNangoDir)) {
            await mkdir(integrationNangoDir, { recursive: true });
        }

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

        // Write nango.json with just this integration's data
        const integrationNangoJson = [integration];
        await writeFile(join(integrationNangoDir, 'nango.json'), JSON.stringify(integrationNangoJson, null, 2), 'utf8');

        // Filter schema.json definitions to only include used models
        const filteredDefinitions: Record<string, unknown> = {};
        for (const modelName of usedModels) {
            if (fullSchema.definitions[modelName]) {
                filteredDefinitions[modelName] = fullSchema.definitions[modelName];
            }
        }
        const filteredSchemaJson = {
            $schema: fullSchema.$schema,
            $comment: fullSchema.$comment,
            definitions: filteredDefinitions
        };
        await writeFile(join(integrationNangoDir, 'schema.json'), JSON.stringify(filteredSchemaJson, null, 2), 'utf8');

        // Filter schema.ts to only include used models
        if (schemaTs) {
            // Extract type/interface definitions for used models
            const filteredSchemaTsLines: string[] = [];
            const lines = schemaTs.split('\n');
            let inUsedBlock = false;
            let braceCount = 0;

            for (const line of lines) {
                // Check if this line starts a type or interface we need
                const typeMatch = line.match(/^export\s+(type|interface)\s+(\w+)/);
                if (typeMatch) {
                    const typeName = typeMatch[2];
                    if (usedModels.has(typeName)) {
                        inUsedBlock = true;
                        braceCount = 0;
                    }
                }

                if (inUsedBlock) {
                    filteredSchemaTsLines.push(line);
                    braceCount += (line.match(/{/g) || []).length;
                    braceCount -= (line.match(/}/g) || []).length;
                    if (braceCount <= 0 && line.includes('}')) {
                        inUsedBlock = false;
                        filteredSchemaTsLines.push('');
                    }
                }
            }

            if (filteredSchemaTsLines.length > 0) {
                await writeFile(join(integrationNangoDir, 'schema.ts'), filteredSchemaTsLines.join('\n'), 'utf8');
            }
        }

        console.log(`  ${chalk.green('✓')} ${integrationName} (.nango files)`);
    }

    // Step 3: Transform to ZeroFlow format
    // Each integration in nangoData already has providerConfigKey set
    // Filter jsonSchema to only include models used by each integration

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
