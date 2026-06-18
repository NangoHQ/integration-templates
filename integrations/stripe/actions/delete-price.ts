import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the price to archive. Example: "price_1TbSoBEZpD6kXraeE9F1XSiB"')
});

const ProviderPriceSchema = z.object({
    id: z.string(),
    object: z.literal('price'),
    active: z.boolean()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.literal('price'),
    active: z.boolean()
});

const action = createAction({
    description: 'Archive a price in Stripe.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.stripe.com/api/prices/update
            endpoint: `/v1/prices/${encodeURIComponent(input.id)}`,
            data: 'active=false',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const providerPrice = ProviderPriceSchema.parse(response.data);

        return {
            id: providerPrice.id,
            object: providerPrice.object,
            active: providerPrice.active
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
