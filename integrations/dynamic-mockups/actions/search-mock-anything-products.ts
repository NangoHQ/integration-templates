import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Search term for the built-in print-on-demand product catalog. Example: "shirt"')
});

const SizeSchema = z.object({
    label: z.string(),
    width_in: z.union([z.number(), z.null()]),
    height_in: z.union([z.number(), z.null()]),
    is_reference_size: z.boolean()
});

const ProductSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    sizes: z.array(SizeSchema).optional()
});

const OutputSchema = z.object({
    products: z.array(ProductSchema)
});

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            uuid: z.string(),
            name: z.string(),
            sizes: z
                .array(
                    z.object({
                        label: z.string(),
                        width_in: z.union([z.number(), z.null()]),
                        height_in: z.union([z.number(), z.null()]),
                        is_reference_size: z.boolean()
                    })
                )
                .optional()
        })
    )
});

const action = createAction({
    description: 'Search the built-in print-on-demand (POD) product catalog usable with MockAnything AI generation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynamicmockups.com/
        const response = await nango.get({
            endpoint: 'v1/mock-anything/products',
            params: {
                query: input.query
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const products = providerData.data.map((product) => ({
            uuid: product.uuid,
            name: product.name,
            ...(product.sizes !== undefined && { sizes: product.sizes })
        }));

        return {
            products
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
