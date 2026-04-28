import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace_gid: z.string().describe('Globally unique identifier for the workspace or organization. Example: "12345"'),
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of objects to return per page. Between 1 and 100.')
});

const TagSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional(),
    color: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    permalink_url: z.string().optional().nullable(),
    workspace: z
        .object({
            gid: z.string(),
            name: z.string().optional(),
            resource_type: z.string().optional()
        })
        .optional()
        .nullable()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: z
        .object({
            offset: z.string(),
            path: z.string(),
            uri: z.string()
        })
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    items: z.array(TagSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tags in a workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-tags-for-workspace',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.asana.com/reference/gettagsforworkspace
            endpoint: `/workspaces/${input.workspace_gid}/tags`,
            params: {
                opt_fields: 'color,created_at,followers,followers.name,name,notes,permalink_url,uri,workspace,workspace.name',
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3,
            baseUrlOverride: 'https://app.asana.com/api/1.0'
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => {
            const tag = TagSchema.parse(item);
            return {
                gid: tag.gid,
                ...(tag.resource_type != null && { resource_type: tag.resource_type }),
                ...(tag.name != null && { name: tag.name }),
                ...(tag.color != null && { color: tag.color }),
                ...(tag.notes != null && { notes: tag.notes }),
                ...(tag.permalink_url != null && { permalink_url: tag.permalink_url }),
                ...(tag.workspace != null && { workspace: tag.workspace })
            };
        });

        return {
            items,
            ...(providerResponse.next_page != null && { next_cursor: providerResponse.next_page.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
