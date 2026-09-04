import { createAction } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const InputSchema = z.object({
    folder_id: z.number().int().nonnegative(),
    release_id: z.number().int().positive()
});

const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Add a release to a collection folder.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/collection/items', group: 'Collection' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const username = await getDiscogsUsername(nango);

        // https://www.discogs.com/developers#page:user-collection,header-user-collection-add-to-collection-folder
        const response = await nango.post({
            endpoint: `/users/${encodeURIComponent(username)}/collection/folders/${input.folder_id}/releases/${input.release_id}`,
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
