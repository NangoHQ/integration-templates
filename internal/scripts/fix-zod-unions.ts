#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..', '..');

async function fixZodUnions(): Promise<void> {
    console.log('Fixing Zod union types in integration models...');

    const integrationsPath = join(root, 'integrations');
    const integrationFolders = await readdir(integrationsPath, { withFileTypes: true });

    let totalFixed = 0;

    for (const folder of integrationFolders) {
        if (!folder.isDirectory()) {
            continue;
        }
        if (folder.name === '.nango' || folder.name === 'build' || folder.name === 'node_modules') {
            continue;
        }

        const name = folder.name;
        const modelsPath = join(integrationsPath, name, 'models.ts');

        try {
            const content = await readFile(modelsPath, 'utf8');
            let modified = false;
            let newContent = content;

            // Fix z.union([z.string(), z.null()]) -> z.string().nullable()
            const stringNullPattern = /z\.union\(\[z\.string\(\), z\.null\(\)\]\)/g;
            if (stringNullPattern.test(newContent)) {
                newContent = newContent.replace(stringNullPattern, 'z.string().nullable()');
                modified = true;
            }

            // Fix z.union([z.number(), z.null()]) -> z.number().nullable()
            const numberNullPattern = /z\.union\(\[z\.number\(\), z\.null\(\)\]\)/g;
            if (numberNullPattern.test(newContent)) {
                newContent = newContent.replace(numberNullPattern, 'z.number().nullable()');
                modified = true;
            }

            // Fix z.union([z.boolean(), z.null()]) -> z.boolean().nullable()
            const booleanNullPattern = /z\.union\(\[z\.boolean\(\), z\.null\(\)\]\)/g;
            if (booleanNullPattern.test(newContent)) {
                newContent = newContent.replace(booleanNullPattern, 'z.boolean().nullable()');
                modified = true;
            }

            if (modified) {
                await writeFile(modelsPath, newContent, 'utf8');
                console.log(`  ✓ Fixed ${name}`);
                totalFixed++;
            }
        } catch (error) {
            // File doesn't exist or can't be read, skip
            continue;
        }
    }

    console.log(`\nFixed ${totalFixed} integration models`);
}

fixZodUnions().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
