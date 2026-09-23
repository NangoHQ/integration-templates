import { z } from 'zod';
import { createAction } from 'nango';

const NoteAttributeSchema = z.object({
    name: z.string().describe('The name of the note attribute.'),
    value: z.string().describe('The value of the note attribute.')
});

const ShippingAddressInputSchema = z.object({
    first_name: z.string().optional().describe('First name for the shipping address.'),
    last_name: z.string().optional().describe('Last name for the shipping address.'),
    address1: z.string().optional().describe('Street address line 1.'),
    address2: z.string().optional().describe('Street address line 2.'),
    city: z.string().optional().describe('City name.'),
    province: z.string().optional().describe('Province or state name.'),
    country: z.string().optional().describe('Country name.'),
    zip: z.string().optional().describe('Postal or ZIP code.'),
    phone: z.string().optional().describe('Phone number for the shipping address.')
});

const ShippingAddressOutputSchema = z.object({
    first_name: z.string().optional().describe('First name for the shipping address.'),
    last_name: z.string().optional().describe('Last name for the shipping address.'),
    address1: z.string().optional().describe('Street address line 1.'),
    address2: z.string().optional().describe('Street address line 2.'),
    city: z.string().optional().describe('City name.'),
    province: z.string().optional().describe('Province or state name.'),
    country: z.string().optional().describe('Country name.'),
    zip: z.string().optional().describe('Postal or ZIP code.'),
    phone: z.string().optional().describe('Phone number for the shipping address.')
});

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the order to update.'),
        note_attributes: z.array(NoteAttributeSchema).optional().describe('Array of note attributes to attach to the order.'),
        phone: z.string().optional().describe('Customer phone number.'),
        area_code: z.string().optional().describe('Phone area code.'),
        shipping_address: ShippingAddressInputSchema.optional().describe('Shipping address to update.'),
        tags: z.string().optional().describe('Tags to apply to the order. Stored as a JSON-array-encoded string by the provider.'),
        customer_id: z.string().optional().describe('Customer ID to associate with the order.'),
        email: z.string().optional().describe('Customer email address.')
    })
    .describe('Input for updating a SHOPLINE order.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the order.'),
        name: z.string().describe('The order name or number.'),
        email: z.string().optional().describe('The customer email address.'),
        phone: z.string().optional().describe('The customer phone number.'),
        area_code: z.string().optional().describe('The phone area code.'),
        shipping_address: ShippingAddressOutputSchema.optional().describe('The updated shipping address.'),
        tags: z.string().optional().describe('The order tags. Stored as a JSON-array-encoded string by the provider.'),
        note_attributes: z.array(NoteAttributeSchema).optional().describe('Array of note attributes on the order.'),
        customer_id: z.string().optional().describe('The customer ID associated with the order.'),
        financial_status: z.string().optional().describe('The financial status of the order.'),
        current_total_price: z.string().optional().describe('The current total price of the order.'),
        updated_at: z.string().optional().describe('The timestamp when the order was last updated.')
    })
    .describe('The updated SHOPLINE order.');

const ProviderShippingAddressSchema = z.object({
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const ProviderNoteAttributeSchema = z.object({
    name: z.string(),
    value: z.string()
});

const ProviderOrderSchema = z.object({
    order: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        area_code: z.string().nullable().optional(),
        shipping_address: ProviderShippingAddressSchema.nullable().optional(),
        tags: z.string().nullable().optional(),
        note_attributes: z.array(ProviderNoteAttributeSchema).nullable().optional(),
        customer: z
            .object({
                id: z.string()
            })
            .nullable()
            .optional(),
        financial_status: z.string().nullable().optional(),
        current_total_price: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional()
    })
});

/**
 * @tags: [write]
 * @tagReason: Updates an existing order by making a PUT request to the provider.
 * @pitfalls: Updating order phone requires area_code; omitting it causes a validation error. The provider stores tags as a JSON-array-encoded string, unlike product or collection tags.
 */
const action = createAction({
    description: "Update an order's fields (notes, tags, contact info, shipping address).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orderBody: Record<string, unknown> = {};

        if (input.note_attributes !== undefined) {
            orderBody['note_attributes'] = input.note_attributes;
        }
        if (input.phone !== undefined) {
            orderBody['phone'] = input.phone;
        }
        if (input.area_code !== undefined) {
            orderBody['area_code'] = input.area_code;
        }
        if (input.shipping_address !== undefined) {
            orderBody['shipping_address'] = input.shipping_address;
        }
        if (input.tags !== undefined) {
            orderBody['tags'] = input.tags;
        }
        if (input.customer_id !== undefined) {
            orderBody['customer_id'] = input.customer_id;
        }
        if (input.email !== undefined) {
            orderBody['email'] = input.email;
        }

        // https://developer.shopline.com/docs/admin-rest-api/v20260601/order/order-management/update-an-order
        const response = await nango.put({
            endpoint: `/admin/openapi/v20260601/orders/${encodeURIComponent(input.id)}.json`,
            data: {
                order: orderBody
            },
            retries: 3
        });

        const providerData = ProviderOrderSchema.parse(response.data);
        const order = providerData.order;

        return {
            id: order.id,
            name: order.name,
            ...(order.email != null && { email: order.email }),
            ...(order.phone != null && { phone: order.phone }),
            ...(order.area_code != null && { area_code: order.area_code }),
            ...(order.shipping_address != null && {
                shipping_address: {
                    ...(order.shipping_address.first_name != null && { first_name: order.shipping_address.first_name }),
                    ...(order.shipping_address.last_name != null && { last_name: order.shipping_address.last_name }),
                    ...(order.shipping_address.address1 != null && { address1: order.shipping_address.address1 }),
                    ...(order.shipping_address.address2 != null && { address2: order.shipping_address.address2 }),
                    ...(order.shipping_address.city != null && { city: order.shipping_address.city }),
                    ...(order.shipping_address.province != null && { province: order.shipping_address.province }),
                    ...(order.shipping_address.country != null && { country: order.shipping_address.country }),
                    ...(order.shipping_address.zip != null && { zip: order.shipping_address.zip }),
                    ...(order.shipping_address.phone != null && { phone: order.shipping_address.phone })
                }
            }),
            ...(order.tags != null && { tags: order.tags }),
            ...(order.note_attributes != null && { note_attributes: order.note_attributes }),
            ...(order.customer != null && { customer_id: order.customer.id }),
            ...(order.financial_status != null && { financial_status: order.financial_status }),
            ...(order.current_total_price != null && { current_total_price: order.current_total_price }),
            ...(order.updated_at != null && { updated_at: order.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
