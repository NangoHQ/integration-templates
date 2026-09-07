import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        product_id: z.string().describe('The product ID to create the variant on. Example: "16076831074833682966241755"'),
        price: z.string().describe('Price of the variant. Example: "19.99"'),
        sku: z.string().describe('Stock keeping unit. Example: "SKU-123"'),
        compare_at_price: z.string().optional().describe('Original price for comparison. Example: "29.99"'),
        barcode: z.string().optional().describe('Barcode or ISBN. Example: "123456789012"'),
        weight: z.number().optional().describe('Weight of the variant. Example: 1.5'),
        weight_unit: z.string().optional().describe('Unit of weight, e.g. kg or g. Example: "kg"'),
        option1: z.string().optional().describe('Option value for the first product option. Example: "Blue"'),
        option2: z.string().optional().describe('Option value for the second product option. Example: "Large"'),
        option3: z.string().optional().describe('Option value for the third product option. Example: "Cotton"'),
        option4: z.string().optional().describe('Option value for the fourth product option. Example: "Slim"'),
        option5: z.string().optional().describe('Option value for the fifth product option. Example: "V-neck"'),
        inventory_policy: z.string().optional().describe('Inventory policy, e.g. deny or continue. Example: "deny"'),
        inventory_tracker: z.boolean().optional().describe('Whether inventory is tracked for this variant. Example: true'),
        required_shipping: z.boolean().optional().describe('Whether the variant requires shipping. Example: true'),
        taxable: z.boolean().optional().describe('Whether the variant is taxable. Example: true'),
        image: z.unknown().optional().describe('Image ID or image object for the variant.')
    })
    .describe('Input for creating a new product variant.');

