import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('The key of the file containing the comment. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    comment_id: z.string().describe('The ID of the comment to react to. Example: "1774450119"'),
    emoji: z.string().describe('The emoji shortcode for the reaction. Example: ":thumbsup:"')
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.boolean()
});

const OutputSchema = z.object({
    status: z.number(),
    error: z.boolean()
});

const action = createAction({
    description: 'Add a reaction emoji to a comment in Figma.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-comment-reaction',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_comments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.figma.com/docs/rest-api/comments-endpoints/#post-comment-reactions-endpoint
        const response = await nango.post({
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/comments/${encodeURIComponent(input.comment_id)}/reactions`,
            data: {
                emoji: input.emoji
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status,
            error: providerResponse.error
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
