import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    history_item_id: z.string().describe('ID of the history item to delete. Example: "JveLb9l9aA9OP7eF6zYH"')
});

const ProviderResponseSchema = z.object({
    status: z.string()
});

const OutputSchema = z.object({
    status: z.string()
});

const action = createAction({
    description: 'Delete a history item.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/delete-history-item' },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://elevenlabs.io/docs/api-reference/history/delete
            endpoint: `/v1/history/${encodeURIComponent(input.history_item_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
