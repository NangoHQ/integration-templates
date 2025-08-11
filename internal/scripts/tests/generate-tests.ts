import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const integrationPath = process.cwd();

// Since we've moved to inline configuration, this script needs to be updated
// to work with the new approach. For now, we'll log that this script
// needs to be refactored for the new inline configuration approach.

console.log('⚠️  This script needs to be updated for the new inline configuration approach.');
console.log('The old nango.yaml approach has been replaced with inline TypeScript configuration.');
console.log('Test generation should now be based on the actual sync and action files.');

// TODO: Refactor this script to:
// 1. Scan for sync and action files in the integration
// 2. Parse the inline configuration from createSync() and createAction() calls
// 3. Generate tests based on the actual configuration

function generateSyncTest(integration: string, syncName: string, modelName: string | string[]) {
    const data: {
        integration: string;
        syncName: string;
        modelName: string | string[];
    } = {
        integration,
        syncName,
        modelName
    };

    console.log(`Data: ${JSON.stringify(data, null, 2)}`);

    const templatePath = path.resolve(__dirname, 'sync-template.ejs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');

    const result = ejs.render(templateSource, data);

    if (!fs.existsSync(path.resolve(integrationPath, `${integration}/tests`))) {
        fs.mkdirSync(path.resolve(integrationPath, `${integration}/tests`), { recursive: true });
    }
    const outputPath = path.resolve(integrationPath, `${integration}/tests/${data['integration']}-${data['syncName']}.test.ts`);
    fs.writeFileSync(outputPath, result);

    console.log(`Test file 'tests/${data['integration']}-${data['syncName']}.test.ts' created successfully.`);
}

function generateActionTest(integration: string, actionName: string, output: string | null) {
    const data: {
        integration: string;
        actionName: string;
        output: string | null;
    } = {
        integration,
        actionName,
        output
    };

    console.log(`Data: ${JSON.stringify(data, null, 2)}`);

    const templatePath = path.resolve(__dirname, 'action-template.ejs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');

    const result = ejs.render(templateSource, data);

    if (!fs.existsSync(path.resolve(integrationPath, `${integration}/tests`))) {
        fs.mkdirSync(path.resolve(integrationPath, `${integration}/tests`), { recursive: true });
    }

    const outputPath = path.resolve(integrationPath, `${integration}/tests/${data['integration']}-${data['actionName']}.test.ts`);
    fs.writeFileSync(outputPath, result);

    console.log(`Test file 'tests/${data['integration']}-${data['actionName']}.test.ts' created successfully.`);
}

// Placeholder for future implementation
console.log('This script will need to be completely refactored for the new inline configuration approach.');
