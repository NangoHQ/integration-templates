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
    const yamlConfig = yaml.load(await fs.readFile(`integrations/${integration}/nango.yaml`, 'utf8')) as any;
    const config = yamlConfig.integrations[integration] || yamlConfig.integrations['${PWD}'];

    const endpoints: UseCase[] = [];

    if (config.syncs) {
        (Object.entries(config.syncs) as [string, any]).map(([key, sync]) => {
            endpoints.push({
                method: sync.endpoint.method,
                path: sync.endpoint.path,
                description: sync.description,
                group: sync.endpoint.group,
                script: `${integration}/syncs/${key}`
            });
        });
    }

    if (config.actions) {
        (Object.entries(config.actions) as [string, any]).map(([key, action]) => {
            endpoints.push({
                method: action.endpoint.method,
                path: action.endpoint.path,
                description: action.description,
                group: action.endpoint.group,
                script: `${integration}/actions/${key}`
            });
        });
    }

    exportData[integration] = endpoints;
}

await fs.writeFile('use-cases.json', JSON.stringify(exportData, null, 2), 'utf-8');
