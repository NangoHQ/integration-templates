import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace_gid: z.string().describe('The workspace or organization GID. Example: "123456789"'),
    cursor: z.string().optional().describe('Pagination offset from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('The number of items per page. Defaults to 100.')
});

const ProviderUserSchema = z.object({
    gid: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    resource_type: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: z
        .object({
            offset: z.string(),
            uri: z.string().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    users: z.array(
        z.object({
            gid: z.string(),
            name: z.string().optional(),
            email: z.string().optional(),
            resource_type: z.string().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List users in a workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-users-for-workspace',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.asana.com/reference/getusersinaworkspace
            endpoint: `/api/1.0/workspaces/${input.workspace_gid}/users`,
            params: {
                limit: input.limit !== undefined ? String(input.limit) : '100',
                opt_fields: 'gid,name,email,resource_type',
                ...(input.cursor !== undefined && { offset: input.cursor })
            },
            retries: 3
        });

        const body = ProviderResponseSchema.parse(response.data);

        const users = body.data.map((user) => {
            const parsed = ProviderUserSchema.parse(user);
            return {
                gid: parsed.gid,
                ...(parsed.name != null && { name: parsed.name }),
                ...(parsed.email != null && { email: parsed.email }),
                ...(parsed.resource_type != null && { resource_type: parsed.resource_type })
            };
        });

        const next_cursor = body.next_page?.offset;

        return {
            users,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
