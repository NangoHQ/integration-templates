/* eslint-disable @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed */
/* eslint-disable no-console */
import { promises as fs } from 'fs';
import { load as loadYaml } from 'js-yaml';

const maybeIntegrations = await fs.readdir('integrations', { withFileTypes: true });
const integrations = maybeIntegrations.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);

for (const integration of integrations) {
    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
    const yamlConfig = loadYaml(await fs.readFile(`integrations/${integration}/nango.yaml`, 'utf8')) as any;

    const config = yamlConfig.integrations[integration] || yamlConfig.integrations['${PWD}'];
    const models = yamlConfig.models || {};

    if (config.syncs) {
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const syncPromises = (Object.entries(config.syncs) as [string, any]).map(async ([key, sync]) => {
            let sections = await readSections(`integrations/${integration}/syncs/${key}.md`);
            try {
                sections = updateReadme(sections, key, `${integration}/syncs/${key}`, 'Sync', sync, models);
                await fs.writeFile(`integrations/${integration}/syncs/${key}.md`, readme(sections));
            } catch (e: any) {
                console.error(`Error updating readme for ${integration} sync ${key}: ${e.message}`);
            }
        });
        await Promise.all(syncPromises);
    }

    if (config.actions) {
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const actionPromises = (Object.entries(config.actions) as [string, any]).map(async ([key, action]) => {
            let sections = await readSections(`integrations/${integration}/actions/${key}.md`);

            try {
                sections = updateReadme(sections, key, `${integration}/actions/${key}`, 'Action', action, models);
                await fs.writeFile(`integrations/${integration}/actions/${key}.md`, readme(sections));
            } catch (e: any) {
                console.error(`Error updating readme for ${integration} action ${key}: ${e.message}`);
            }
        });

        await Promise.all(actionPromises);
    }
}

type MarkdownSections = Record<string, string[]>;

// function to parse markdown into sections
async function readSections(filename: string): Promise<MarkdownSections> {
    let markdown;
    try {
        markdown = await fs.readFile(filename, 'utf8');
    } catch {
        markdown = '';
    }

    const lines = markdown.split('\n');
    const sections: MarkdownSections = {};
    let currentSection = '';

    for (const line of lines) {
        const sectionMatch = line.trim().startsWith('#');
        if (sectionMatch) {
            currentSection = line.trim();
            sections[currentSection] = [];
        } else if (currentSection) {
            sections[currentSection]?.push(line);
        }
    }

    return sections;
}

// update sections to include latest content
function updateReadme(
    sections: MarkdownSections,
    scriptName: string,
    scriptPath: string,
    endpointType: string,
    scriptConfig: any,
    models: any
): MarkdownSections {
    sections = updateTitle(sections, scriptName);
    sections = updateGeneralInfo(sections, scriptPath, endpointType, scriptConfig);
    sections = updateSection(sections, '## Endpoint Reference', [], 2);
    sections = updateRequestEndpoint(sections, scriptConfig);
    sections = updateRequestParams(sections, endpointType);
    sections = updateRequestBody(sections, scriptConfig, endpointType, models);
    sections = updateRequestResponse(sections, scriptConfig, models);
    sections = updateChangelog(sections, scriptPath);
    return sections;
}

// turn sections back into a readme string
function readme(sections: MarkdownSections): string {
    const h1Count = Object.keys(sections).filter((title) => title.startsWith('# ')).length;
    if (h1Count > 1) {
        throw new Error('Too many h1s in readme');
    }

    return Object.entries(sections)
        .map(([key, lines]) => {
            return `${key}\n${lines.join('\n')}`;
        })
        .join('\n');
}

function updateSection(sections: MarkdownSections, title: string, content: string[], index: number) {
    if (Object.keys(sections).length < index + 1) {
        return { ...sections, [title]: content };
    }

    if (Object.keys(sections)[index] !== title) {
        throw new Error(`Expected ${title} as section ${index + 1}`);
    }

    return Object.fromEntries(
        Object.entries(sections).map(([key, lines], sectionIdx) => {
            if (sectionIdx === index) {
                return [title, content];
            }

            return [key, lines];
        })
    );
}

