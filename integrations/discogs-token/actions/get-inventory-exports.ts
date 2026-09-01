import { createAction } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const InputSchema = z.object({});
const OutputSchema = z.object({ exports: z.array(z.record(z.string(), z.unknown())) });

const action = createAction({
    description: 'List inventory exports for the authenticated user.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/inventory/exports', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango) => {
        const username = await getDiscogsUsername(nango);

        // https://www.discogs.com/developers#page:marketplace,header-marketplace-list-inventory-exports
        const response = await nango.get({
            endpoint: `/users/${encodeURIComponent(username)}/inventory/export`,
            retries: 3
        });

        const exports = z.array(z.record(z.string(), z.unknown())).parse(response.data?.exports ?? []);
        return { exports };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
