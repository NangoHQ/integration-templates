import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Omit for the first page.'),
    pagelen: z.number().optional().describe('Number of items per page. Example: 10')
});

const WorkspaceSchema = z.object({
    uuid: z.string().describe('Workspace UUID. Example: "{d8dcf202-0b5d-4568-8954-43075e98b813}"'),
    slug: z.string().describe('Workspace slug. Example: "nangodev"'),
    name: z.string().optional().describe('Workspace name.'),
    type: z.string().optional().describe('Workspace type.'),
    is_private: z.boolean().optional().describe('Whether the workspace is private.')
});

const OutputSchema = z.object({
    items: z.array(WorkspaceSchema),
    page: z.number().optional().describe('Current page number.'),
    pagelen: z.number().optional().describe('Number of items per page.'),
    size: z.number().optional().describe('Total number of items.'),
    next: z.string().optional().describe('URL to the next page of results.')
});

const action = createAction({
    description: 'List workspaces the authenticated user belongs to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-workspaces',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-user-workspaces-get
        const response = await nango.get({
            endpoint: '/2.0/user/workspaces',
            params: {
                ...(input.page !== undefined && { page: input.page.toString() }),
                ...(input.pagelen !== undefined && { pagelen: input.pagelen.toString() })
            },
            retries: 3
        });

        const rawResponse = z
            .object({
                values: z.array(z.unknown()),
                page: z.number().optional(),
                pagelen: z.number().optional(),
                size: z.number().optional(),
                next: z.string().optional()
            })
            .parse(response.data);

        const items = rawResponse.values.map((item: unknown) => {
            const workspace = z
                .object({
                    workspace: z
                        .object({
                            uuid: z.string(),
                            slug: z.string(),
                            name: z.string().optional(),
                            type: z.string().optional(),
                            is_private: z.boolean().optional()
                        })
                        .passthrough()
                })
                .parse(item).workspace;

            return {
                uuid: workspace.uuid,
                slug: workspace.slug,
                ...(workspace.name !== undefined && { name: workspace.name }),
                ...(workspace.type !== undefined && { type: workspace.type }),
                ...(workspace.is_private !== undefined && { is_private: workspace.is_private })
            };
        });

        return {
            items,
            ...(rawResponse.page !== undefined && { page: rawResponse.page }),
            ...(rawResponse.pagelen !== undefined && { pagelen: rawResponse.pagelen }),
            ...(rawResponse.size !== undefined && { size: rawResponse.size }),
            ...(rawResponse.next !== undefined && { next: rawResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
