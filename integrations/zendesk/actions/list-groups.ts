import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    default: z.boolean().optional(),
    deleted: z.boolean().optional(),
    is_public: z.boolean().optional()
});

const GroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    default: z.boolean().optional(),
    deleted: z.boolean().optional(),
    is_public: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(GroupSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    groups: z.array(ProviderGroupSchema),
    meta: z
        .object({
            has_more: z.boolean().optional(),
            after_cursor: z.string().optional(),
            before_cursor: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'List support groups',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-groups',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.zendesk.com/api-reference/ticketing/groups/groups/
        const response = await nango.get({
            endpoint: '/api/v2/groups.json',
            params: {
                ...(input.cursor && { 'page[after]': input.cursor }),
                'page[size]': 100
            },
            retries: 3
        });

        const responseData = ProviderResponseSchema.parse(response.data);

        return {
            items: responseData.groups.map((group) => ({
                id: group.id,
                name: group.name,
                ...(group.description != null && { description: group.description }),
                url: group.url,
                created_at: group.created_at,
                updated_at: group.updated_at,
                ...(group.default !== undefined && { default: group.default }),
                ...(group.deleted !== undefined && { deleted: group.deleted }),
                ...(group.is_public !== undefined && { is_public: group.is_public })
            })),
            ...(responseData.meta?.after_cursor != null && { next_cursor: responseData.meta.after_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
