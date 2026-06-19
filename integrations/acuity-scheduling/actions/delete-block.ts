import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the block to delete. Example: 1234')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number()
});

const action = createAction({
    description: 'Delete a calendar block.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api-v1'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.acuityscheduling.com/reference/delete-blocks-id
        const response = await nango.delete({
            endpoint: `/blocks/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status < 200 || response.status >= 300) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete block. Status: ${response.status}`
            });
        }

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
