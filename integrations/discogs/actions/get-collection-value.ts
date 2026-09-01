import { createAction } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const InputSchema = z.object({});
const OutputSchema = z.object({
    minimum: z.coerce.number(),
    median: z.coerce.number(),
    maximum: z.coerce.number()
});

const action = createAction({
    description: 'Get the minimum, median, and maximum value of a collection.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/collection/value', group: 'Collection' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango) => {
        const username = await getDiscogsUsername(nango);

        // https://www.discogs.com/developers#page:user-collection,header-user-collection-collection-value
        const response = await nango.get({
            endpoint: `/users/${encodeURIComponent(username)}/collection/value`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
