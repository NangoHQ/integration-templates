import { promises as fs } from 'fs';
import yaml from 'js-yaml';

type UseCase = {
    method: string;
    path: string;
    description: string;
    group: string;
    script: string;
};

const maybeIntegrations = await fs.readdir('integrations', { withFileTypes: true });
const integrations = maybeIntegrations.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);

const exportData: Record<string, UseCase[]> = {};

for (const integration of integrations) {
    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
    const yamlConfig = yaml.load(await fs.readFile(`integrations/${integration}/nango.yaml`, 'utf8')) as any;
    const config = yamlConfig.integrations[integration] || yamlConfig.integrations['${PWD}'];

    exportData[integration] = readUseCases(config.syncs, integration).concat(readUseCases(config.actions, integration));
}

await fs.writeFile('use-cases.json', JSON.stringify(exportData, null, 2), 'utf-8');

function readUseCases(syncOrAction: any, integration: string) {
    const endpoints: UseCase[] = [];
    if (syncOrAction) {
        for (const [key, item] of Object.entries<any>(syncOrAction)) {
            const syncEndpoints = Array.isArray(item.endpoint) ? item.endpoint : [item.endpoint];
            for (const endpoint of syncEndpoints) {
                endpoints.push({
                    method: endpoint.method,
                    path: endpoint.path,
                    description: item.description?.trim(),
                    group: endpoint.group,
                    script: `${integration}/actions/${key}`
                });
            }
        }
    }

    return endpoints;
}
