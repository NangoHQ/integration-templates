import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ listing_id: z.number() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Get a marketplace listing by ID.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/listings', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-listing
        const response = await nango.get({
            endpoint: `/marketplace/listings/${input.listing_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ message: 'Listing not found', listing_id: input.listing_id });
        }

        return z.record(z.string(), z.unknown()).parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
