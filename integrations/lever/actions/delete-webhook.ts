import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhook: z.string().describe('The ID of the webhook subscription to delete. Example: "63281ccb-a459-4fd8-8de9-a36afbdddd8b"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a webhook subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://hire.lever.co/developer/documentation
        await nango.delete({
            endpoint: `/v1/webhooks/${encodeURIComponent(input.webhook)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
