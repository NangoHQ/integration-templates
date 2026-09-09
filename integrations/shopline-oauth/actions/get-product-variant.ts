import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        variant_id: z.string().describe('The unique identifier of the product variant. Example: "18076831074843245979951755"'),
        fields: z.string().optional().describe('Comma-separated list of fields to return in the response. Omit to receive all fields.')
    })
    .describe('Input for retrieving a single product variant by its ID.');

const ProviderImageSchema = z.object({
    id: z.string(),
    src: z.string(),
    alt: z.string().nullable()
});

const ProviderVariantSchema = z.object({
    id: z.string().optional(),
    product_id: z.string().optional(),
    title: z.string().optional(),
    sku: z.string().nullable().optional(),
    price: z.string().optional(),
    compare_at_price: z.string().nullable().optional(),
    inventory_quantity: z.number().optional(),
    inventory_policy: z.string().optional(),
    inventory_item_id: z.string().optional(),
    inventory_tracker: z.boolean().optional(),
    required_shipping: z.boolean().optional(),
    taxable: z.boolean().optional(),
    weight: z.string().optional(),
    weight_unit: z.string().optional(),
    barcode: z.string().nullable().optional(),
    option1: z.string().nullable().optional(),
    option2: z.string().nullable().optional(),
    option3: z.string().nullable().optional(),
    option4: z.string().nullable().optional(),
    option5: z.string().nullable().optional(),
    image: ProviderImageSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    variant: ProviderVariantSchema
});

const ImageSchema = z
    .object({
        id: z.string().describe('The unique identifier of the image.'),
        src: z.string().describe('The URL of the image.'),
        alt: z.string().optional().describe('The alternative text for the image.')
    })
    .describe('An image associated with a product variant.');

const OutputSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the variant.'),
        product_id: z.string().optional().describe('The unique identifier of the parent product.'),
        title: z.string().optional().describe('The display title of the variant.'),
        sku: z.string().optional().describe('The stock keeping unit code for the variant.'),
        price: z.string().optional().describe('The selling price of the variant.'),
        compare_at_price: z.string().optional().describe('The original price before discount.'),
        inventory_quantity: z.number().optional().describe('The available inventory quantity for the variant.'),
        inventory_policy: z.string().optional().describe('The inventory policy, e.g. "continue" or "deny".'),
        inventory_item_id: z.string().optional().describe('The unique identifier of the inventory item.'),
        inventory_tracker: z.boolean().optional().describe('Whether inventory tracking is enabled for this variant.'),
        required_shipping: z.boolean().optional().describe('Whether the variant requires shipping.'),
        taxable: z.boolean().optional().describe('Whether the variant is subject to taxes.'),
        weight: z.string().optional().describe('The weight of the variant.'),
        weight_unit: z.string().optional().describe('The unit of weight, e.g. "g" or "kg".'),
        barcode: z.string().optional().describe('The barcode, UPC, or ISBN for the variant.'),
        option1: z.string().optional().describe('The first option value, e.g. "Yellow".'),
        option2: z.string().optional().describe('The second option value, e.g. "S".'),
        option3: z.string().optional().describe('The third option value.'),
        option4: z.string().optional().describe('The fourth option value.'),
        option5: z.string().optional().describe('The fifth option value.'),
        image: ImageSchema.optional().describe('The variant image.')
    })
    .describe('A single product variant returned from the provider.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single product variant by its ID from the provider.
 * @pitfalls: `inventory_quantity` is populated even when `inventory_tracker` is false, meaning inventory is not actively tracked for that variant.
 */
const action = createAction({
    description: 'Retrieve a single product variant by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/variants/get-variant
            endpoint: `/admin/openapi/v20260601/products/variants/${encodeURIComponent(input.variant_id)}.json`,
            params: {
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const variant = providerResponse.variant;

        return {
            ...(variant.id != null && { id: variant.id }),
            ...(variant.product_id != null && { product_id: variant.product_id }),
            ...(variant.title != null && { title: variant.title }),
            ...(variant.sku != null && { sku: variant.sku }),
            ...(variant.price != null && { price: variant.price }),
            ...(variant.compare_at_price != null && { compare_at_price: variant.compare_at_price }),
            ...(variant.inventory_quantity != null && { inventory_quantity: variant.inventory_quantity }),
            ...(variant.inventory_policy != null && { inventory_policy: variant.inventory_policy }),
            ...(variant.inventory_item_id != null && { inventory_item_id: variant.inventory_item_id }),
            ...(variant.inventory_tracker != null && { inventory_tracker: variant.inventory_tracker }),
            ...(variant.required_shipping != null && { required_shipping: variant.required_shipping }),
            ...(variant.taxable != null && { taxable: variant.taxable }),
            ...(variant.weight != null && { weight: variant.weight }),
            ...(variant.weight_unit != null && { weight_unit: variant.weight_unit }),
            ...(variant.barcode != null && { barcode: variant.barcode }),
            ...(variant.option1 != null && { option1: variant.option1 }),
            ...(variant.option2 != null && { option2: variant.option2 }),
            ...(variant.option3 != null && { option3: variant.option3 }),
            ...(variant.option4 != null && { option4: variant.option4 }),
            ...(variant.option5 != null && { option5: variant.option5 }),
            ...(variant.image != null && {
                image: {
                    id: variant.image.id,
                    src: variant.image.src,
                    ...(variant.image.alt != null && { alt: variant.image.alt })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
