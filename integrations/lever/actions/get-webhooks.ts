import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderWebhookSchema = z
    .object({
        id: z.string(),
        event: z.string(),
        url: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderWebhookSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List all webhook subscriptions configured on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/webhooks',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()),
                hasNext: z.boolean().optional(),
                next: z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.data.map((item) => ProviderWebhookSchema.parse(item));

        return {
            items,
            ...(providerResponse.next !== undefined && { nextCursor: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
