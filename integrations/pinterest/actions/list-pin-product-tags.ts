import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pin_id: z.string().describe('Pin ID. Example: "1099300590356451849"')
});

const ProviderProductTagSchema = z.object({
    pin_id: z.string().describe('Pin ID of the product pin tagged onto the hero pin.')
});

const ProviderResponseSchema = z.object({
    product_tags: z.array(ProviderProductTagSchema)
});

const OutputSchema = z.object({
    product_tags: z.array(
        z.object({
            pin_id: z.string()
        })
    )
});

const action = createAction({
    description: 'Get product tags on a pin.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read', 'pins:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/product_tags/list
        const response = await nango.get({
            endpoint: `/v5/pins/${encodeURIComponent(input.pin_id)}/product_tags`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            product_tags: providerResponse.product_tags.map((tag) => ({
                pin_id: tag.pin_id
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
