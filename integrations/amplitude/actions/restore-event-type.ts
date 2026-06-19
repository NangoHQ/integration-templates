import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_type: z.string().describe('The event type to restore. Example: "Purchase"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean(),
    event_type: z.string()
});

const action = createAction({
    description: 'Restore a deleted taxonomy event type.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://amplitude.com/docs/apis/analytics/taxonomy
            endpoint: `/api/2/taxonomy/event/${encodeURIComponent(input.event_type)}/restore`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.safeParse(response.data);
        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Amplitude Taxonomy API',
                data: response.data
            });
        }

        if (!providerData.data.success) {
            throw new nango.ActionError({
                type: 'restore_failed',
                message: 'Amplitude failed to restore the event type',
                event_type: input.event_type
            });
        }

        return {
            success: true,
            event_type: input.event_type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
