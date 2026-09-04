import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ release_id: z.number().int().positive() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Get marketplace price suggestions for a release.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/price-suggestions', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-price-suggestions
        const response = await nango.get({
            endpoint: `/marketplace/price_suggestions/${input.release_id}`,
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
