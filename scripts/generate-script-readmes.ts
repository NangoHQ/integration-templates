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

function updateTitle(sections: MarkdownSections, scriptName: string) {
    const prettyName = scriptName
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    if (Object.keys(sections).length === 0) {
        return { [`# ${prettyName}`]: [] };
    }

    return Object.fromEntries(
        Object.entries(sections).map(([key, lines], idx) => {
            if (idx === 0) {
                return [`# ${prettyName}`, lines];
            }

            return [key, lines];
        })
    );
}

function updateGeneralInfo(sections: MarkdownSections, scriptPath: string, endpointType: string, scriptConfig: any) {
    const title = '## General Information';
    const content = [
        ``,
        `- **Description:** ${scriptConfig.description}`,
        ...(scriptConfig.version ? [`- **Version:** ${scriptConfig.version}`] : []),
        `- **Group:** ${scriptConfig.group || 'Others'}`,
        `- **Scopes:**: ${scriptConfig.scopes || '_None_'}`,
        `- **Endpoint Type:** ${endpointType}`,
        `- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/${scriptPath}.ts)`,
        ``
    ];

    if (Object.keys(sections).length < 2) {
        return { ...sections, [title]: content };
    }

    if (Object.keys(sections)[1] !== title) {
        throw new Error('Expected General Information as second section');
    }

    return Object.fromEntries(
        Object.entries(sections).map(([key, lines], idx) => {
            if (idx === 1) {
                return [title, content];
            }

            return [key, lines];
        })
    );
}
