#!/usr/bin/env node

/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
/* eslint-disable no-console */
/* eslint-disable @nangohq/custom-integrations-linting/no-console-log */
/* eslint-disable @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import type { NangoYamlParsedIntegration } from '@nangohq/types';
import chalk from 'chalk';
import { errorToString } from './utils.js';
import type { ZeroFlow } from './types.js';

const root = join(import.meta.dirname, '..', '..', '..');

async function main(): Promise<void> {
    console.log('Building all templates flows');

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

    // Get all integration folders
    const templatesPath = join(root, 'integrations');
    const templatesFolders = await readdir(templatesPath, { withFileTypes: true });

    const aggregatedFlows: ZeroFlow[] = [];

    console.log();
    console.log(chalk.gray('─'.repeat(20)));

    // Process each folder
    for (const folder of templatesFolders) {
        if (!folder.isDirectory()) {
            continue;
        }
        if (folder.name === '.nango' || folder.name === 'build' || folder.name === 'node_modules') {
            continue;
        }

        const name = folder.name;
        try {
            console.log(`- Processing ${chalk.blue(name)}...`);

            // Only compile if --rebuild flag is passed
            if (process.argv.includes('--rebuild-all')) {
                // Run the compile command
                const command = `npm run cli -- ${name} compile`;
                console.log(`  Running: ${command}`);

                execSync(command, {
                    stdio: 'pipe',
                    cwd: root
                });

                // also rebuild the docs
                const docsCommand = `npm run cli -- ${name} generate:docs`;
                console.log(`  Running: ${command}`);

                execSync(command, {
                    stdio: 'pipe',
                    cwd: root
                });
            }

            // Read the generated nango.json file
            const nangoJsonPath = join(templatesPath, name, '.nango/nango.json');
            const schemaJsonPath = join(templatesPath, name, '.nango/schema.json');

            try {
                const nangoJsonContent = await readFile(nangoJsonPath, 'utf8');
                const nangoData = JSON.parse(nangoJsonContent) as NangoYamlParsedIntegration[];
                const schemaJsonContent = await readFile(schemaJsonPath, 'utf8');
                const jsonSchema = JSON.parse(schemaJsonContent);

                aggregatedFlows.push({ ...nangoData[0]!, jsonSchema, sdkVersion: nangoVersion });

                console.log(`  ✓ done`);
            } catch (fileError) {
                console.error(`   ${chalk.red('err')} Could not read nango.json: ${errorToString(fileError)}`);
                process.exit(1);
            }
        } catch (error) {
            console.error(`   ${chalk.red('err')} ${errorToString(error)}`);
            process.exit(1);
        }
    }

    console.log(chalk.gray('─'.repeat(20)));
    console.log();
    console.log(`Total flows aggregated: ${aggregatedFlows.length}`);

    // Write the aggregated flows to flows.zero.json
    const outputPath = join(root, 'internal/flows.zero.json');
    await writeFile(outputPath, JSON.stringify(aggregatedFlows, null, 4), 'utf8');

    execSync('prettier -w internal/flows.zero.json', {
        stdio: 'pipe',
        cwd: root
    });
    console.log(`Output written to: ${outputPath}`);
}

// Run the script
main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
