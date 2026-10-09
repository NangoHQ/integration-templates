import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        Product_Name: z.string().describe('Name of the product. Example: "Annual Subscription"'),
        Product_Code: z.string().optional().describe('Code or SKU identifying the product. Example: "SUB-001"'),
        Unit_Price: z.number().optional().describe('Selling price per unit. Example: 49.99'),
        Product_Active: z.boolean().optional().describe('Whether the product is active. Bigin defaults this to true when omitted.'),
        Product_Category: z.string().optional().describe('Category the product belongs to. Example: "Software"'),
        Description: z.string().optional().describe('Free-form description of the product.')
    })
    .describe('Fields used to create a product in Bigin.');

const CreateProductResponseSchema = z.object({
    data: z
        .array(
            z.object({
                code: z.string().optional(),
                details: z
                    .object({
                        id: z.string().optional()
                    })
                    .optional(),
                message: z.string().optional(),
                status: z.string().optional()
            })
        )
        .min(1)
});

const ProductSchema = z.object({
    id: z.string(),
    Product_Name: z.string().nullish(),
    Product_Code: z.string().nullish(),
    Unit_Price: z.number().nullish(),
    Product_Active: z.boolean().nullish(),
    Product_Category: z.string().nullish(),
    Description: z.string().nullish(),
    Created_Time: z.string().nullish(),
    Modified_Time: z.string().nullish()
});

const ProductResponseSchema = z.object({
    data: z.array(ProductSchema).min(1)
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created product. Example: "7618134000000648021"'),
        Product_Name: z.string().optional().describe('Name of the created product.'),
        Product_Code: z.string().optional().describe('Code or SKU of the created product.'),
        Unit_Price: z.number().optional().describe('Selling price per unit of the created product.'),
        Product_Active: z.boolean().optional().describe('Whether the created product is active.'),
        Product_Category: z.string().optional().describe('Category of the created product.'),
        Description: z.string().optional().describe('Description of the created product.'),
        Created_Time: z.string().optional().describe('Time the product was created, in ISO 8601 format.'),
        Modified_Time: z.string().optional().describe('Time the product was last modified, in ISO 8601 format.')
    })
    .describe('The newly created Bigin product.');

/**
 * @tags: [write]
 * @tagReason: Creates a new product record in Bigin.
 * @pitfalls: Product_Name must be unique, so creating a product with a name that already exists fails with a duplicate-data error; omitting Product_Active creates an active product, since Bigin defaults it to true.
 */
const action = createAction({
    description: 'Create a new product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.products.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createResponse = await nango.post({
            // https://www.bigin.com/developer/docs/apis/v2/insert-records.html
            endpoint: '/bigin/v2/Products',
            data: {
                data: [
                    {
                        Product_Name: input.Product_Name,
                        ...(input.Product_Code !== undefined && { Product_Code: input.Product_Code }),
                        ...(input.Unit_Price !== undefined && { Unit_Price: input.Unit_Price }),
                        ...(input.Product_Active !== undefined && { Product_Active: input.Product_Active }),
                        ...(input.Product_Category !== undefined && { Product_Category: input.Product_Category }),
                        ...(input.Description !== undefined && { Description: input.Description })
                    }
                ]
            },
            // Bigin's create endpoint is not idempotent and exposes no idempotency key, so a retry could create a duplicate product.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const created = CreateProductResponseSchema.parse(createResponse.data).data[0];

        const productId = created?.status === 'success' ? created.details?.id : undefined;

        if (productId === undefined) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: created?.message ?? 'Bigin did not return a successful product creation response.',
                ...(created?.code !== undefined && { code: created.code })
            });
        }

        const productResponse = await nango.get({
            // https://www.bigin.com/developer/docs/apis/v2/get-records.html
            endpoint: `/bigin/v2/Products/${encodeURIComponent(productId)}`,
            params: {
                fields: 'id,Product_Name,Product_Code,Unit_Price,Product_Active,Product_Category,Description,Created_Time,Modified_Time'
            },
            retries: 3
        });

        const product = ProductResponseSchema.parse(productResponse.data).data[0];

        if (!product) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The product was created but could not be retrieved.',
                id: productId
            });
        }

        return {
            id: product.id,
            ...(product.Product_Name != null && { Product_Name: product.Product_Name }),
            ...(product.Product_Code != null && { Product_Code: product.Product_Code }),
            ...(product.Unit_Price != null && { Unit_Price: product.Unit_Price }),
            ...(product.Product_Active != null && { Product_Active: product.Product_Active }),
            ...(product.Product_Category != null && { Product_Category: product.Product_Category }),
            ...(product.Description != null && { Description: product.Description }),
            ...(product.Created_Time != null && { Created_Time: product.Created_Time }),
            ...(product.Modified_Time != null && { Modified_Time: product.Modified_Time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
