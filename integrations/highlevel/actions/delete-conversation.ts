import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationId: z.string().describe('Conversation ID. Example: "tDtDnQdgm2LXpyiqYvZ6"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a conversation in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/conversations/${encodeURIComponent(input.conversationId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
