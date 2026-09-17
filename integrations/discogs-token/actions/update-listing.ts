import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    listing_id: z.number(),
    condition: z.string().optional(),
    sleeve_condition: z.string().optional(),
    price: z.number().optional(),
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
    description: 'Update a marketplace listing.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/listings/update', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const { listing_id, ...data } = input;

        // https://www.discogs.com/developers#page:marketplace,header-marketplace-edit-listing
        const response = await nango.post({
            endpoint: `/marketplace/listings/${listing_id}`,
            data,
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
