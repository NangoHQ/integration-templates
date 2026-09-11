import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ listing_id: z.number() });
const OutputSchema = z.object({ success: z.boolean() });

const action = createAction({
    description: 'Delete a marketplace listing.',
    version: '1.0.0',
    endpoint: { method: 'DELETE', path: '/listings', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-delete-listing
        await nango.delete({
            endpoint: `/marketplace/listings/${input.listing_id}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
