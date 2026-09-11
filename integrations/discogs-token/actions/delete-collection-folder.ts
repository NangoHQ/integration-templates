import { createAction } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const InputSchema = z.object({ folder_id: z.number() });
const OutputSchema = z.object({ success: z.boolean() });

const action = createAction({
    description: 'Delete a collection folder.',
    version: '1.0.0',
    endpoint: { method: 'DELETE', path: '/collection/folders', group: 'Collection' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const username = await getDiscogsUsername(nango);

        // https://www.discogs.com/developers#page:user-collection,header-user-collection-delete-folder
        await nango.delete({
            endpoint: `/users/${encodeURIComponent(username)}/collection/folders/${input.folder_id}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
