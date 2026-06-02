import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bc_id: z.string().describe('Business Center ID. Example: "123456789"'),
    catalog_id: z.string().describe('Catalog ID. Example: "987654321"')
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    catalog_id: z.string()
});

const action = createAction({
    description: 'Delete a product catalog from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-catalog',
        group: 'Catalogs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1740310064588801
            endpoint: '/catalog/delete/',
            data: {
                bc_id: input.bc_id,
                catalog_id: input.catalog_id
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_provider_response',
                message: 'Provider returned an unexpected response format.',
                catalog_id: input.catalog_id
            });
        }

        if (parsed.data.code !== undefined && parsed.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.data.message || `Provider error code: ${parsed.data.code}`,
                code: parsed.data.code,
                request_id: parsed.data.request_id,
                catalog_id: input.catalog_id
            });
        }

        return {
            catalog_id: input.catalog_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
