import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.')
});

const ProviderWorkspaceSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    email_domains: z.array(z.string()).optional(),
    is_organization: z.boolean().optional()
});

const WorkspaceSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    email_domains: z.array(z.string()).optional(),
    is_organization: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(WorkspaceSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List workspaces available to the authenticated user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-workspaces',
        group: 'Workspaces'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workspaces:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.asana.com/reference/getworkspaces
        const response = await nango.get({
            endpoint: '/api/1.0/workspaces',
            params: {
                limit: 100,
                ...(input.cursor !== undefined && { offset: input.cursor }),
                opt_fields: 'gid,resource_type,name,email_domains,is_organization'
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()),
                next_page: z
                    .object({
                        offset: z.string(),
                        path: z.string(),
                        uri: z.string()
                    })
                    .nullable()
                    .optional()
            })
            .parse(response.data);

        const items = providerResponse.data.map((item) => {
            const workspace = ProviderWorkspaceSchema.parse(item);
            return {
                gid: workspace.gid,
                resource_type: workspace.resource_type,
                name: workspace.name,
                ...(workspace.email_domains !== undefined && { email_domains: workspace.email_domains }),
                ...(workspace.is_organization !== undefined && { is_organization: workspace.is_organization })
            };
        });

        return {
            items,
            ...(providerResponse.next_page && providerResponse.next_page.offset !== undefined && { next_cursor: providerResponse.next_page.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
