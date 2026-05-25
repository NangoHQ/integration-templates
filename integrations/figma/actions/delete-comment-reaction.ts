import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('File key of the file to delete the comment reaction from. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    comment_id: z.string().describe('ID of the comment to delete the reaction from. Example: "1774450119"'),
    emoji: z.string().describe('Emoji shortcode of the reaction to delete. Example: ":thumbsup:"')
});

const ProviderResponseSchema = z.object({
    status: z.number().optional(),
    error: z.union([z.boolean(), z.null()]).optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a reaction from a comment in Figma.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment-reaction',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_comments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.figma.com/developers/api#delete-comment-reaction
        const response = await nango.delete({
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/comments/${encodeURIComponent(input.comment_id)}/reactions`,
            params: {
                emoji: input.emoji
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Figma API when deleting comment reaction',
                details: providerResponse.error.message
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
