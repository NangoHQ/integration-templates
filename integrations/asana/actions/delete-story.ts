import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    story_gid: z.string().min(1).describe('Globally unique identifier for the story. Example: "12345"')
});

const ProviderResponseSchema = z.object({
    data: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a story or comment by gid.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['stories:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.asana.com/reference/deletestory
        const response = await nango.delete({
            endpoint: `/api/1.0/stories/${encodeURIComponent(input.story_gid)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Asana API when deleting story.'
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
