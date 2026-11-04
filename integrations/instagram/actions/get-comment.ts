import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        comment_id: z.string().min(1).describe('The Instagram comment ID to retrieve. Example: "17881770991003328"')
    })
    .describe('Input for retrieving a single Instagram comment.');

const ProviderCommentSchema = z.object({
    id: z.string().nullish(),
    text: z.string().nullish(),
    like_count: z.number().nullish(),
    timestamp: z.string().nullish(),
    parent_id: z.string().nullish(),
    username: z.string().nullish()
});

const OutputSchema = z
    .object({
        id: z.string().optional().describe('The Instagram comment ID.'),
        text: z.string().optional().describe('The text content of the comment.'),
        like_count: z.number().optional().describe('The number of likes the comment has received.'),
        timestamp: z.string().optional().describe('The ISO 8601 timestamp when the comment was created. Example: "2017-05-19T23:27:28+0000".'),
        parent_id: z.string().optional().describe('The parent comment ID when this comment is a reply. Omitted for top-level comments.'),
        username: z.string().optional().describe('The username of the Instagram account that authored the comment.')
    })
    .describe('A single Instagram comment.');

/**
 * @tags: [read]
 * @tagReason: Reads a single Instagram comment from the provider without modifying it.
 * @pitfalls: Instagram Login can return an empty object with HTTP 200 for an existing comment the app cannot read, so a missing id does not necessarily mean the comment does not exist.
 */
const action = createAction({
    description: 'Retrieve a single Instagram comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic', 'instagram_business_manage_comments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment
            endpoint: `/${encodeURIComponent(input.comment_id)}`,
            params: {
                fields: 'id,text,like_count,timestamp,parent_id,username'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Instagram comment ${input.comment_id} was not found.`,
                comment_id: input.comment_id
            });
        }

        const comment = ProviderCommentSchema.parse(response.data);

        return {
            ...(comment.id != null && { id: comment.id }),
            ...(comment.text != null && { text: comment.text }),
            ...(comment.like_count != null && { like_count: comment.like_count }),
            ...(comment.timestamp != null && { timestamp: comment.timestamp }),
            ...(comment.parent_id != null && { parent_id: comment.parent_id }),
            ...(comment.username != null && { username: comment.username })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
