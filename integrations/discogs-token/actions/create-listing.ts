import { createAction } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const MediaCondition = z.enum([
    'Mint (M)',
    'Near Mint (NM or M-)',
    'Very Good Plus (VG+)',
    'Very Good (VG)',
    'Good Plus (G+)',
    'Good (G)',
    'Fair (F)',
    'Poor (P)'
]);

const SleeveCondition = z.enum([
    'Mint (M)',
    'Near Mint (NM or M-)',
    'Very Good Plus (VG+)',
    'Very Good (VG)',
    'Good Plus (G+)',
    'Good (G)',
    'Fair (F)',
    'Poor (P)',
    'Generic',
    'Not Graded',
    'No Cover'
]);

const InputSchema = z.object({
    release_id: z.number().int().positive(),
    condition: MediaCondition,
    sleeve_condition: SleeveCondition.optional(),
    price: z.number(),
    comments: z.string().optional(),
    allow_offers: z.boolean().optional(),
    status: z.enum(['For Sale', 'Draft']).optional(),
    external_id: z.string().optional(),
    location: z.string().optional(),
    weight: z.number().optional(),
    format_quantity: z.number().optional()
});

const OutputSchema = z
    .object({
        listing_id: z.number(),
        resource_url: z.string()
    })
    .passthrough();

const action = createAction({
    description: 'Create a new marketplace listing.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/listings', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const username = await getDiscogsUsername(nango);

        const { release_id, sleeve_condition, ...listingData } = input;

        // https://www.discogs.com/developers#page:marketplace,header-marketplace-new-listing
        const response = await nango.post({
            endpoint: `/users/${encodeURIComponent(username)}/inventory`,
            data: {
                release_id,
                ...listingData,
                ...(sleeve_condition !== undefined && { sleeve_condition })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
