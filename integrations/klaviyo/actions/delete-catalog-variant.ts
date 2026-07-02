import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Catalog variant ID. Example: "$custom:::$default:::nango_seed_variant_1"')
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Delete a catalog variant.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['catalogs:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.klaviyo.com/en/reference/delete_catalog_variant
            endpoint: `/api/catalog-variants/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Catalog variant not found',
                id: input.id
            });
        }

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
