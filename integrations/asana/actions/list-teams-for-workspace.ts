import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace_gid: z.string().describe('Globally unique identifier for the workspace or organization. Example: "12345"'),
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of results per page. Must be between 1 and 100. Defaults to 100.')
});

const TeamSchema = z.object({
    gid: z.string(),
    name: z.string(),
    resource_type: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TeamSchema),
    next_cursor: z.string().optional()
});

const AsanaListResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: z
        .object({
            offset: z.string()
        })
        .optional()
        .nullable()
});

const action = createAction({
    description: 'List teams in a workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-teams-for-workspace',
        group: 'Teams'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            opt_fields: 'gid,name,resource_type',
            ...(input.limit !== undefined && { limit: input.limit }),
            ...(input.cursor !== undefined && input.cursor.length > 0 && { offset: input.cursor })
        };

        const response = await nango.get({
            // https://developers.asana.com/reference/getteamsforworkspace
            endpoint: `/workspaces/${input.workspace_gid}/teams`,
            params,
            baseUrlOverride: 'https://app.asana.com/api/1.0',
            retries: 3
        });

        const providerResponse = AsanaListResponseSchema.parse(response.data);

        const parsedItems = providerResponse.data.map((item) => {
            const team = TeamSchema.parse(item);
            return {
                gid: team.gid,
                name: team.name,
                ...(team.resource_type !== undefined && { resource_type: team.resource_type })
            };
        });

        const nextCursor = providerResponse.next_page ? providerResponse.next_page.offset : undefined;

        return {
            items: parsedItems,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
