#!/usr/bin/env node

/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
/* eslint-disable no-console */
/* eslint-disable @nangohq/custom-integrations-linting/no-console-log */
/* eslint-disable @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed */

import { readFile, writeFile, readdir, readlink, lstat, mkdir, copyFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
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

/**
 * Discovers the symlink mappings under `integrations/`, returning symlink name -> target name.
 *
 * `nango compile` skips symlinked directories entirely, so this is the only source of truth for
 * which providers are aliases. Discovering them here means adding a symlink is all that is required
 * for the alias to show up in flows.zero.json; no manual registration.
 *
 * Chains are resolved to their final non-symlink target (e.g. `stripe-app -> stripe-app -> stripe`
 * becomes `stripe-app -> stripe`) so the alias always points at an integration that was compiled.
 */
async function discoverSymlinks(integrationsPath: string): Promise<Record<string, string>> {
    const entries = await readdir(integrationsPath, { withFileTypes: true });
    const directTargets = new Map<string, string>();

    for (const entry of entries) {
        if (!entry.isSymbolicLink()) {
            continue;
        }

        const target = (await readlink(join(integrationsPath, entry.name))).replace(/\/+$/, '');

        if (target.includes('/')) {
            throw new Error(
                `Symlink integrations/${entry.name} points outside of integrations/ (${target}); only relative names within integrations/ are supported`
            );
        }

        directTargets.set(entry.name, target);
    }

    const symlinks: Record<string, string> = {};

    for (const [name, directTarget] of directTargets) {
        const seen = new Set<string>([name]);
        let target = directTarget;

        while (directTargets.has(target)) {
            if (seen.has(target)) {
                throw new Error(`Symlink cycle detected: ${[...seen, target].join(' -> ')}`);
            }

            seen.add(target);
            target = directTargets.get(target) as string;
        }

        symlinks[name] = target;
    }

    return symlinks;
}

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

    // Step 2: Read the generated nango.json from integrations/.nango/
    const nangoJsonPath = join(integrationsPath, '.nango', 'nango.json');

    let nangoData: NangoYamlParsedIntegration[];

    try {
        const nangoJsonContent = await readFile(nangoJsonPath, 'utf8');
        nangoData = JSON.parse(nangoJsonContent) as NangoYamlParsedIntegration[];
        console.log(`  Read nango.json: ${chalk.green(nangoData.length)} integrations found`);
    } catch (error) {
        console.error(`${chalk.red('err')} Could not read nango.json: ${errorToString(error)}`);
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

    // Step 3: Transform to ZeroFlow format
    const aggregatedFlows: ZeroFlow[] = nangoData.map((integration) => ({
        ...integration,
        sdkVersion: nangoVersion,
        symLinkTargetName: null
    }));

    // Step 4: Add symlink entries
    // For each symlink, create an entry that references its target
    console.log();
    console.log('Adding symlink entries...');
    const integrationsByKey = new Map(aggregatedFlows.map((flow) => [flow.providerConfigKey, flow]));

    const symlinks = await discoverSymlinks(integrationsPath);
    const unresolved: string[] = [];

    for (const [symlinkName, targetName] of Object.entries(symlinks)) {
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
            unresolved.push(`${symlinkName} -> ${targetName}`);
        }
    }

    // Fail loudly rather than silently dropping providers from flows.zero.json. A symlink whose
    // target was not compiled means the target is broken or no longer exists.
    if (unresolved.length > 0) {
        console.error();
        console.error(`${chalk.red('err')} ${unresolved.length} symlink(s) could not be resolved to a compiled integration:`);
        for (const entry of unresolved) {
            console.error(`  ${chalk.red('x')} ${entry}`);
        }
        console.error();
        console.error(`Their targets are missing from the compiled output. Check that each symlink points`);
        console.error(`at an existing integration directory under integrations/.`);
        process.exit(1);
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
