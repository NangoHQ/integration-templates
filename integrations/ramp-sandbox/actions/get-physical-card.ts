import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        card_id: z.string().describe('Unique identifier of the physical card to retrieve. Example: "71000592-c11d-4b35-9111-9e5a8b0674e3"')
    })
    .describe('Input for retrieving a single physical card.');

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
    value: z.string().optional().describe('Text value printed on the card for this personalization line.')
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
        cardholder_id: z.string().describe('Unique identifier of the cardholder.'),
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
        state: z.enum(['ACTIVE', 'CHIP_LOCKED', 'SUSPENDED', 'TERMINATED', 'UNACTIVATED']).describe('Current state of the physical card.'),
        fund_id: z.string().nullable().optional().describe('Unique identifier of the fund associated with the card, when present.'),
        fulfillment: FulfillmentSchema.nullable().describe('Fulfillment details for the physical card, when available.')
    })
    .describe('A single physical card.');

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

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/cards/physical/{card_id}
            endpoint: `/developer/v1/cards/physical/${encodeURIComponent(input.card_id)}`,
            retries: 3
        };

        const response = await nango.get(config);
        const card = OutputSchema.parse(response.data);
        return card;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
