import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        card_id: z.string().describe('Unique identifier of the physical card to retrieve. Example: "71000592-c11d-4b35-9111-9e5a8b0674e3"')
    })
    .describe('Input for retrieving a single physical card.');

const CardStateSchema = z.enum(['ACTIVE', 'CHIP_LOCKED', 'SUSPENDED', 'TERMINATED', 'UNACTIVATED']);

const AddressSchema = z.object({
    address1: z.string().optional().describe('First line of the shipping address.'),
    address2: z.string().nullable().optional().describe('Second line of the shipping address, when present.'),
    city: z.string().optional().describe('City of the shipping address.'),
    country: z.string().optional().describe('ISO country code of the shipping address. Example: "US"'),
    first_name: z.string().optional().describe('First name of the shipping recipient.'),
    last_name: z.string().optional().describe('Last name of the shipping recipient.'),
    phone: z.string().nullable().optional().describe('Phone number of the shipping recipient, when present.'),
    postal_code: z.string().optional().describe('Postal code of the shipping address.'),
    state: z.string().nullable().optional().describe('State or region of the shipping address, when present.')
});

const CardShippingSchema = z.object({
    method: z.string().nullable().optional().describe('Shipping method used to deliver the card. Example: "LOCAL_MAIL"'),
    recipient_address: AddressSchema.optional().describe('Address the card was shipped to.'),
    recipient_address_verification_state: z
        .enum(['NOT_VERIFIED', 'OVERRIDEN', 'VERIFIED'])
        .nullable()
        .optional()
        .describe('Verification state of the recipient shipping address.'),
    return_address: AddressSchema.nullable().optional().describe('Return address for the card shipment, when present.')
});

const CardPersonalizationNameLineSchema = z.object({
    value: z.string().nullable().optional().describe('Text value printed on the card for this personalization line, or null when blank.')
});

const CardPersonalizationTextSchema = z.object({
    name_line_1: CardPersonalizationNameLineSchema.optional().describe('First personalization line printed on the card.'),
    name_line_2: CardPersonalizationNameLineSchema.optional().describe('Second personalization line printed on the card.')
});

const CardPersonalizationSchema = z.object({
    text: CardPersonalizationTextSchema.optional().describe('Text personalization printed on the card.')
});

const FulfillmentSchema = z.object({
    fulfillment_status: z
        .enum(['DELIVERED', 'DIGITALLY_PRESENTED', 'ISSUED', 'ORDERED', 'REJECTED', 'SHIPPED'])
        .optional()
        .describe('Current fulfillment status of the physical card.'),
    shipping: CardShippingSchema.optional().describe('Shipping details for the physical card.'),
    shipping_date: z.string().nullable().optional().describe('ISO 8601 date the card was shipped, when available.'),
    shipping_eta: z.string().nullable().optional().describe('ISO 8601 estimated arrival time, when available.'),
    shipping_tracking_url: z.string().nullable().optional().describe('Tracking URL for the card shipment, when available.'),
    cardholder_uuid: z.string().nullable().optional().describe('Unique identifier of the cardholder associated with the shipment, when present.'),
    card_personalization: CardPersonalizationSchema.optional().describe('Personalization details printed on the physical card.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the physical card.'),
        cardholder_id: z.string().optional().describe('Unique identifier of the cardholder.'),
        cardholder_name: z.string().optional().describe('Full name of the cardholder.'),
        display_name: z.string().describe('Cosmetic display name of the card.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp at which the card was created.'),
        expiration: z.string().describe('Expiration date in MMYY format, or "*REDACTED*" once the card is suspended or terminated.'),
        last_four: z.string().describe('Last four digits of the card number, or "*REDACTED*" once the card is suspended or terminated.'),
        is_physical: z.boolean().optional().describe('Whether this is a physical card.'),
        is_primary: z.boolean().optional().describe('Whether this is the primary card for the cardholder.'),
        is_suspended: z.boolean().describe('Whether the card is currently suspended.'),
        has_program_overridden: z.boolean().describe('Whether the card overrides the default settings from its card program.'),
        automatic_routing_enabled: z.boolean().optional().describe('Whether automatic routing is enabled for the card.'),
        state: CardStateSchema.optional().describe('Current state of the physical card.'),
        fund_id: z.string().nullable().optional().describe('Unique identifier of the fund associated with the card, when present.'),
        fulfillment: FulfillmentSchema.nullable().describe('Fulfillment details for the physical card, when available.')
    })
    .describe('A single physical card.');

const ProviderAddressSchema = z.object({
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    state: z.string().nullable().optional()
});

const ProviderNameLineSchema = z.object({ value: z.string().nullable().optional() }).nullable().optional();

