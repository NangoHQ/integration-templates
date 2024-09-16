import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { exec } from 'node:child_process';

const rootDir = './integrations';

let output = {
    integrations: {}
};

// Mapping for directory names to integration names
const directoryToIntegrationMapping = {
    'microsoft-active-directory': 'microsoft-teams',
    'google-workspace': 'google'
};

fs.readdirSync(rootDir).forEach((serviceDir) => {
    const servicePath = path.join(rootDir, serviceDir);
    if (fs.statSync(servicePath).isDirectory()) {
        const nangoFilePath = path.join(servicePath, 'nango.yaml');
        if (fs.existsSync(nangoFilePath)) {
            const nangoContent = fs.readFileSync(nangoFilePath, 'utf8');
            const nangoData = yaml.load(nangoContent);

            const integrationName = directoryToIntegrationMapping[serviceDir] || serviceDir;

            if (nangoData && nangoData.integrations) {
                output.integrations = {
                    ...output.integrations,
                    [integrationName]: {
                        ...output.integrations[integrationName],
                        ...nangoData.integrations[integrationName]
                    }
                };
            }

            if (nangoData && nangoData.models) {
                if (!output.integrations[integrationName]) {
                    output.integrations[integrationName] = {};
                }
                output.integrations[integrationName].models = nangoData.models;

                for (const model in nangoData.models) {
                    if (nangoData.models[model].__extends) {
                        const extendedModel = nangoData.models[model].__extends.split(',');
                        for (const modelToExtend of extendedModel) {
                            const fullModel = nangoData.models[modelToExtend];
                            nangoData.models[model] = { ...fullModel, ...nangoData.models[model] };
                        }

                        // remove extends key
                        delete nangoData.models[model].__extends;
                    }
                }
                output.integrations[integrationName].models = {
                    ...output.integrations[integrationName].models,
                    ...nangoData.models
                };
            }

            if (directoryToIntegrationMapping[serviceDir]) {
                output.integrations[integrationName].rawName = serviceDir;
            }
        }
    }
});

const filePath = path.join('./', 'flows.yaml');
fs.writeFileSync(filePath, yaml.dump(output));
exec(`npx prettier ${filePath} -w`, (error) => {
    if (error) {
        console.error('An error occured during prettier', error);
        process.exit(1);
    }
});
