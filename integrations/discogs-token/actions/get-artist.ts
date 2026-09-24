import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ artist_id: z.number().int().positive() });
const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        resource_url: z.string(),
        uri: z.string().optional(),
        releases_url: z.string().optional(),
        profile: z.string().optional(),
        realname: z.string().optional(),
        data_quality: z.string().optional(),
        namevariations: z.array(z.string()).optional(),
        urls: z.array(z.string()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get an artist by ID.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/artists', group: 'Database' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:database,header-database-artist
        const response = await nango.get({
            endpoint: `/artists/${input.artist_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ message: 'Artist not found', artist_id: input.artist_id });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