const ProviderPhysicalCardSchema = z.object({
    id: z.string(),
    cardholder_id: z.string().nullable().optional(),
    cardholder_name: z.string().nullable().optional(),
    display_name: z.string(),
    created_at: z.string().nullable().optional(),
    expiration: z.string(),
    last_four: z.string(),
    is_physical: z.boolean().nullable().optional(),
    is_primary: z.boolean().nullable().optional(),
    is_suspended: z.boolean(),
    has_program_overridden: z.boolean(),
    automatic_routing_enabled: z.boolean().nullable().optional(),
    state: CardStateSchema.nullable().optional(),
    fund_id: z.string().nullable().optional(),
    fulfillment: z
        .object({
            fulfillment_status: z.enum(['DELIVERED', 'DIGITALLY_PRESENTED', 'ISSUED', 'ORDERED', 'REJECTED', 'SHIPPED']).nullable().optional(),
            shipping: z
                .object({
                    method: z.string().nullable().optional(),
                    recipient_address: ProviderAddressSchema.nullable().optional(),
                    recipient_address_verification_state: z.enum(['NOT_VERIFIED', 'OVERRIDEN', 'VERIFIED']).nullable().optional(),
                    return_address: ProviderAddressSchema.nullable().optional()
                })
                .nullable()
                .optional(),
            shipping_date: z.string().nullable().optional(),
            shipping_eta: z.string().nullable().optional(),
            shipping_tracking_url: z.string().nullable().optional(),
            cardholder_uuid: z.string().nullable().optional(),
            card_personalization: z
                .object({
                    text: z
                        .object({
                            name_line_1: ProviderNameLineSchema,
                            name_line_2: ProviderNameLineSchema
                        })
                        .nullable()
                        .optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional()
});

function mapAddress(address: z.infer<typeof ProviderAddressSchema>): z.infer<typeof AddressSchema> {
    return {
        ...(address.address1 != null && { address1: address.address1 }),
        ...(address.address2 !== undefined && { address2: address.address2 }),
        ...(address.city != null && { city: address.city }),
        ...(address.country != null && { country: address.country }),
        ...(address.first_name != null && { first_name: address.first_name }),
        ...(address.last_name != null && { last_name: address.last_name }),
        ...(address.phone !== undefined && { phone: address.phone }),
        ...(address.postal_code != null && { postal_code: address.postal_code }),
        ...(address.state !== undefined && { state: address.state })
    };
}

function mapFulfillment(fulfillment: NonNullable<z.infer<typeof ProviderPhysicalCardSchema>['fulfillment']>): z.infer<typeof FulfillmentSchema> {
    const shipping = fulfillment.shipping;
    const text = fulfillment.card_personalization?.text;
    return {
        ...(fulfillment.fulfillment_status != null && { fulfillment_status: fulfillment.fulfillment_status }),
        ...(shipping != null && {
            shipping: {
                ...(shipping.method !== undefined && { method: shipping.method }),
                ...(shipping.recipient_address != null && { recipient_address: mapAddress(shipping.recipient_address) }),
                ...(shipping.recipient_address_verification_state !== undefined && {
                    recipient_address_verification_state: shipping.recipient_address_verification_state
                }),
                ...(shipping.return_address !== undefined && {
                    return_address: shipping.return_address === null ? null : mapAddress(shipping.return_address)
                })
            }
        }),
        ...(fulfillment.shipping_date !== undefined && { shipping_date: fulfillment.shipping_date }),
        ...(fulfillment.shipping_eta !== undefined && { shipping_eta: fulfillment.shipping_eta }),
        ...(fulfillment.shipping_tracking_url !== undefined && { shipping_tracking_url: fulfillment.shipping_tracking_url }),
        ...(fulfillment.cardholder_uuid !== undefined && { cardholder_uuid: fulfillment.cardholder_uuid }),
        ...(fulfillment.card_personalization != null && {
            card_personalization: {
                ...(text != null && {
                    text: {
                        ...(text.name_line_1 != null && { name_line_1: { ...(text.name_line_1.value !== undefined && { value: text.name_line_1.value }) } }),
                        ...(text.name_line_2 != null && { name_line_2: { ...(text.name_line_2.value !== undefined && { value: text.name_line_2.value }) } })
                    }
                })
            }
        })
    };
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single physical card without modifying any provider state.
 * @pitfalls: A terminated card is still returned successfully instead of not-found, and it reports is_suspended as false, so use state to judge whether a card is usable.
 */
const action = createAction({
    description: 'Retrieve a single physical card by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/cards/physical/{card_id}
            endpoint: `/developer/v1/cards/physical/${encodeURIComponent(input.card_id)}`,
            retries: 3
        };

        const response = await nango.get(config);
        const card = ProviderPhysicalCardSchema.parse(response.data);

        return {
            id: card.id,
            ...(card.cardholder_id != null && { cardholder_id: card.cardholder_id }),
            ...(card.cardholder_name != null && { cardholder_name: card.cardholder_name }),
            display_name: card.display_name,
            ...(card.created_at != null && { created_at: card.created_at }),
            expiration: card.expiration,
            last_four: card.last_four,
            ...(card.is_physical != null && { is_physical: card.is_physical }),
            ...(card.is_primary != null && { is_primary: card.is_primary }),
            is_suspended: card.is_suspended,
            has_program_overridden: card.has_program_overridden,
            ...(card.automatic_routing_enabled != null && { automatic_routing_enabled: card.automatic_routing_enabled }),
            ...(card.state != null && { state: card.state }),
            ...(card.fund_id !== undefined && { fund_id: card.fund_id }),
            fulfillment: card.fulfillment != null ? mapFulfillment(card.fulfillment) : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
