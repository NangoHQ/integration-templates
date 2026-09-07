import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        variant_id: z.string().describe('The ID of the product variant to update. Example: "18076831074843078207351755"'),
        option1: z.string().nullable().optional().describe('The first option value for the variant. Example: "black"'),
        option2: z.string().nullable().optional().describe('The second option value for the variant. Example: "S"'),
        option3: z.string().nullable().optional().describe('The third option value for the variant.'),
        option4: z.string().nullable().optional().describe('The fourth option value for the variant.'),
        option5: z.string().nullable().optional().describe('The fifth option value for the variant.'),
        sku: z.string().nullable().optional().describe('The SKU for the variant. Example: "240"'),
        barcode: z.string().nullable().optional().describe('The barcode for the variant. Example: "273847"'),
        price: z.string().nullable().optional().describe('The price of the variant. Example: "24.99"'),
        compare_at_price: z.string().nullable().optional().describe('The compare-at price of the variant. Example: "29.99"'),
        weight: z.string().nullable().optional().describe('The weight of the variant. Example: "500.00"'),
        weight_unit: z.string().nullable().optional().describe('The unit of weight. Example: "g"'),
        inventory_tracker: z.boolean().nullable().optional().describe('Whether inventory is tracked for this variant.'),
        inventory_policy: z.string().nullable().optional().describe('The inventory policy. Example: "deny" or "continue".'),
        required_shipping: z.boolean().nullable().optional().describe('Whether the variant requires shipping.'),
        taxable: z.boolean().nullable().optional().describe('Whether the variant is taxable.'),
        image: z
            .object({
                id: z.string().optional().describe('The image ID.'),
                src: z.string().optional().describe('The image source URL.'),
                alt: z.string().nullable().optional().describe('Alternative text for the image.')
            })
            .passthrough()
            .nullable()
            .optional()
            .describe('The image associated with the variant.')
    })
    .describe('Input to update a product variant.');

