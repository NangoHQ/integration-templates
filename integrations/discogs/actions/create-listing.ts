import { createAction } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const InputSchema = z.object({
    release_id: z.number(),
    condition: z.string(),
    sleeve_condition: z.string(),
    price: z.number(),
    comments: z.string().optional(),
    allow_offers: z.boolean().optional(),
    status: z.string().optional(),
    external_id: z.string().optional(),
    location: z.string().optional(),
    weight: z.number().optional(),
    format_quantity: z.number().optional()
});

const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Create a new marketplace listing.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/listings', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const username = await getDiscogsUsername(nango);

        const { release_id, ...listingData } = input;

        // https://www.discogs.com/developers#page:marketplace,header-marketplace-new-listing
        const response = await nango.post({
            endpoint: `/users/${encodeURIComponent(username)}/inventory`,
            data: {
                release_id,
                ...listingData
            },
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
