import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolves symlinks in the integrations directory
 * Iterates over every directory and resolves any symlinks found
 */
async function resolveAliases(): Promise<void> {
    const integrationsPath = path.join(process.cwd(), 'integrations');

    try {
        // Check if integrations directory exists
        if (!fs.existsSync(integrationsPath)) {
            console.error('Integrations directory not found');
            return;
        }

        // Read all items in the integrations directory
        const items = fs.readdirSync(integrationsPath);

        for (const item of items) {
            const itemPath = path.join(integrationsPath, item);
            const stats = fs.statSync(itemPath);

            // Check if it's a directory or symlink
            if (stats.isDirectory() || stats.isSymbolicLink()) {
                try {
                    // Get the real path (resolves symlinks)
                    const realPath = fs.realpathSync(itemPath);
                    // original path is the name of the integration which is the last segment
                    const originalIntegrationName = path.basename(realPath);

                    // If the real path is different from the item path, it's a symlink
                    if (realPath !== itemPath) {
                        console.log(`Resolving symlink: ${item} -> ${realPath}`);

                        // Remove the symlink
                        fs.unlinkSync(itemPath);

                        // Copy the real directory to replace the symlink
                        copyDirectoryRecursive(realPath, itemPath);

                        // change the index.ts file paths to point to the updated integration name
                        const indexPath = path.join(process.cwd() + '/integrations', `${item}/index.ts`);
                        let indexContent = fs.readFileSync(indexPath, 'utf-8');

                        // replace all occurrences of the original integration name with the new one
                        const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const escapedOriginal = escapeRegExp(originalIntegrationName);

                        // 3) Build a precise pattern:
                        //    - inside quotes (single/double/backtick)
                        //    - starts with "./"
                        //    - exactly the original name
                        //    - followed by a "/" (so we don't hit "./airtabled")
                        const regex = new RegExp(`(['"\\\`])\\./${escapedOriginal}(?=/)`, 'g');

                        // 4) Replace with the symlink directory name (item), preserve the quote with $1
                        indexContent = indexContent.replace(regex, `$1./${item}`);
                        fs.writeFileSync(indexPath, indexContent, 'utf-8');

                        console.log(`✓ Resolved symlink for: ${item}`);
                    } else {
                        console.log(`✓ No symlink found for: ${item}`);
                    }
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