const ProviderVariantResponseSchema = z.object({
    variant: z.object({
        id: z.string(),
        product_id: z.string(),
        price: z.string(),
        sku: z.string(),
        compare_at_price: z.string().nullable(),
        barcode: z.string().nullable(),
        weight: z.number().nullable(),
        weight_unit: z.string().nullable(),
        option1: z.string().nullable(),
        option2: z.string().nullable(),
        option3: z.string().nullable(),
        option4: z.string().nullable(),
        option5: z.string().nullable(),
        inventory_policy: z.string().nullable(),
        inventory_tracker: z.boolean().nullable(),
        required_shipping: z.boolean().nullable(),
        taxable: z.boolean().nullable(),
        image: z.unknown().nullable(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique variant ID.'),
        product_id: z.string().describe('Parent product ID.'),
        price: z.string().describe('Variant price.'),
        sku: z.string().describe('Variant SKU.'),
        compare_at_price: z.string().optional().describe('Compare-at price if set.'),
        barcode: z.string().optional().describe('Barcode if set.'),
        weight: z.number().optional().describe('Weight if set.'),
        weight_unit: z.string().optional().describe('Weight unit if set.'),
        option1: z.string().optional().describe('Option 1 value if set.'),
        option2: z.string().optional().describe('Option 2 value if set.'),
        option3: z.string().optional().describe('Option 3 value if set.'),
        option4: z.string().optional().describe('Option 4 value if set.'),
        option5: z.string().optional().describe('Option 5 value if set.'),
        inventory_policy: z.string().optional().describe('Inventory policy if set.'),
        inventory_tracker: z.boolean().optional().describe('Whether inventory is tracked.'),
        required_shipping: z.boolean().optional().describe('Whether shipping is required.'),
        taxable: z.boolean().optional().describe('Whether the variant is taxable.'),
        image: z.unknown().optional().describe('Image ID or image object if set.'),
        created_at: z.string().optional().describe('Creation timestamp.'),
        updated_at: z.string().optional().describe('Last update timestamp.')
    })
    .describe('The newly created product variant.');

const ProductResponseSchema = z.object({
    product: z.object({
        id: z.string(),
        options: z.array(z.object({ name: z.string(), values: z.array(z.string()) })).optional(),
        variants: z.array(z.object({ id: z.string() }).passthrough()).optional()
    })
});

/**
 * @tags: [read, write]
 * @tagReason: Reads the product to check its options before creating the variant, and creates the variant on the provider.
 * @pitfalls: Creating a variant with options on a product that previously had no options modifies the existing default variant with placeholder option values as a side effect. If the product already has options, the new variant must provide the same number of option values as all existing variants.
 */
const action = createAction({
    description: 'Create a new variant on a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products', 'write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const productResponse = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product/product-get
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}.json`,
            retries: 3
        });

        const productData = ProductResponseSchema.parse(productResponse.data);
        const product = productData.product;

        const hasOptionFields =
            input.option1 !== undefined ||
            input.option2 !== undefined ||
            input.option3 !== undefined ||
            input.option4 !== undefined ||
            input.option5 !== undefined;

        if (hasOptionFields && (!product.options || product.options.length === 0)) {
            const options = [];
            const optionValues = [input.option1, input.option2, input.option3, input.option4, input.option5];
            for (let i = 0; i < optionValues.length; i++) {
                const value = optionValues[i];
                if (value !== undefined) {
                    options.push({
                        name: `Option ${i + 1}`,
                        values: [value]
                    });
                }
            }

            const updatedVariants =
                product.variants?.map((v) => ({
                    id: v.id,
                    option1: input.option1 !== undefined ? 'Default' : undefined,
                    option2: input.option2 !== undefined ? 'Default' : undefined,
                    option3: input.option3 !== undefined ? 'Default' : undefined,
                    option4: input.option4 !== undefined ? 'Default' : undefined,
                    option5: input.option5 !== undefined ? 'Default' : undefined
                })) ?? [];

            await nango.put({
                // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product/product-update
                endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}.json`,
                data: {
                    product: {
                        options: options,
                        variants: updatedVariants
                    }
                },
                retries: 3
            });
        }

        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product/variant-create
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}/variants.json`,
            data: {
                variant: {
                    price: input.price,
                    sku: input.sku,
                    ...(input.compare_at_price !== undefined && { compare_at_price: input.compare_at_price }),
                    ...(input.barcode !== undefined && { barcode: input.barcode }),
                    ...(input.weight !== undefined && { weight: input.weight }),
                    ...(input.weight_unit !== undefined && { weight_unit: input.weight_unit }),
                    ...(input.option1 !== undefined && { option1: input.option1 }),
                    ...(input.option2 !== undefined && { option2: input.option2 }),
                    ...(input.option3 !== undefined && { option3: input.option3 }),
                    ...(input.option4 !== undefined && { option4: input.option4 }),
                    ...(input.option5 !== undefined && { option5: input.option5 }),
                    ...(input.inventory_policy !== undefined && { inventory_policy: input.inventory_policy }),
                    ...(input.inventory_tracker !== undefined && { inventory_tracker: input.inventory_tracker }),
                    ...(input.required_shipping !== undefined && { required_shipping: input.required_shipping }),
                    ...(input.taxable !== undefined && { taxable: input.taxable }),
                    ...(input.image !== undefined && { image: input.image })
                }
            },
            retries: 3
        });

        const providerVariant = ProviderVariantResponseSchema.parse(response.data).variant;

        return {
            id: providerVariant.id,
            product_id: providerVariant.product_id,
            price: providerVariant.price,
            sku: providerVariant.sku,
            ...(providerVariant.compare_at_price != null && { compare_at_price: providerVariant.compare_at_price }),
            ...(providerVariant.barcode != null && { barcode: providerVariant.barcode }),
            ...(providerVariant.weight != null && { weight: providerVariant.weight }),
            ...(providerVariant.weight_unit != null && { weight_unit: providerVariant.weight_unit }),
            ...(providerVariant.option1 != null && { option1: providerVariant.option1 }),
            ...(providerVariant.option2 != null && { option2: providerVariant.option2 }),
            ...(providerVariant.option3 != null && { option3: providerVariant.option3 }),
            ...(providerVariant.option4 != null && { option4: providerVariant.option4 }),
            ...(providerVariant.option5 != null && { option5: providerVariant.option5 }),
            ...(providerVariant.inventory_policy != null && { inventory_policy: providerVariant.inventory_policy }),
            ...(providerVariant.inventory_tracker != null && { inventory_tracker: providerVariant.inventory_tracker }),
            ...(providerVariant.required_shipping != null && { required_shipping: providerVariant.required_shipping }),
            ...(providerVariant.taxable != null && { taxable: providerVariant.taxable }),
            ...(providerVariant.image != null && { image: providerVariant.image }),
            ...(providerVariant.created_at !== undefined && { created_at: providerVariant.created_at }),
            ...(providerVariant.updated_at !== undefined && { updated_at: providerVariant.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
