import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project ID or project name. Example: "my-project"')
});

const GitVersionDescriptorSchema = z.object({
    version: z.string().optional(),
    versionOptions: z.string().optional(),
    versionType: z.string().optional()
});

const WikiSchema = z.object({
    id: z.string().describe('Wiki ID.'),
    name: z.string().describe('Wiki name.'),
    type: z.string().describe('Type of the wiki: projectWiki or codeWiki.'),
    url: z.string().describe('REST URL for this wiki.'),
    remoteUrl: z.string().describe('Remote web URL to the wiki.').optional(),
    projectId: z.string().describe('ID of the project in which the wiki is created.').optional(),
    repositoryId: z.string().describe('ID of the git repository that backs up the wiki.').optional(),
    mappedPath: z.string().describe('Folder path inside repository which is shown as Wiki.').optional(),
    isDisabled: z.boolean().optional(),
    versions: z.array(GitVersionDescriptorSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(WikiSchema),
    count: z.number().describe('Total number of wikis.')
});

const action = createAction({
    description: 'List wikis in a project.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-wikis',
        group: 'Wikis'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.wiki'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/wiki/wikis/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/wiki/wikis`,
            params: {
                'api-version': '7.2-preview.2'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No wikis found or project not found',
                project: input.project
            });
        }

        const data = z
            .object({
                value: z.array(z.unknown()).default([]),
                count: z.number().default(0)
            })
            .parse(response.data);

        const items = data.value.map((item) => {
            const wiki = WikiSchema.parse(item);
            return {
                id: wiki.id,
                name: wiki.name,
                type: wiki.type,
                url: wiki.url,
                ...(wiki.remoteUrl !== undefined && { remoteUrl: wiki.remoteUrl }),
                ...(wiki.projectId !== undefined && { projectId: wiki.projectId }),
                ...(wiki.repositoryId !== undefined && { repositoryId: wiki.repositoryId }),
                ...(wiki.mappedPath !== undefined && { mappedPath: wiki.mappedPath }),
                ...(wiki.isDisabled !== undefined && { isDisabled: wiki.isDisabled }),
                ...(wiki.versions !== undefined && { versions: wiki.versions })
            };
        });

        return {
            items,
            count: data.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