const ProviderVariantSchema = z.object({
    id: z.string(),
    product_id: z.string(),
    title: z.string().optional(),
    price: z.string(),
    compare_at_price: z.string().nullable().optional(),
    sku: z.string(),
    barcode: z.string().nullable().optional(),
    weight: z.string(),
    weight_unit: z.string(),
    inventory_quantity: z.number().nullable().optional(),
    inventory_policy: z.string(),
    inventory_tracker: z.boolean(),
    inventory_item_id: z.string(),
    required_shipping: z.boolean(),
    taxable: z.boolean(),
    option1: z.string().nullable().optional(),
    option2: z.string().nullable().optional(),
    option3: z.string().nullable().optional(),
    option4: z.string().nullable().optional(),
    option5: z.string().nullable().optional(),
    image: z
        .object({
            id: z.string().optional(),
            src: z.string().optional(),
            alt: z.string().nullable().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier for the variant.'),
        product_id: z.string().describe('The product ID the variant belongs to.'),
        title: z.string().optional().describe('The display title of the variant.'),
        price: z.string().describe('The price of the variant.'),
        compare_at_price: z.string().optional().describe('The compare-at price of the variant.'),
        sku: z.string().optional().describe('The SKU for the variant.'),
        barcode: z.string().optional().describe('The barcode for the variant.'),
        weight: z.string().optional().describe('The weight of the variant.'),
        weight_unit: z.string().optional().describe('The unit of weight.'),
        inventory_quantity: z.number().optional().describe('The current inventory quantity.'),
        inventory_policy: z.string().describe('The inventory policy.'),
        inventory_tracker: z.boolean().describe('Whether inventory tracking is enabled.'),
        inventory_item_id: z.string().describe('The inventory item ID.'),
        required_shipping: z.boolean().describe('Whether shipping is required.'),
        taxable: z.boolean().describe('Whether the variant is taxable.'),
        option1: z.string().optional().describe('The first option value.'),
        option2: z.string().optional().describe('The second option value.'),
        option3: z.string().optional().describe('The third option value.'),
        option4: z.string().optional().describe('The fourth option value.'),
        option5: z.string().optional().describe('The fifth option value.'),
        image: z
            .object({
                id: z.string().optional().describe('The image ID.'),
                src: z.string().optional().describe('The image source URL.'),
                alt: z.string().nullable().optional().describe('Alternative text for the image.')
            })
            .passthrough()
            .optional()
            .describe('The image associated with the variant.')
    })
    .describe('The updated product variant.');

/**
 * @tags: [write]
 * @tagReason: Mutates the product variant by sending a PUT request to the provider.
 * @pitfalls: The provider uses `require_shipping` in product reads but `required_shipping` in updates; ensure inputs use `required_shipping`.
 */
const action = createAction({
    description: "Update a product variant's fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            variant: {
                ...(input.option1 !== undefined && { option1: input.option1 }),
                ...(input.option2 !== undefined && { option2: input.option2 }),
                ...(input.option3 !== undefined && { option3: input.option3 }),
                ...(input.option4 !== undefined && { option4: input.option4 }),
                ...(input.option5 !== undefined && { option5: input.option5 }),
                ...(input.sku !== undefined && { sku: input.sku }),
                ...(input.barcode !== undefined && { barcode: input.barcode }),
                ...(input.price !== undefined && { price: input.price }),
                ...(input.compare_at_price !== undefined && { compare_at_price: input.compare_at_price }),
                ...(input.weight !== undefined && { weight: input.weight }),
                ...(input.weight_unit !== undefined && { weight_unit: input.weight_unit }),
                ...(input.inventory_tracker !== undefined && { inventory_tracker: input.inventory_tracker }),
                ...(input.inventory_policy !== undefined && { inventory_policy: input.inventory_policy }),
                ...(input.required_shipping !== undefined && { required_shipping: input.required_shipping }),
                ...(input.taxable !== undefined && { taxable: input.taxable }),
                ...(input.image !== undefined && { image: input.image })
            }
        };

        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product-variant/update-a-variant
        const response = await nango.put({
            endpoint: `/admin/openapi/v20260601/products/variants/${encodeURIComponent(input.variant_id)}.json`,
            data: body,
            retries: 3
        });

        const providerResponse = z
            .object({
                variant: ProviderVariantSchema
            })
            .parse(response.data);

        const providerVariant = providerResponse.variant;

        return {
            id: providerVariant.id,
            product_id: providerVariant.product_id,
            ...(providerVariant.title !== undefined && { title: providerVariant.title }),
            price: providerVariant.price,
            ...(providerVariant.compare_at_price != null && { compare_at_price: providerVariant.compare_at_price }),
            ...(providerVariant.sku !== undefined && { sku: providerVariant.sku }),
            ...(providerVariant.barcode != null && { barcode: providerVariant.barcode }),
            ...(providerVariant.weight !== undefined && { weight: providerVariant.weight }),
            ...(providerVariant.weight_unit !== undefined && { weight_unit: providerVariant.weight_unit }),
            ...(providerVariant.inventory_quantity != null && { inventory_quantity: providerVariant.inventory_quantity }),
            inventory_policy: providerVariant.inventory_policy,
            inventory_tracker: providerVariant.inventory_tracker,
            inventory_item_id: providerVariant.inventory_item_id,
            required_shipping: providerVariant.required_shipping,
            taxable: providerVariant.taxable,
            ...(providerVariant.option1 != null && { option1: providerVariant.option1 }),
            ...(providerVariant.option2 != null && { option2: providerVariant.option2 }),
            ...(providerVariant.option3 != null && { option3: providerVariant.option3 }),
            ...(providerVariant.option4 != null && { option4: providerVariant.option4 }),
            ...(providerVariant.option5 != null && { option5: providerVariant.option5 }),
            ...(providerVariant.image != null && { image: providerVariant.image })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
