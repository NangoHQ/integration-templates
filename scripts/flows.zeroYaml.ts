#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

async function main(): Promise<void> {
    console.log('🚀 Starting flow aggregation process...');

    // Change to project root directory
    process.chdir('..');

    // Get all integration folders
    const templatesPath = './templates';
    const templatesFolders = await readdir(templatesPath, { withFileTypes: true });

    console.log(`📁 Found ${templatesFolders.length} templates folders`);

    const aggregatedFlows: any[] = [];

    // Process each folder
    for (const folder of templatesFolders) {
        try {
            console.log(`⚙️  Processing ${folder}...`);

            // Run the compile command
            const command = `npm run cli -- ${folder} compile`;
            console.log(`   Running: ${command}`);

            execSync(command, {
                stdio: 'pipe', // Suppress output unless there's an error
                cwd: process.cwd()
            });

            // Read the generated nango.json file
            const nangoJsonPath = join('./templates/.nango/nango.json');

            try {
                const nangoJsonContent = await readFile(nangoJsonPath, 'utf8');
                const nangoData = JSON.parse(nangoJsonContent);

                // Add the data to our aggregated flows
                if (Array.isArray(nangoData)) {
                    aggregatedFlows.push(...nangoData);
                } else {
                    aggregatedFlows.push(nangoData);
                }

                console.log(`   ✓ done`);
            } catch (fileError) {
                console.error(`   ${chalk.red('err')} Could not read nango.json: ${(fileError as Error).message}`);
                process.exit(1);
            }
        } catch (error) {
            console.error(`   ${chalk.red('err')} ${(error as Error).message}`);
            process.exit(1);
        }
    }

    // Write the aggregated flows to flows.zero.json
    const outputPath = './flows.zero.json';
    await writeFile(outputPath, JSON.stringify(aggregatedFlows, null, 2), 'utf8');

    console.log('\n📊 Summary:');
    console.log(`   📄 Total flows aggregated: ${aggregatedFlows.length}`);
    console.log(`   💾 Output written to: ${outputPath}`);

    console.log('\n🎉 Flow aggregation completed!');
}

// Run the script
main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
