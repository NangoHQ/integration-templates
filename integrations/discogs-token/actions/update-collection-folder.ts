import { createAction } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const InputSchema = z.object({ folder_id: z.number(), name: z.string() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Update a collection folder name.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/collection/folders/update', group: 'Collection' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const username = await getDiscogsUsername(nango);

        // https://www.discogs.com/developers#page:user-collection,header-user-collection-edit-folder
        const response = await nango.post({
            endpoint: `/users/${encodeURIComponent(username)}/collection/folders/${input.folder_id}`,
            data: { name: input.name },
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
