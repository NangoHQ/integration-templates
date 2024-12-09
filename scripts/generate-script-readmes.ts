import { promises as fs } from 'fs';
import yaml from 'js-yaml';

const maybeIntegrations = await fs.readdir('integrations', { withFileTypes: true });
const integrations = maybeIntegrations.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);

for (const integration of integrations) {
    const yamlConfig = yaml.load(await fs.readFile(`integrations/${integration}/nango.yaml`, 'utf8')) as any;
    const config = yamlConfig.integrations[integration] || yamlConfig.integrations['${PWD}'];

    if (config.syncs) {
        (Object.entries(config.syncs) as [string, any]).map(async ([key, sync]) => {
            let sections = await readSections(`integrations/${integration}/syncs/${key}.md`);
            try {
                sections = updateReadme(sections, key, `${integration}/syncs/${key}`, 'Sync', sync);
                await fs.writeFile(`integrations/${integration}/syncs/${key}.md`, readme(sections));
            } catch (e) {
                console.error(`Error updating readme for ${integration} sync ${key}: ${e.message}`);
            }
        });
    }

    if (config.actions) {
        (Object.entries(config.actions) as [string, any]).map(async ([key, action]) => {
            let sections = await readSections(`integrations/${integration}/actions/${key}.md`);

            try {
                sections = updateReadme(sections, key, `${integration}/actions/${key}`, 'Action', action);
                await fs.writeFile(`integrations/${integration}/actions/${key}.md`, readme(sections));
            } catch (e) {
                console.error(`Error updating readme for ${integration} action ${key}: ${e.message}`);
            }
        });
    }
}

type MarkdownSections = { [key: string]: string[] };

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
            sections[currentSection].push(line);
        }
    }

    return sections;
}

// update sections to include latest content
function updateReadme(sections: MarkdownSections, scriptName: string, scriptPath: string, endpointType: string, scriptConfig: any): MarkdownSections {
    sections = updateTitle(sections, scriptName);
    sections = updateGeneralInfo(sections, scriptPath, endpointType, scriptConfig);
    sections = updateSection(sections, '## Endpoint Reference', [], 2);
    sections = updateRequestEndpoint(sections, scriptConfig);
    sections = updateRequestBody(sections, scriptConfig, endpointType);
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
    const content = [``, `- **Path:** ${scriptConfig.endpoint?.path}`, `- **Method:** ${scriptConfig.endpoint?.method || 'GET'}`, ``];

    return updateSection(sections, title, content, 3);
}

function updateRequestBody(sections: MarkdownSections, scriptConfig: any, endpointType: string) {
    const title = '### Request Body';
    const content = [``, `\`\`\`json`, `Hello World`, `\`\`\``, ``];

    return updateSection(sections, title, content, 4);
}
