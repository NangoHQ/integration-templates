import { z } from 'zod';
import { createAction } from 'nango';

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const CardShippingAddressSchema = z.object({
    address1: z.string().optional().describe('First line of the street address. Example: "28 W 23rd St"'),
    address2: z.string().nullable().optional().describe('Second line of the street address, or null when not provided.'),
    city: z.string().optional().describe('City of the address. Example: "New York"'),
    country: z.string().optional().describe('Country code of the address. Example: "US"'),
    first_name: z.string().optional().describe('Recipient first name.'),
    last_name: z.string().optional().describe('Recipient last name.'),
    phone: z.string().nullable().optional().describe('Recipient phone number, or null when not provided.'),
    postal_code: z.string().optional().describe('Postal or ZIP code of the address.'),
    state: z.string().nullable().optional().describe('State or region code of the address, or null when not applicable.')
});

const CardPersonalizationNameLineSchema = z.object({
    value: z.string().optional().describe('Text printed on the card for this name line. Example: "David Wallace"')
});

const CardPersonalizationTextSchema = z.object({
    name_line_1: CardPersonalizationNameLineSchema.optional().describe('First personalization name line.'),
    name_line_2: CardPersonalizationNameLineSchema.optional().describe('Second personalization name line.')
});

const CardPersonalizationSchema = z.object({
    text: CardPersonalizationTextSchema.optional().describe('Text personalization applied to the card.')
});

const CardShippingSchema = z.object({
    method: z.string().nullable().optional().describe('Shipping method used for the card. Example: "LOCAL_MAIL"'),
    recipient_address: CardShippingAddressSchema.optional().describe('Address the card is shipped to.'),
    recipient_address_verification_state: z.string().nullable().optional().describe('Verification state of the recipient address, or null when unknown.'),
    return_address: CardShippingAddressSchema.nullable().optional().describe('Return address for the shipment, or null when not set.')
});

const CardFulfillmentSchema = z.object({
    fulfillment_status: z.string().optional().describe('Fulfillment status of the card. Example: "DELIVERED"'),
    shipping: CardShippingSchema.optional().describe('Shipping details for the card.'),
    shipping_date: z.string().nullable().optional().describe('ISO 8601 date the card shipped, or null when it has not shipped.'),
    shipping_eta: z.string().nullable().optional().describe('ISO 8601 estimated arrival time, or null when unknown.'),
    shipping_tracking_url: z.string().nullable().optional().describe('Carrier tracking URL, or null when unavailable.'),
    card_personalization: CardPersonalizationSchema.optional().describe('Personalization applied to the card.')
});

const PhysicalCardSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the card.'),
    cardholder_id: z.string().optional().describe('Unique identifier of the cardholder.'),
    cardholder_name: z.string().optional().describe('Full name of the cardholder.'),
    display_name: z.string().optional().describe('Cosmetic display name of the card.'),
    expiration: z.string().optional().describe('Expiration date in MMYY format. Example: "0930"'),
    last_four: z.string().optional().describe('Last four digits of the card number, or "*REDACTED*" for cards that are not active.'),
    is_physical: z.boolean().optional().describe('Whether the card is a physical card.'),
    is_primary: z.boolean().optional().describe('Whether this is the cardholder primary card.'),
    is_suspended: z.boolean().optional().describe('Whether the card is currently suspended.'),
    has_program_overridden: z.boolean().optional().describe('Whether the card overrides its card program defaults.'),
    state: z.string().optional().describe('Card state: ACTIVE, CHIP_LOCKED, SUSPENDED, TERMINATED, or UNACTIVATED.'),
    automatic_routing_enabled: z.boolean().optional().describe('Whether automatic routing is enabled for the card.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the card was created.'),
    fund_id: z.string().nullable().optional().describe('Identifier of the fund associated with the card, or null when not linked.'),
    fulfillment: CardFulfillmentSchema.nullable().optional().describe('Fulfillment and shipping details, or null when unavailable.')
});

const InputSchema = z
    .object({
        user_id: z
            .string()
            .regex(UUID_PATTERN, 'Must be a valid UUID')
            .optional()
            .describe('Only return cards owned by this user ID. Example: "07323c8f-c449-4222-a970-8cc4cf673711"'),
        display_name: z.string().optional().describe('Only return cards whose display name matches this value. Example: "Physical Card"'),
        include_activated_only: z
            .boolean()
            .optional()
            .describe(
                'When true, only activated cards are returned. The provider defaults this to true, so non-activated cards are excluded unless set to false.'
            ),
        include_terminated_only: z.boolean().optional().describe('When true, only terminated cards are returned. The provider defaults this to false.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of cards to return per page, between 2 and 100. The provider default is 20.'),
        cursor: z
            .string()
            .regex(UUID_PATTERN, 'Must be a valid UUID')
            .optional()
            .describe('Pagination cursor from a previous response (the ID of the last card on that page). Omit to fetch the first page.')
    })
    .describe('Filters and pagination options for listing physical cards.');

const OutputSchema = z
    .object({
        cards: z.array(PhysicalCardSchema).describe('Physical cards issued to employees for the business.'),
        next_cursor: z.string().optional().describe('Cursor to pass as `cursor` to fetch the next page. Omitted when there are no more cards.')
    })
    .describe('A single page of physical cards plus a cursor for the next page.');

const ResponseSchema = z.object({
    data: z.array(PhysicalCardSchema),
    page: z
        .object({
            next: z.string().nullable()
        })
        .optional()
});

function extractNextCursor(next: string | null | undefined): string | undefined {
    if (!next) {
        return undefined;
    }

    const match = /[?&]start=([^&]+)/.exec(next);

    if (!match || !match[1]) {
        return undefined;
    }

    return decodeURIComponent(match[1]);
}

/**
 * @tags: [read]
 * @tagReason: Lists physical cards from Ramp without modifying any provider state.
 * @pitfalls: The provider defaults include_activated_only to true, so omitting it returns only ACTIVE cards (pass false to also get UNACTIVATED, SUSPENDED, and TERMINATED cards); last_four and expiration are returned as "*REDACTED*" for any card that is not active.
 */
const action = createAction({
    description: 'List physical cards issued to employees.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/developer-api/v1/api/physical-cards
        const response = await nango.get({
            endpoint: '/developer/v1/cards/physical',
            params: {
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.display_name !== undefined && { display_name: input.display_name }),
                ...(input.include_activated_only !== undefined && { include_activated_only: input.include_activated_only ? 'true' : 'false' }),
                ...(input.include_terminated_only !== undefined && { include_terminated_only: input.include_terminated_only ? 'true' : 'false' }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.cursor !== undefined && { start: input.cursor })
            },
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);
        const nextCursor = extractNextCursor(parsed.page?.next);

        return {
            cards: parsed.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
