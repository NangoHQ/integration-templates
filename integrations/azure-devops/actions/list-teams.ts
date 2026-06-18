import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Azure DevOps project ID or name. Example: "nangoapi-test"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    description: z.string().nullable().optional(),
    identityUrl: z.string().optional(),
    projectName: z.string().optional(),
    projectId: z.string().optional()
});

const ProviderTeamListSchema = z.object({
    count: z.number().optional(),
    value: z.array(ProviderTeamSchema).optional()
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    description: z.string().optional(),
    identityUrl: z.string().optional(),
    projectName: z.string().optional(),
    projectId: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TeamSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List teams within a project.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-teams',
        group: 'Teams'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            'api-version': '7.2-preview.3'
        };
        if (input.cursor) {
            params['continuationToken'] = input.cursor;
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/core/teams/list?view=azure-devops-rest-7.2
            endpoint: `/_apis/projects/${encodeURIComponent(input.projectId)}/teams`,
            params: params,
            retries: 3
        };

        const response = await nango.get(config);

        const providerData = ProviderTeamListSchema.parse(response.data);
        const teams = providerData.value ?? [];

        const items = teams.map((team) => {
            const mapped = {
                id: team.id,
                name: team.name,
                ...(team.url !== undefined && { url: team.url }),
                ...(team.description != null && { description: team.description }),
                ...(team.identityUrl !== undefined && { identityUrl: team.identityUrl }),
                ...(team.projectName !== undefined && { projectName: team.projectName }),
                ...(team.projectId !== undefined && { projectId: team.projectId })
            };
            return TeamSchema.parse(mapped);
        });

        const continuationHeader = response.headers?.['x-ms-continuationtoken'];
        const nextCursor = typeof continuationHeader === 'string' && continuationHeader.length > 0 ? continuationHeader : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
