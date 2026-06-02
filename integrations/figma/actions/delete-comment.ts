import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('The key of the Figma file containing the comment. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    comment_id: z.string().describe('The ID of the comment to delete. Example: "1774450194"')
});

const ProviderDeleteResponseSchema = z.object({
    status: z.number(),
    error: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a specific comment from a Figma file. Only the author of the comment can delete it.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_comments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.figma.com/docs/rest-api/comments-endpoints/
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/comments/${encodeURIComponent(input.comment_id)}`,
            retries: 3
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);
        return {
            success: providerResponse.error === false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
