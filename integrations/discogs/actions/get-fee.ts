import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ price: z.number(), currency: z.string().optional() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Calculate the marketplace fee for a listing price.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/fee', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const params: Record<string, string | number> = { price: input.price };
        if (input.currency !== undefined) params['currency'] = input.currency;

        // https://www.discogs.com/developers#page:marketplace,header-marketplace-fee
        const response = await nango.get({
            endpoint: `/marketplace/fee/${input.price}`,
            params,
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
