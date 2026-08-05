import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uuid: z.string().describe('Product UUID. Example: "17212ae2-39cf-4af2-abd8-3960dddd1a87"')
});

const ProviderDecorationSchema = z.object({
    position_id: z.string(),
    location: z.string(),
    name: z.string(),
    surface: z.string(),
    sources: z.array(z.string())
});

const ProviderColorSchema = z.object({
    name: z.string(),
    hex: z.string().nullable()
});

const ProviderProductSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    brand: z.string(),
    style_code: z.string(),
    category: z.string(),
    subcategory: z.string(),
    decorations: z.array(ProviderDecorationSchema),
    colors: z.array(ProviderColorSchema),
    supported_sizes: z.array(z.string())
});

const AxiosErrorSchema = z.object({
    response: z
        .object({
            status: z.number()
        })
        .optional()
});

const OutputSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    brand: z.string(),
    style_code: z.string(),
    category: z.string(),
    subcategory: z.string(),
    decorations: z.array(
        z.object({
            position_id: z.string(),
            location: z.string(),
            name: z.string(),
            surface: z.string(),
            sources: z.array(z.string())
        })
    ),
    colors: z.array(
        z.object({
            name: z.string(),
            hex: z.string().optional()
        })
    ),
    supported_sizes: z.array(z.string())
});

const action = createAction({
    description: "Get full details (including available decoration locations) for one POD product, for use with create-mock-anything's product.decorations.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Map provider 404 to a typed ActionError so callers receive a clean not-found message instead of a raw Axios error.
        let response;
        try {
            // https://docs.dynamicmockups.com/
            response = await nango.get({
                endpoint: `/v1/mock-anything/products/${encodeURIComponent(input.uuid)}`,
                retries: 3
            });
        } catch (error) {
            const parsed = AxiosErrorSchema.safeParse(error);
            if (parsed.success && parsed.data.response?.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Product not found',
                    uuid: input.uuid
                });
            }

            throw error;
        }

        const providerProduct = ProviderProductSchema.parse(response.data.data);

        return {
            uuid: providerProduct.uuid,
            name: providerProduct.name,
            brand: providerProduct.brand,
            style_code: providerProduct.style_code,
            category: providerProduct.category,
            subcategory: providerProduct.subcategory,
            decorations: providerProduct.decorations.map((decoration) => ({
                position_id: decoration.position_id,
                location: decoration.location,
                name: decoration.name,
                surface: decoration.surface,
                sources: decoration.sources
            })),
            colors: providerProduct.colors.map((color) => ({
                name: color.name,
                ...(color.hex != null && { hex: color.hex })
            })),
            supported_sizes: providerProduct.supported_sizes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
