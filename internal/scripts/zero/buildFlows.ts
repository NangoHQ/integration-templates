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

    // Log environment info for debugging
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
    console.log(`Working directory: ${process.cwd()}`);

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
    const processedIntegrations: string[] = [];
    const failedIntegrations: string[] = [];

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

                try {
                    // Add additional environment variables that might help with the Zod processing
                    const env = {
                        ...process.env,
                        FORCE_COLOR: '1',
                        NODE_OPTIONS: '--max-old-space-size=4096',
                        TSX_NODE_PROJECT: join(root, 'tsconfig.json')
                    };

                    execSync(command, {
                        stdio: 'inherit',
                        cwd: root,
                        env,
                        timeout: 300000 // 5 minute timeout per integration
                    });
                } catch (compileError) {
                    console.error(`   ${chalk.red('err')} Compilation failed for ${name}: ${errorToString(compileError)}`);
                    console.error(`   ${chalk.red('err')} This integration will be skipped. Continuing with others...`);
                    failedIntegrations.push(name);
                    continue; // Skip this integration and continue with others
                }

                // also rebuild the docs
                const docsCommand = `npm run cli -- ${name} generate:docs --integration-templates`;
                console.log(`  Running: ${docsCommand}`);

                try {
                    const env = {
                        ...process.env,
                        FORCE_COLOR: '1',
                        NODE_OPTIONS: '--max-old-space-size=4096',
                        TSX_NODE_PROJECT: join(root, 'tsconfig.json')
                    };

                    execSync(docsCommand, {
                        stdio: 'inherit',
                        cwd: root,
                        env,
                        timeout: 120000 // 2 minute timeout for docs
                    });
                } catch (docsError) {
                    console.error(`   ${chalk.red('err')} Docs generation failed for ${name}: ${errorToString(docsError)}`);
                    console.error(`   ${chalk.red('err')} This integration will be skipped. Continuing with others...`);
                    failedIntegrations.push(name);
                    continue; // Skip this integration and continue with others
                }
            }

            // Read the generated nango.json file
            const nangoJsonPath = join(templatesPath, name, '.nango/nango.json');
            const schemaJsonPath = join(templatesPath, name, '.nango/schema.json');

            try {
                // Check if .nango directory exists
                try {
                    await readFile(nangoJsonPath, 'utf8');
                } catch (fileNotFoundError) {
                    console.log(
                        `   ${chalk.yellow('warn')} Skipping ${name} - .nango directory or nango.json not found. This usually means the compilation step failed.`
                    );
                    failedIntegrations.push(name);
                    continue; // Skip this integration and continue with others
                }

                const nangoJsonContent = await readFile(nangoJsonPath, 'utf8');
                const nangoData = JSON.parse(nangoJsonContent) as NangoYamlParsedIntegration[];

                if (!nangoData || nangoData.length === 0) {
                    console.log(`   ${chalk.yellow('warn')} Skipping ${name} - No integration data found in nango.json`);
                    failedIntegrations.push(name);
                    continue; // Skip this integration and continue with others
                }

                const schemaJsonContent = await readFile(schemaJsonPath, 'utf8');
                const jsonSchema = JSON.parse(schemaJsonContent);

                aggregatedFlows.push({ ...nangoData[0]!, jsonSchema, sdkVersion: nangoVersion });
                processedIntegrations.push(name);

                console.log(`  ✓ done`);
            } catch (fileError) {
                console.error(`   ${chalk.red('err')} Could not read generated files for ${name}: ${errorToString(fileError)}`);
                console.error(`   ${chalk.red('err')} This might indicate a compilation failure. Check the logs above.`);
                console.log(`   ${chalk.yellow('warn')} Skipping ${name} and continuing with others...`);
                failedIntegrations.push(name);
                continue; // Skip this integration and continue with others
            }
        } catch (error) {
            console.error(`   ${chalk.red('err')} ${errorToString(error)}`);
            process.exit(1);
        }
    }

    console.log(chalk.gray('─'.repeat(20)));
    console.log();
    console.log(`Total flows aggregated: ${aggregatedFlows.length}`);

    // Print summary
    if (processedIntegrations.length > 0) {
        console.log(chalk.green(`✓ Successfully processed ${processedIntegrations.length} integrations: ${processedIntegrations.join(', ')}`));
    }

    if (failedIntegrations.length > 0) {
        console.log(chalk.red(`✗ Failed to process ${failedIntegrations.length} integrations: ${failedIntegrations.join(', ')}`));
    }

    if (aggregatedFlows.length === 0) {
        console.error(chalk.red('No flows were successfully aggregated. Check the logs above for compilation errors.'));
        process.exit(1);
    }

    // Write the aggregated flows to flows.zero.json
    const outputPath = join(root, 'internal/flows.zero.json');
    await writeFile(outputPath, JSON.stringify(aggregatedFlows, null, 4), 'utf8');

    try {
        execSync('prettier -w internal/flows.zero.json', {
            stdio: 'pipe',
            cwd: root
        });
    } catch (prettierError) {
        console.warn(chalk.yellow('Warning: Prettier formatting failed, but the file was written successfully.'));
    }

    console.log(`Output written to: ${outputPath}`);
    console.log(chalk.green(`✓ Successfully processed ${aggregatedFlows.length} integrations`));
}

// Run the script
main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
