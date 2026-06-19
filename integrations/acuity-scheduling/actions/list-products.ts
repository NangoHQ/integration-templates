import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deleted: z.boolean().optional().describe('Include deleted products. Defaults to false.')
});

const ProviderProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    price: z.string().optional(),
    type: z.string(),
    hidden: z.boolean().optional(),
    expires: z.number().nullable().optional(),
    appointmentTypeIDs: z.array(z.number()).nullable().optional(),
    appointmentTypeCounts: z.record(z.string(), z.number()).nullable().optional(),
    minutes: z.number().nullable().optional()
});

const ProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    price: z.string().optional(),
    type: z.string(),
    hidden: z.boolean().optional(),
    expires: z.number().optional(),
    appointmentTypeIDs: z.array(z.number()).optional(),
    appointmentTypeCounts: z.record(z.string(), z.number()).optional(),
    minutes: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(ProductSchema)
});

const action = createAction({
    description: 'List products.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.acuityscheduling.com/reference/get-products
            endpoint: '/products',
            params: {
                ...(input.deleted !== undefined && { deleted: String(input.deleted) })
            },
            retries: 3
        });

        const products = z.array(ProviderProductSchema).parse(response.data);

        return {
            items: products.map((product) => ({
                id: product.id,
                name: product.name,
                ...(product.description !== undefined && { description: product.description }),
                ...(product.price !== undefined && { price: product.price }),
                type: product.type,
                ...(product.hidden !== undefined && { hidden: product.hidden }),
                ...(product.expires != null && { expires: product.expires }),
                ...(product.appointmentTypeIDs != null && { appointmentTypeIDs: product.appointmentTypeIDs }),
                ...(product.appointmentTypeCounts != null && { appointmentTypeCounts: product.appointmentTypeCounts }),
                ...(product.minutes != null && { minutes: product.minutes })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
