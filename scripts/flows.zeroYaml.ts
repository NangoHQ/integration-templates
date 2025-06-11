#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import type { NangoYamlParsedIntegration } from '@nangohq/types';
import chalk from 'chalk';

async function main(): Promise<void> {
    console.log('Building all templates flows');

    // Get all integration folders
    const templatesPath = join(import.meta.dirname, '..', 'templates');
    const templatesFolders = await readdir(templatesPath, { withFileTypes: true });

    const aggregatedFlows: (NangoYamlParsedIntegration & { jsonSchema: any })[] = [];

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

            // Run the compile command
            const command = `npm run cli -- ${name} compile`;
            console.log(`  Running: ${command}`);

            execSync(command, {
                stdio: 'pipe',
                cwd: process.cwd()
            });

            // Read the generated nango.json file
            const nangoJsonPath = join(templatesPath, '.nango/nango.json');
            const schemaJsonPath = join(templatesPath, '.nango/schema.json');

            try {
                const nangoJsonContent = await readFile(nangoJsonPath, 'utf8');
                const nangoData = JSON.parse(nangoJsonContent) as NangoYamlParsedIntegration[];
                const schemaJsonContent = await readFile(schemaJsonPath, 'utf8');
                const jsonSchema = JSON.parse(schemaJsonContent) as any;

                aggregatedFlows.push({ ...nangoData[0]!, jsonSchema });

                console.log(`  ✓ done`);
            } catch (fileError) {
                console.error(`   ${chalk.red('err')} Could not read nango.json: ${(fileError as Error).message}`);
                process.exit(1);
            }
        } catch (error) {
            console.error(`   ${chalk.red('err')} ${(error as Error).message}`);
            process.exit(1);
        }
    }

    console.log(chalk.gray('─'.repeat(20)));
    console.log();
    console.log(`Total flows aggregated: ${aggregatedFlows.length}`);

    // Write the aggregated flows to flows.zero.json
    const outputPath = join(templatesPath, '..', './flows.zero.json');
    await writeFile(outputPath, JSON.stringify(aggregatedFlows, null, 2), 'utf8');

    console.log(`Output written to: ${outputPath}`);
}

// Run the script
main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
