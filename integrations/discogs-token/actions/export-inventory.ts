import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({});
const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Request an inventory export for the authenticated user.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/inventory/export', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-export-inventory
        const response = await nango.post({
            endpoint: '/inventory/export',
            retries: 3
        });

        return z.record(z.string(), z.unknown()).parse(response.data ?? {});
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
