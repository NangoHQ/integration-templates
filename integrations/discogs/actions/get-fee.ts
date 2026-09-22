import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    price: z.number().positive(),
    currency: z.enum(['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'MXN', 'BRL', 'NZD', 'SEK', 'ZAR']).optional()
});
const OutputSchema = z.object({ value: z.number(), currency: z.string() });

const action = createAction({
    description: 'Calculate the marketplace fee for a listing price.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/fee', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-fee
        const response = await nango.get({
            endpoint: `/marketplace/fee/${input.price.toFixed(2)}/${input.currency ?? 'USD'}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
