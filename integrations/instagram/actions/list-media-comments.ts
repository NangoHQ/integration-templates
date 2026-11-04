import { z } from 'zod';
import { createAction } from 'nango';

const CommentFieldSchema = z.enum(['id', 'text', 'username', 'timestamp', 'like_count', 'parent_id']);

const InputSchema = z
    .object({
        media_id: z.string().min(1).describe('Instagram media ID whose comments should be listed. Example: "17895695668004550"'),
        fields: z
            .array(CommentFieldSchema)
            .optional()
            .describe('Comment fields to return. The comment ID is always requested. Defaults to id, text, username, timestamp, like_count, and parent_id.'),
        limit: z.number().int().min(1).max(50).optional().describe('Maximum number of comments to return per page, from 1 to 50.'),
        cursor: z.string().min(1).optional().describe('Opaque pagination cursor from a previous response. Omit it to fetch the first page.')
    })
    .describe('Filters for listing comments on an Instagram media object.');

const OutputCommentSchema = z.object({
    id: z.string().describe('Unique Instagram comment ID. Example: "17870913679156914"'),
    text: z.string().optional().describe('Text content of the comment.'),
    username: z.string().optional().describe('Username of the account that posted the comment.'),
    timestamp: z.string().optional().describe('Time the comment was posted, in ISO 8601 format. Example: "2026-11-04T14:13:03+0000"'),
    like_count: z.number().optional().describe('Number of likes on the comment.'),
    parent_id: z.string().optional().describe('ID of the parent comment when the comment is a reply.')
});

const OutputSchema = z
    .object({
        comments: z.array(OutputCommentSchema).describe('Comments returned for the requested media object.'),
        next_cursor: z.string().optional().describe('Cursor to pass as cursor on the next request. Omitted when there are no more pages.')
    })
    .describe('A page of comments for an Instagram media object.');

const ProviderCommentSchema = z.object({
    id: z.string(),
    text: z.string().nullish(),
    username: z.string().nullish(),
    timestamp: z.string().nullish(),
    like_count: z.number().nullish(),
    parent_id: z.string().nullish()
});

const ProviderPagingSchema = z
    .object({
        cursors: z
            .object({
                before: z.string().nullish(),
                after: z.string().nullish()
            })
            .nullish(),
        next: z.string().nullish()
    })
    .nullish();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderCommentSchema),
    paging: ProviderPagingSchema
});

/**
 * @tags: [read]
 * @tagReason: Lists comments from the provider without modifying any data.
 * @pitfalls: Returns only top-level comments, and may return an empty list despite a non-zero comments_count because owner-authored comments can be omitted; missing comments permission also yields an empty list rather than an error.
 */
const action = createAction({
    description: 'List comments on an Instagram media object.',
    version: '1.0.0',
    scopes: ['instagram_business_basic', 'instagram_business_manage_comments'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestedFields = input.fields ?? ['id', 'text', 'username', 'timestamp', 'like_count', 'parent_id'];
        const fields = requestedFields.includes('id') ? requestedFields : ['id', ...requestedFields];

        const response = await nango.get({
            // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/comments
            endpoint: `/${encodeURIComponent(input.media_id)}/comments`,
            params: {
                fields: fields.join(','),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const comments = providerResponse.data.map((comment) => ({
            id: comment.id,
            ...(comment.text != null && { text: comment.text }),
            ...(comment.username != null && { username: comment.username }),
            ...(comment.timestamp != null && { timestamp: comment.timestamp }),
            ...(comment.like_count != null && { like_count: comment.like_count }),
            ...(comment.parent_id != null && { parent_id: comment.parent_id })
        }));

        const nextCursor = providerResponse.paging?.next != null ? providerResponse.paging.cursors?.after : null;

        return {
            comments,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
