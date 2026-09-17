import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({});
const OutputSchema = z.object({ items: z.array(z.record(z.string(), z.unknown())) });

const action = createAction({
    description: 'List inventory exports for the authenticated user.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/inventory/exports', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango) => {
        // https://www.discogs.com/developers#page:marketplace,header-marketplace-list-inventory-exports
        const response = await nango.get({
            endpoint: '/inventory/export',
            retries: 3
        });

        const items = z
            .object({ items: z.array(z.record(z.string(), z.unknown())) })
            .parse(response.data).items;
        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
