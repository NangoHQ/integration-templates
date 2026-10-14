import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        card_id: z.string().describe('Unique identifier of the physical card to resume. Example: "58cb9b33-d372-4aa1-825f-30bf11ef3fc1"')
    })
    .describe('Input for reversing a suspension on a physical card.');

const FulfillmentAddressSchema = z.object({
    address1: z.string().optional().describe('Street address line 1 of the card shipping destination.'),
    address2: z.string().nullable().optional().describe('Street address line 2 of the card shipping destination, if provided.'),
    city: z.string().optional().describe('City of the card shipping destination.'),
    country: z.string().optional().describe('Country of the card shipping destination.'),
    first_name: z.string().optional().describe('Recipient first name on the shipping address.'),
    last_name: z.string().optional().describe('Recipient last name on the shipping address.'),
    phone: z.string().nullable().optional().describe('Recipient phone number on the shipping address, if provided.'),
    postal_code: z.string().optional().describe('Postal code of the card shipping destination.'),
    state: z.string().nullable().optional().describe('State or region of the card shipping destination, if provided.')
});

const FulfillmentSchema = z.object({
    fulfillment_status: z.string().optional().describe('Fulfillment status of the card, for example "DELIVERED", "ISSUED", or "SHIPPED".'),
    shipping_date: z.string().nullable().optional().describe('ISO 8601 date the card was shipped, if shipped.'),
    shipping_eta: z.string().nullable().optional().describe('ISO 8601 estimated arrival time of the card, if available.'),
    shipping_tracking_url: z.string().nullable().optional().describe('Tracking URL for the card shipment, if available.'),
    shipping: z
        .object({
            method: z.string().nullable().optional().describe('Shipping method used for the card, for example "LOCAL_MAIL".'),
            recipient_address: FulfillmentAddressSchema.nullable().optional().describe('Shipping destination address for the card.')
        })
        .nullable()
        .optional()
        .describe('Shipping details for the physical card.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the physical card.'),
        state: z
            .string()
            .describe(
                'Provider state of the card: ACTIVE, CHIP_LOCKED, SUSPENDED, TERMINATED, or UNACTIVATED. Suspension is tracked separately in is_suspended.'
            ),
        is_suspended: z.boolean().describe('Whether the card is currently suspended. False after a successful resume.'),
        display_name: z.string().describe('Cosmetic display name of the card.'),
        cardholder_id: z.string().optional().describe('Unique identifier of the cardholder user.'),
        cardholder_name: z.string().optional().describe('Full name of the cardholder.'),
        last_four: z.string().optional().describe('Last four digits of the card number. Redacted to "*REDACTED*" for suspended or terminated cards.'),
        expiration: z.string().optional().describe('Card expiration date in MMYY format. Redacted to "*REDACTED*" for suspended or terminated cards.'),
        is_physical: z.boolean().optional().describe('Whether the card is a physical card.'),
        is_primary: z.boolean().optional().describe('Whether this is the cardholder primary card.'),
        automatic_routing_enabled: z.boolean().optional().describe('Whether automatic routing is enabled for the card.'),
        has_program_overridden: z.boolean().optional().describe('Whether the card overrides the default settings of its card program.'),
        fund_id: z.string().nullable().optional().describe('Unique identifier of the fund the card belongs to, if any.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the card was created.'),
        fulfillment: FulfillmentSchema.nullable().optional().describe('Fulfillment details for the physical card, if available.')
    })
    .describe('The physical card after its suspension was reversed.');

/**
 * @tags: [write]
 * @tagReason: Reverses a card suspension by mutating the card's provider-side suspension state.
 * @pitfalls: Resuming a card that is not currently suspended fails with a provider error ("Cannot unsuspend card. It may already be unsuspended."); a suspended card's `state` stays `ACTIVE` while `is_suspended` is true, so detect suspension via `is_suspended`, not `state`.
 */
const action = createAction({
    description: 'Reverse a suspension on a physical card.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/openapi/developer-api.json - DELETE /developer/v1/cards/physical/{card_id}/suspension
        const response = await nango.delete({
            endpoint: `/developer/v1/cards/physical/${encodeURIComponent(input.card_id)}/suspension`,
            // Non-idempotent: a retry after a lost response hits the provider's "already unsuspended" error.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
