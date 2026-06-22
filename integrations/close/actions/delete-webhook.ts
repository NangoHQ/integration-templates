import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the webhook subscription to delete. Example: "whsub_6un6NQjYTaFdgtIZsTDXP6"')
});

const OutputSchema = z.object({
    id: z.string().optional()
});

const action = createAction({
    description: 'Delete a webhook subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.close.com/api/resources/webhooks/delete
        const response = await nango.delete({
            endpoint: `/v1/webhook/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete webhook. Status: ${response.status}`,
                id: input.id
            });
        }

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
