import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ master_id: z.number().int().positive() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Get a master release by ID.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/masters', group: 'Database' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:database,header-database-master-release
        const response = await nango.get({
            endpoint: `/masters/${input.master_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ message: 'Master release not found', master_id: input.master_id });
        }

        return z.record(z.string(), z.unknown()).parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
