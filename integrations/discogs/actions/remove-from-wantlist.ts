import { createAction } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const InputSchema = z.object({ release_id: z.number() });
const OutputSchema = z.object({ success: z.boolean() });

const action = createAction({
    description: 'Remove a release from the wantlist.',
    version: '1.0.0',
    endpoint: { method: 'DELETE', path: '/wantlist', group: 'Wantlist' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const username = await getDiscogsUsername(nango);

        // https://www.discogs.com/developers#page:user-wantlist,header-user-wantlist-delete-from-wantlist
        await nango.delete({
            endpoint: `/users/${encodeURIComponent(username)}/wants/${input.release_id}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
