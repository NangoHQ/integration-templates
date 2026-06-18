import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    pagelen: z.number().optional().describe('Number of items per page. Example: 10')
});

const ProviderProjectSchema = z.object({
    uuid: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    is_private: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    links: z.object({}).passthrough().optional()
});

const ProjectSchema = z.object({
    uuid: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    is_private: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProjectSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List projects in a workspace',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-projects',
        method: 'GET'
    },
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }
        if (input.pagelen !== undefined) {
            params['pagelen'] = input.pagelen;
        }

        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-workspaces-workspace-projects-get
            endpoint: `/2.0/workspaces/${encodeURIComponent(input.workspace)}/projects`,
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const data = z
            .object({
                values: z.array(ProviderProjectSchema).optional(),
                next: z.string().optional(),
                page: z.number().optional(),
                pagelen: z.number().optional(),
                size: z.number().optional()
            })
            .parse(response.data);

        const items = (data.values || []).map((project) => ({
            uuid: project.uuid,
            key: project.key,
            name: project.name,
            ...(project.description != null && { description: project.description }),
            ...(project.is_private !== undefined && { is_private: project.is_private }),
            ...(project.created_on !== undefined && { created_on: project.created_on }),
            ...(project.updated_on !== undefined && { updated_on: project.updated_on })
        }));

        let next_cursor: string | undefined;
        if (data.next) {
            const nextUrl = new URL(data.next);
            const nextPage = nextUrl.searchParams.get('page');
            if (nextPage) {
                next_cursor = nextPage;
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