function updateTitle(sections: MarkdownSections, scriptName: string) {
    const prettyName = scriptName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return updateSection(sections, `# ${prettyName}`, [], 0);
}

function updateGeneralInfo(sections: MarkdownSections, scriptPath: string, endpointType: string, scriptConfig: any) {
    const title = '## General Information';
    const content = [
        ``,
        `- **Description:** ${scriptConfig.description}`,
        `- **Version:** ${scriptConfig.version ? scriptConfig.version : '0.0.1'}`,
        `- **Group:** ${scriptConfig.group || 'Others'}`,
        `- **Scopes:**: ${scriptConfig.scopes || '_None_'}`,
        `- **Endpoint Type:** ${endpointType}`,
        `- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/${scriptPath}.ts)`,
        ``
    ];

    return updateSection(sections, title, content, 1);
}

function updateRequestEndpoint(sections: MarkdownSections, scriptConfig: any) {
    const title = '### Request Endpoint';
    const content = [``, `- **Path:** \`${scriptConfig.endpoint?.path}\``, `- **Method:** \`${scriptConfig.endpoint?.method || 'GET'}\``, ``];

    return updateSection(sections, title, content, 3);
}

function updateRequestParams(sections: MarkdownSections, endpointType: string) {
    const title = '### Request Query Parameters';
    const content =
        endpointType === 'Action'
            ? [``, `_No request parameters_`, ``]
            : [
                  ``,
                  `- **modified_after:** \`(optional, string)\` A timestamp (e.g., \`2023-05-31T11:46:13.390Z\`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.`,
                  `- **limit:** \`(optional, integer)\` The maximum number of records to return per page. Defaults to 100.`,
                  `- **cursor:** \`(optional, string)\` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.`,
                  `- **filter:** \`(optional, added | updated | deleted)\` Filter to only show results that have been added or updated or deleted.`,
                  ``
              ];

    return updateSection(sections, title, content, 4);
}

function updateRequestBody(sections: MarkdownSections, scriptConfig: any, endpointType: string, models: any) {
    const title = '### Request Body';

    let content = [``, `_No request body_`, ``];
    if (endpointType === 'Action' && scriptConfig.input) {
        let expanded = expandModels(scriptConfig.input, models);
        if (Array.isArray(expanded)) {
            expanded = { input: expanded };
        }
        const expandedLines = JSON.stringify(expanded, null, 2).split('\n');
        content = [``, `\`\`\`json`, ...expandedLines, `\`\`\``, ``];
    }

    return updateSection(sections, title, content, 5);
}

function updateRequestResponse(sections: MarkdownSections, scriptConfig: any, models: any) {
    const title = '### Request Response';
    let content = [``, `_No request response_`, ``];
    if (scriptConfig.output) {
        const expanded = expandModels(scriptConfig.output, models);
        const expandedLines = JSON.stringify(expanded, null, 2).split('\n');
        content = [``, `\`\`\`json`, ...expandedLines, `\`\`\``, ``];
    }

    return updateSection(sections, title, content, 6);
}

function updateChangelog(sections: MarkdownSections, scriptPath: string) {
    const title = '## Changelog';
    const content = [
        ``,
        `- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/${scriptPath}.ts)`,
        `- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/${scriptPath}.md)`,
        ``
    ];
    return updateSection(sections, title, content, 7);
}

function expandModels(model: any, models: any): any {
    if (typeof model === 'undefined' || model === null) {
        return [];
    }

    if (typeof model === 'string') {
        if (model.endsWith('[]')) {
            return [expandModels(model.slice(0, -2), models)];
        }

        if (models[model]) {
            model = models[model];
        } else {
            model = `<${model}>`;
        }
    }

    if (typeof model === 'object') {
        if (model.__extends) {
            model = { ...models[model.__extends], ...model };
            delete model.__extends;
        }

        model = Object.fromEntries(
            Object.entries(model).map(([key, value]) => {
                return [key, expandModels(value, models)];
            })
        );
    }

    return model;
}
