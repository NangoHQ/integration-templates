import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolves symlinks in the integrations directory
 * Iterates over every directory and resolves any symlinks found
 * Adds entries to the top-level integrations/index.ts file
 */
async function resolveAliases(): Promise<void> {
    const integrationsPath = path.join(process.cwd(), 'integrations');
    const topLevelIndexPath = path.join(integrationsPath, 'index.ts');

    try {
        // Check if integrations directory exists
        if (!fs.existsSync(integrationsPath)) {
            console.error('Integrations directory not found');
            return;
        }

        // Check if top-level index.ts exists
        if (!fs.existsSync(topLevelIndexPath)) {
            console.error('Top-level integrations/index.ts not found');
            return;
        }

        // Read all items in the integrations directory
        const items = fs.readdirSync(integrationsPath);

        for (const item of items) {
            const itemPath = path.join(integrationsPath, item);
            const stats = fs.lstatSync(itemPath);

            // Check if it's a symlink
            if (stats.isSymbolicLink()) {
                try {
                    // Get the real path (resolves symlinks)
                    const realPath = fs.realpathSync(itemPath);

                    console.log(`Resolving symlink: ${item} -> ${realPath}`);

                    // Remove the symlink
                    fs.unlinkSync(itemPath);

                    // Copy the real directory to replace the symlink
                    copyDirectoryRecursive(realPath, itemPath);

                    // Generate and add entries to top-level index.ts
                    const imports = generateImportsForIntegration(item, itemPath);
                    if (imports.length > 0) {
                        addImportsToTopLevelIndex(topLevelIndexPath, item, imports);
                    }

                    console.log(`✓ Resolved symlink for: ${item}`);
                } catch (error) {
                    console.error(`Error processing ${item}:`, error);
                }
            }
        }

        console.log('Symlink resolution completed');
    } catch (error) {
        console.error('Error resolving aliases:', error);
    }
}

/**
 * Generates import statements for an integration based on its syncs and actions
 */
function generateImportsForIntegration(integrationName: string, integrationPath: string): string[] {
    const imports: string[] = [];

    // Check for syncs directory
    const syncsPath = path.join(integrationPath, 'syncs');
    if (fs.existsSync(syncsPath)) {
        const syncFiles = fs.readdirSync(syncsPath).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
        for (const file of syncFiles) {
            const baseName = file.replace('.ts', '');
            imports.push(`import './${integrationName}/syncs/${baseName}.js';`);
        }
    }

    // Check for actions directory
    const actionsPath = path.join(integrationPath, 'actions');
    if (fs.existsSync(actionsPath)) {
        const actionFiles = fs.readdirSync(actionsPath).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
        for (const file of actionFiles) {
            const baseName = file.replace('.ts', '');
            imports.push(`import './${integrationName}/actions/${baseName}.js';`);
        }
    }

    return imports;
}

/**
 * Adds import statements to the top-level index.ts file
 */
function addImportsToTopLevelIndex(indexPath: string, integrationName: string, imports: string[]): void {
    let content = fs.readFileSync(indexPath, 'utf-8');

    // Build the new section to add
    const newSection = `\n// -- Integration: ${integrationName}\n${imports.join('\n')}\n`;

    // Append to the end of the file
    content = content.trimEnd() + newSection;

    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log(`  Added ${imports.length} imports to index.ts for ${integrationName}`);
}

/**
 * Recursively copies a directory and its contents
 */
function copyDirectoryRecursive(source: string, destination: string): void {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    // Read all items in the source directory
    const items = fs.readdirSync(source);

    for (const item of items) {
        const sourcePath = path.join(source, item);
        const destPath = path.join(destination, item);
        const stats = fs.statSync(sourcePath);

        if (stats.isDirectory()) {
            // Recursively copy subdirectories
            copyDirectoryRecursive(sourcePath, destPath);
        } else {
            // Copy files
            fs.copyFileSync(sourcePath, destPath);
        }
    }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    resolveAliases().catch(console.error);
}

export { resolveAliases };
