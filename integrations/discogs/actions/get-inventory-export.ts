import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ export_id: z.number().int().positive() });
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Get a specific inventory export by ID.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/inventory/export', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-get-inventory-export
        const response = await nango.get({
            endpoint: `/inventory/export/${input.export_id}`,
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
