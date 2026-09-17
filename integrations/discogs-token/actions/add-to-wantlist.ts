import { createAction } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const InputSchema = z.object({
    release_id: z.number(),
    notes: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional()
});

const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Add a release to the wantlist.',
    version: '1.0.0',
    endpoint: { method: 'PUT', path: '/wantlist', group: 'Wantlist' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const username = await getDiscogsUsername(nango);

        const data: Record<string, string | number> = {};
        if (input.notes !== undefined) data['notes'] = input.notes;
        if (input.rating !== undefined) data['rating'] = input.rating;

        // https://www.discogs.com/developers#page:user-wantlist,header-user-wantlist-add-to-wantlist
        const response = await nango.put({
            endpoint: `/users/${encodeURIComponent(username)}/wants/${input.release_id}`,
            data,
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
