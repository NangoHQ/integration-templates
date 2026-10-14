import { z } from 'zod';
import { createAction } from 'nango';

const ShippingAddressInputSchema = z.object({
    address1: z.string().describe('Street address, line 1. Example: "123 Main St".'),
    address2: z.string().optional().describe('Street address, line 2 such as a suite or apartment number.'),
    city: z.string().describe('City of the shipping address. Example: "New York City".'),
    state: z.string().optional().describe('State or province code. Required for US addresses even though it is optional here. Example: "NY".'),
    postal_code: z.string().describe('Postal or ZIP code. Example: "10003".'),
    country: z.string().describe('Country code of the shipping address. Example: "US".')
});

const ShippingAddressResponseSchema = z.object({
    address1: z.string().describe('Street address, line 1.'),
    address2: z.string().nullable().optional().describe('Street address, line 2, or null when not provided.'),
    city: z.string().describe('City of the shipping address.'),
    country: z.string().describe('Country code of the shipping address.'),
    first_name: z.string().optional().describe('First name of the shipping recipient.'),
    last_name: z.string().optional().describe('Last name of the shipping recipient.'),
    phone: z.string().nullable().optional().describe('Phone number of the shipping recipient, or null when not provided.'),
    postal_code: z.string().describe('Postal or ZIP code.'),
    state: z.string().nullable().optional().describe('State or province code, or null when not provided.')
});

const ShippingSchema = z.object({
    method: z.string().nullable().optional().describe('Shipping method, or null when not yet determined.'),
    recipient_address: ShippingAddressResponseSchema.optional().describe('Address the physical card is shipped to.'),
    recipient_address_verification_state: z.string().nullable().optional().describe('Verification state of the recipient address, or null when unavailable.')
});

const FulfillmentSchema = z.object({
    fulfillment_status: z.string().optional().describe('Fulfillment status. Example: "ISSUED", "SHIPPED", "DELIVERED".'),
    shipping_date: z.string().nullable().optional().describe('ISO 8601 timestamp when the card was shipped, or null when not shipped yet.'),
    shipping_eta: z.string().nullable().optional().describe('ISO 8601 estimated arrival timestamp, or null when unknown.'),
    shipping_tracking_url: z.string().nullable().optional().describe('Tracking URL for the shipment, or null when unavailable.'),
    shipping: ShippingSchema.optional().describe('Shipping details for the physical card.')
});

const InputSchema = z
    .object({
        user_id: z.string().describe('ID of the user who will receive the physical card. Example: "d8135cfe-0396-4b2d-b2cf-ad809fb04731".'),
        shipping_address: ShippingAddressInputSchema.describe('Address where the physical card will be mailed.'),
        fund_id: z.string().optional().describe('ID of the fund (spend limit) to attach the card to. Cannot be combined with automatic_routing_enabled.'),
        automatic_routing_enabled: z
            .boolean()
            .optional()
            .describe('Set to true to enable automatic routing. Only allowed for a user primary card and cannot be combined with fund_id.')
    })
    .describe('Input for issuing a new physical card to a user.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created physical card.'),
        cardholder_id: z.string().optional().describe('ID of the user the card was issued to.'),
        cardholder_name: z.string().optional().describe('Full name of the card holder.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the card was created.'),
        display_name: z.string().describe('Cosmetic display name of the card.'),
        expiration: z.string().describe('Card expiration date in MMYY format.'),
        fund_id: z.string().nullable().optional().describe('ID of the fund (spend limit) attached to the card, or null when none.'),
        has_program_overridden: z.boolean().describe('Whether the card overrides the defaults of its card program.'),
        is_physical: z.boolean().optional().describe('Whether the card is a physical card.'),
        is_primary: z.boolean().optional().describe('Whether the card is the user primary card.'),
        is_suspended: z.boolean().describe('Whether the card is currently suspended.'),
        last_four: z.string().describe('Last four digits of the card number.'),
        state: z.string().optional().describe('State of the card. Example: "UNACTIVATED", "ACTIVE", "SUSPENDED", "TERMINATED".'),
        automatic_routing_enabled: z.boolean().optional().describe('Whether automatic routing is enabled for the card.'),
        fulfillment: FulfillmentSchema.nullable().describe('Shipping and fulfillment details for the physical card, or null when not applicable.')
    })
    .describe('The physical card that was issued to the user.');

const ProviderShippingAddressSchema = z.object({
    address1: z.string(),
    address2: z.string().nullable().optional(),
    city: z.string(),
    country: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    postal_code: z.string(),
    state: z.string().nullable().optional()
});

