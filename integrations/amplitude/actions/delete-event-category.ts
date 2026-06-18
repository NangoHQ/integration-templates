import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.string().describe('Event category ID. Example: "123"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an event category',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/taxonomy
        const response = await nango.delete({
            endpoint: `/api/2/taxonomy/category/${encodeURIComponent(input.category_id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Amplitude Taxonomy API',
                response: response.data
            });
        }

        if (!parsed.data.success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Amplitude returned success: false when deleting the event category.',
                response: parsed.data
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
