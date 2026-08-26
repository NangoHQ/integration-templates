import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_by: z.string().optional().describe('Sort order expression. Example: "created_datetime:asc", "name:desc", "usage:desc".'),
        search: z.string().optional().describe('Free-text search string to filter tags by name.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of tags to return per page. Defaults to 30, capped at 100.')
    })
    .describe('Input for listing tags with optional sorting, filtering, and pagination.');

const ProviderTagSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    uri: z.string().optional(),
    created_datetime: z.string().optional(),
    updated_datetime: z.string().optional(),
    decoration: z
        .object({
            color: z.string().optional(),
            icon: z.string().optional()
        })
        .optional(),
    usage: z.number().int().optional(),
    description: z.string().nullable().optional(),
    is_private: z.boolean().optional(),
    is_user: z.boolean().optional(),
    is_satisfaction: z.boolean().optional(),
    user_id: z.number().int().optional()
});

const ProviderMetaSchema = z.object({
    prev_cursor: z.string().nullable().optional(),
    next_cursor: z.string().optional(),
    total_resources: z.number().int().nullable().optional()
});

const ProviderListResponseSchema = z.object({
    data: z.array(ProviderTagSchema),
    meta: ProviderMetaSchema
});

const TagSchema = z.object({
    id: z.number().int().describe('Unique identifier of the tag.'),
    name: z.string().describe('Display name of the tag.'),
    uri: z.string().optional().describe('API URI of the tag resource.'),
    created_datetime: z.string().optional().describe('ISO8601 timestamp when the tag was created.'),
    updated_datetime: z.string().optional().describe('ISO8601 timestamp when the tag was last updated.'),
    decoration: z
        .object({
            color: z.string().optional().describe('Hex color code for the tag.'),
            icon: z.string().optional().describe('Icon identifier for the tag.')
        })
        .optional()
        .describe('Visual decoration metadata for the tag.'),
    usage: z.number().int().optional().describe('Number of times the tag has been applied.'),
    description: z.string().optional().describe('Optional description of the tag.'),
    is_private: z.boolean().optional().describe('Whether the tag is private to the user.'),
    is_user: z.boolean().optional().describe('Whether the tag is a user tag.'),
    is_satisfaction: z.boolean().optional().describe('Whether the tag is a satisfaction survey tag.'),
    user_id: z.number().int().optional().describe('ID of the user who created the tag, if applicable.')
});

const OutputSchema = z
    .object({
        items: z.array(TagSchema).describe('List of tags matching the request criteria.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('Paginated list of tags returned from the Gorgias API.');

/**
 * @tags: [read]
 * @tagReason: Reads tags from the Gorgias API via a GET request.
 */
const action = createAction({
    description: 'List tags, optionally searched or ordered by usage.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.order_by !== undefined) {
            params['order_by'] = input.order_by;
        }
        if (input.search !== undefined) {
            params['search'] = input.search;
        }
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        // https://developers.gorgias.com/reference/list-tags
        const response = await nango.get({
            endpoint: '/api/tags',
            params,
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.data.map((tag) => ({
                id: tag.id,
                name: tag.name,
                ...(tag.uri != null && { uri: tag.uri }),
                ...(tag.created_datetime != null && { created_datetime: tag.created_datetime }),
                ...(tag.updated_datetime != null && { updated_datetime: tag.updated_datetime }),
                ...(tag.decoration != null && {
                    decoration: {
                        ...(tag.decoration.color != null && { color: tag.decoration.color }),
                        ...(tag.decoration.icon != null && { icon: tag.decoration.icon })
                    }
                }),
                ...(tag.usage != null && { usage: tag.usage }),
                ...(tag.description != null && { description: tag.description }),
                ...(tag.is_private != null && { is_private: tag.is_private }),
                ...(tag.is_user != null && { is_user: tag.is_user }),
                ...(tag.is_satisfaction != null && { is_satisfaction: tag.is_satisfaction }),
                ...(tag.user_id != null && { user_id: tag.user_id })
            })),
            ...(parsed.meta.next_cursor != null && { next_cursor: parsed.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
