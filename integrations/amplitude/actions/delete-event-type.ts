import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_type: z.string().describe('The name of the event type to delete. Example: "Play Song"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a taxonomy event type.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://amplitude.com/docs/apis/analytics/taxonomy
            endpoint: `/api/2/taxonomy/event/${encodeURIComponent(input.event_type)}`,
            retries: 1
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete event type'
            });
        }

        return {
            success: parsed.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
