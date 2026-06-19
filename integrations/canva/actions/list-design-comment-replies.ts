import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    designId: z.string().describe('The design ID. Example: "DAHNACmCy_g"'),
    threadId: z.string().describe('The ID of the thread. Example: "KAHNAKVJAd4"'),
    limit: z.number().min(1).max(100).optional().describe('The number of replies to return. Maximum 100.'),
    continuation: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    display_name: z.string().optional()
});

const ProviderCommentContentSchema = z.object({
    plaintext: z.string(),
    markdown: z.string().optional()
});

const ProviderTeamUserSchema = z.object({
    user_id: z.string(),
    team_id: z.string(),
    display_name: z.string().optional()
});

const ProviderUserMentionSchema = z.object({
    tag: z.string(),
    user: ProviderTeamUserSchema
});

const ProviderReplySchema = z.object({
    id: z.string(),
    design_id: z.string(),
    thread_id: z.string(),
    author: ProviderUserSchema.optional(),
    content: ProviderCommentContentSchema,
    mentions: z.record(z.string(), ProviderUserMentionSchema),
    created_at: z.number(),
    updated_at: z.number()
});

const ProviderListRepliesResponseSchema = z.object({
    items: z.array(ProviderReplySchema),
    continuation: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderReplySchema),
    continuation: z.string().optional()
});

const action = createAction({
    description: 'List replies in a design comment thread.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comment:read'],
    endpoint: {
        path: '/actions/list-design-comment-replies',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/comments/get-replies/
            endpoint: `/rest/v1/designs/${encodeURIComponent(input.designId)}/comments/${encodeURIComponent(input.threadId)}/replies`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.continuation !== undefined && { continuation: input.continuation })
            },
            retries: 3
        });

        const providerResponse = ProviderListRepliesResponseSchema.parse(response.data);

        return {
            items: providerResponse.items,
            ...(providerResponse.continuation !== undefined && { continuation: providerResponse.continuation })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
