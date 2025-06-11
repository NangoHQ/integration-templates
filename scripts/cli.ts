#!/usr/bin/env tsx
/* eslint-disable no-console */
/* eslint-disable @nangohq/custom-integrations-linting/no-console-log */
/* eslint-disable @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';

const INTEGRATIONS_DIR = 'templates';
const INDEX_FILE = 'index.ts';

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: npx scripts/cli.ts <name> <dryrun|compile> [additional args...]');
        process.exit(1);
    }

    const [integrationName, command, ...additionalArgs] = args;

    if (!integrationName || !command) {
        console.error('Usage: npx scripts/cli.ts <name> <dryrun|compile> [additional args...]');
        process.exit(1);
    }

    // Change to integrations_v2 directory
    const integrationsPath = path.resolve(INTEGRATIONS_DIR);
    const indexPath = path.join(integrationsPath, INDEX_FILE);
    const integrationFile = path.join(integrationsPath, `${integrationName}.ts`);
    const integrationDir = path.join(integrationsPath, integrationName);

    try {
        // Validate that integration exists
        await validateIntegration({ integrationDir, integrationFile, integrationName });

        // Copy integration file to index.ts
        await swapIndexFile({ integrationFile, indexPath });

        // Execute nango command
        await executeNangoCommand({ command, additionalArgs, workingDir: integrationsPath });
    } catch (err) {
        console.error(chalk.red('err'), errorToString(err));
        process.exitCode = 1;
    } finally {
        // Always restore the original index.ts
        await restoreIndexFile({ indexPath });
    }
}

async function validateIntegration({
    integrationDir,
    integrationFile,
    integrationName
}: {
    integrationDir: string;
    integrationFile: string;
    integrationName: string;
}) {
    try {
        // Check if integration directory exists
        const dirStats = await fs.stat(integrationDir);
        if (!dirStats.isDirectory()) {
            throw new Error(`Integration directory '${integrationName}' is not a valid directory`);
        }
    } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            throw new Error(`Integration '${integrationName}' not found in ${INTEGRATIONS_DIR}`);
        }
        throw err;
    }

    try {
        // Check if integration .ts file exists
        const fileStats = await fs.stat(integrationFile);
        if (!fileStats.isFile()) {
            throw new Error(`Integration file '${integrationName}.ts' is not a valid file`);
        }
    } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            throw new Error(`Integration file '${integrationName}.ts' not found`);
        }
        throw err;
    }
}

async function swapIndexFile({ integrationFile, indexPath }: { integrationFile: string; indexPath: string }) {
    try {
        await fs.copyFile(integrationFile, indexPath);
        console.log('✓ Swapped index.ts with integration file');
    } catch (err) {
        throw new Error(`Failed to swap index.ts: ${errorToString(err)}`);
    }
}

async function executeNangoCommand({ command, additionalArgs, workingDir }: { command: string; additionalArgs: string[]; workingDir: string }) {
    const validCommands = ['dryrun', 'compile'];

    if (!validCommands.includes(command)) {
        throw new Error(`Invalid command '${command}'. Valid commands: ${validCommands.join(', ')}`);
    }

    const nangoArgs = [command, ...additionalArgs];
    console.log();
    console.log(`Executing:`, chalk.blue(`npx nango ${nangoArgs.join(' ')}`));
    console.log(chalk.gray('─'.repeat(20)));

    return new Promise<void>((resolve, reject) => {
        const child = spawn('npx', ['nango', ...nangoArgs], {
            cwd: workingDir,
            env: {
                ...process.env,
                NANGO_CLI_UPGRADE_MODE: 'ignore'
            },
            stdio: 'inherit' // This streams output directly to parent's stdout/stderr
        });

        child.on('close', (code) => {
            console.log(chalk.gray('─'.repeat(20)));
            console.log();
            if (code === 0) {
                console.log('✓ Command completed successfully');
                resolve();
            } else {
                reject(new Error(`Nango command failed with exit code ${code}`));
            }
        });

        child.on('error', (err) => {
            console.log(chalk.gray('─'.repeat(20)));
            reject(new Error(`Failed to start nango command: ${errorToString(err)}`));
        });
    });
}

async function restoreIndexFile({ indexPath }: { indexPath: string }) {
    try {
        // Restore from backup
        await fs.writeFile(indexPath, '// Use npm run cli -- <command> <args>');
        console.log('✓ Restored original index.ts');
    } catch (err) {
        console.warn('⚠️  Failed to restore index.ts:', errorToString(err));
    }
}

// Handle process termination to ensure cleanup
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Process interrupted. Cleaning up...');
    await restoreIndexFile({
        indexPath: path.join(INTEGRATIONS_DIR, INDEX_FILE)
    });
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Process terminated. Cleaning up...');
    await restoreIndexFile({
        indexPath: path.join(INTEGRATIONS_DIR, INDEX_FILE)
    });
    process.exit(0);
});
function errorToString(err: unknown) {
    return err instanceof Error ? err.message : String(err);
}

main().catch((err) => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
