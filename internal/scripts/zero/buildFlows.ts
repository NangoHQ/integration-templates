#!/usr/bin/env node

/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
/* eslint-disable no-console */
/* eslint-disable @nangohq/custom-integrations-linting/no-console-log */
/* eslint-disable @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed */

import { readdir, readFile, writeFile, lstat, stat, realpath } from 'fs/promises';
import { join, basename } from 'path';
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
        let symLinkTargetName: string | null = null;
        const folderPath = join(templatesPath, folder.name);
        if (!(folder.isDirectory() || folder.isSymbolicLink())) continue;
        if (folder.isSymbolicLink()) {
            try {
                const target = await realpath(folderPath);
                symLinkTargetName = basename(target) || null;
                const targetStat = await stat(target);
                if (!targetStat.isDirectory()) continue; // skip symlinks that don't point to dirs
            } catch {
                console.log(`   ${chalk.red('err')} Broken symlink: ${folderPath}`);
                continue; // broken symlink; skip
            }
        }

        if (folder.name === '.nango' || folder.name === 'build' || folder.name === 'node_modules') {
            continue;
        }

        const name = folder.name;
        try {
            console.log(`- Processing ${chalk.blue(name)}...`);

            // if the folder doesn't not have a .nango folder, skip it
            const nangoFolderPath = join(folderPath, '.nango');
            const nangoFolderExists = await lstat(nangoFolderPath)
                .then(() => true)
                .catch(() => false);

            if (!nangoFolderExists) {
                console.log(`   ${chalk.yellow('warn')} No .nango folder found, skipping ${name}`);
                continue;
            }

            // Only compile if --rebuild flag is passed
            if (process.argv.includes('--rebuild-all')) {
                // Run the compile command and re-generate docs
                const command = `npm run cli -- ${name} compile && npm run cli -- ${name} generate:docs --integration-templates`;
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

                aggregatedFlows.push({ ...nangoData[0]!, providerConfigKey: folder.name, jsonSchema, sdkVersion: nangoVersion, symLinkTargetName });

                console.log(`  ✓ done`);
            } catch (fileError) {
                const errorMessage = errorToString(fileError);
                const formattedError = `   ${chalk.red('err')} Could not read nango.json: ${errorMessage}`;

                // Write to both console and stderr directly
                console.error(formattedError);
                process.stderr.write(`\n${formattedError}\n`);

                // Ensure output is flushed before exiting
                process.stdout.write('');
                process.stderr.write('');
                await new Promise((resolve) => setTimeout(resolve, 100));

                process.exit(1);
            }
        } catch (error) {
            const errorMessage = errorToString(error);
            const formattedError = `   ${chalk.red('err')} ${errorMessage}`;

            // Write to both console and stderr directly
            console.log(errorMessage);
            console.error(formattedError);
            process.stderr.write(`\n${formattedError}\n`);

            // Additional explicit error logging for GitHub Actions
            console.error('=== ERROR DETAILS ===');
            console.error('Error type:', typeof error);
            console.error('Error message:', errorMessage);
            if (error instanceof Error) {
                console.error('Stack trace:', error.stack);
            }
            console.error('====================');

            // Ensure output is flushed before exiting
            process.stdout.write('');
            process.stderr.write('');
            await new Promise((resolve) => setTimeout(resolve, 100));

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
main().catch(async (error) => {
    const errorMessage = `💥 Script failed: ${error}`;

    // Write to both console and stderr directly
    console.error(errorMessage);
    process.stderr.write(`\n${errorMessage}\n`);

    // Ensure output is flushed before exiting
    process.stdout.write('');
    process.stderr.write('');
    await new Promise((resolve) => setTimeout(resolve, 100));

    process.exit(1);
});
