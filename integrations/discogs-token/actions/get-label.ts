import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ label_id: z.number().int().positive() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Get a label by ID.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/labels', group: 'Database' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:database,header-database-label
        const response = await nango.get({
            endpoint: `/labels/${input.label_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ message: 'Label not found', label_id: input.label_id });
        }

        return z.record(z.string(), z.unknown()).parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
