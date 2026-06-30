import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the custom tag to delete. Example: "bca10b65-b620-44b3-8571-8ce409ad38c8"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a custom tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/delete-custom-tag'
    },
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.instantly.ai/api-reference/groups/custom-tag
            endpoint: `/v2/custom-tags/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status >= 200 && response.status < 300) {
            return {
                id: input.id,
                success: true
            };
        }

        throw new nango.ActionError({
            type: 'delete_failed',
            message: `Failed to delete custom tag. Received status ${response.status}.`,
            id: input.id
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
