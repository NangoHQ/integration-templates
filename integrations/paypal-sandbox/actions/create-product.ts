import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The product name. Example: "Video Streaming Service"'),
    type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE']).describe('The product type. Example: "SERVICE"'),
    id: z
        .string()
        .optional()
        .describe('The ID of the product. You can specify the SKU. If omitted, the system generates it. Example: "PROD-XYAB12ABSB7868434"'),
    description: z.string().optional().describe('The product description. Example: "Video streaming service"'),
    category: z.string().optional().describe('The product category. Example: "SOFTWARE"'),
    image_url: z.string().optional().describe('The image URL for the product. Example: "https://example.com/streaming.jpg"'),
    home_url: z.string().optional().describe('The home page URL for the product. Example: "https://example.com/home"')
});

const ProviderProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    image_url: z.string().optional(),
    home_url: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z
        .array(
            z.object({
                href: z.string(),
                rel: z.string(),
                method: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    image_url: z.string().optional(),
    home_url: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z
        .array(
            z.object({
                href: z.string(),
                rel: z.string(),
                method: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a catalog product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            name: input.name,
            type: input.type,
            ...(input.id !== undefined && { id: input.id }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.category !== undefined && { category: input.category }),
            ...(input.image_url !== undefined && { image_url: input.image_url }),
            ...(input.home_url !== undefined && { home_url: input.home_url })
        };

        const response = await nango.post({
            // https://developer.paypal.com/docs/api/catalog-products/v1/#products_create
            endpoint: '/v1/catalogs/products',
            data: requestBody,
            retries: 3
        });

        const providerProduct = ProviderProductSchema.parse(response.data);

        return {
            id: providerProduct.id,
            name: providerProduct.name,
            ...(providerProduct.description !== undefined && { description: providerProduct.description }),
            ...(providerProduct.type !== undefined && { type: providerProduct.type }),
            ...(providerProduct.category !== undefined && { category: providerProduct.category }),
            ...(providerProduct.image_url !== undefined && { image_url: providerProduct.image_url }),
            ...(providerProduct.home_url !== undefined && { home_url: providerProduct.home_url }),
            ...(providerProduct.create_time !== undefined && { create_time: providerProduct.create_time }),
            ...(providerProduct.update_time !== undefined && { update_time: providerProduct.update_time }),
            ...(providerProduct.links !== undefined && { links: providerProduct.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