const ProviderPhysicalCardSchema = z.object({
    id: z.string(),
    cardholder_id: z.string().nullable().optional(),
    cardholder_name: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    display_name: z.string(),
    expiration: z.string(),
    fund_id: z.string().nullable().optional(),
    has_program_overridden: z.boolean(),
    is_physical: z.boolean().nullable().optional(),
    is_primary: z.boolean().nullable().optional(),
    is_suspended: z.boolean(),
    last_four: z.string(),
    state: z.string().nullable().optional(),
    automatic_routing_enabled: z.boolean().nullable().optional(),
    fulfillment: z
        .object({
            fulfillment_status: z.string().nullable().optional(),
            shipping_date: z.string().nullable().optional(),
            shipping_eta: z.string().nullable().optional(),
            shipping_tracking_url: z.string().nullable().optional(),
            shipping: z
                .object({
                    method: z.string().nullable().optional(),
                    recipient_address: ProviderShippingAddressSchema.nullable().optional(),
                    recipient_address_verification_state: z.string().nullable().optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional()
});

function mapFulfillment(fulfillment: NonNullable<z.infer<typeof ProviderPhysicalCardSchema>['fulfillment']>): z.infer<typeof FulfillmentSchema> {
    const shipping = fulfillment.shipping;
    const address = shipping?.recipient_address;
    return {
        ...(fulfillment.fulfillment_status != null && { fulfillment_status: fulfillment.fulfillment_status }),
        ...(fulfillment.shipping_date !== undefined && { shipping_date: fulfillment.shipping_date }),
        ...(fulfillment.shipping_eta !== undefined && { shipping_eta: fulfillment.shipping_eta }),
        ...(fulfillment.shipping_tracking_url !== undefined && { shipping_tracking_url: fulfillment.shipping_tracking_url }),
        ...(shipping != null && {
            shipping: {
                ...(shipping.method !== undefined && { method: shipping.method }),
                ...(address != null && {
                    recipient_address: {
                        address1: address.address1,
                        ...(address.address2 !== undefined && { address2: address.address2 }),
                        city: address.city,
                        country: address.country,
                        ...(address.first_name != null && { first_name: address.first_name }),
                        ...(address.last_name != null && { last_name: address.last_name }),
                        ...(address.phone !== undefined && { phone: address.phone }),
                        postal_code: address.postal_code,
                        ...(address.state !== undefined && { state: address.state })
                    }
                }),
                ...(shipping.recipient_address_verification_state !== undefined && {
                    recipient_address_verification_state: shipping.recipient_address_verification_state
                })
            }
        })
    };
}

/**
 * @tags: [write]
 * @tagReason: Issues a new physical card through a provider-side POST mutation.
 * @pitfalls: Ramp allows only one active physical card per user, so a request for a user who already has an active card fails (a terminated card does not block a new one); US shipping addresses require `state` even though it is optional in the schema; `fund_id` and `automatic_routing_enabled` are mutually exclusive; the card is returned `UNACTIVATED` with `last_four` and `expiration` redacted until it is activated.
 */
const action = createAction({
    description: 'Issue a new physical card to a user, optionally attached to a specific fund/spend limit.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.ramp.com/developer-api/v1/overview/introduction
            endpoint: '/developer/v1/cards/physical',
            data: {
                user_id: input.user_id,
                shipping_address: {
                    address1: input.shipping_address.address1,
                    city: input.shipping_address.city,
                    postal_code: input.shipping_address.postal_code,
                    country: input.shipping_address.country,
                    ...(input.shipping_address.address2 !== undefined && { address2: input.shipping_address.address2 }),
                    ...(input.shipping_address.state !== undefined && { state: input.shipping_address.state })
                },
                ...(input.fund_id !== undefined && { fund_id: input.fund_id }),
                ...(input.automatic_routing_enabled !== undefined && { automatic_routing_enabled: input.automatic_routing_enabled })
            },
            // Card issuance is not idempotent, so retries are disabled to avoid any chance of duplicate cards.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const card = ProviderPhysicalCardSchema.parse(response.data);

        return {
            id: card.id,
            ...(card.cardholder_id != null && { cardholder_id: card.cardholder_id }),
            ...(card.cardholder_name != null && { cardholder_name: card.cardholder_name }),
            ...(card.created_at != null && { created_at: card.created_at }),
            display_name: card.display_name,
            expiration: card.expiration,
            ...(card.fund_id !== undefined && { fund_id: card.fund_id }),
            has_program_overridden: card.has_program_overridden,
            ...(card.is_physical != null && { is_physical: card.is_physical }),
            ...(card.is_primary != null && { is_primary: card.is_primary }),
            is_suspended: card.is_suspended,
            last_four: card.last_four,
            ...(card.state != null && { state: card.state }),
            ...(card.automatic_routing_enabled != null && { automatic_routing_enabled: card.automatic_routing_enabled }),
            fulfillment: card.fulfillment != null ? mapFulfillment(card.fulfillment) : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
