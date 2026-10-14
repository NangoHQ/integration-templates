import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const CardStateSchema = z.enum(['ACTIVE', 'CHIP_LOCKED', 'SUSPENDED', 'TERMINATED', 'UNACTIVATED']);

const InputSchema = z
    .object({
        card_id: z.string().describe('Unique identifier of the physical card to update. Example: "58cb9b33-d372-4aa1-825f-30bf11ef3fc1"'),
        display_name: z
            .string()
            .optional()
            .describe('Cosmetic display name for the card. Cannot be changed while the card is assigned to a specific fund or spend limit.'),
        fund_id: z
            .string()
            .nullable()
            .optional()
            .describe(
                'ID of the fund or spend limit to assign the card to. The fund must be compatible with this physical card. Passing null does not clear the assignment; the provider instead attaches the card to a default spend limit.'
            ),
        automatic_routing_enabled: z
            .boolean()
            .optional()
            .describe('Enable or disable automatic routing. Can only be enabled on the primary card of a user and cannot be combined with fund_id.')
    })
    .describe('The physical card to update and the settings to change. Provide at least one of display_name, fund_id, or automatic_routing_enabled.');

const ProviderPhysicalCardSchema = z.object({
    id: z.string().optional(),
    display_name: z.string(),
    expiration: z.string(),
    last_four: z.string(),
    fund_id: z.string().nullable().optional(),
    automatic_routing_enabled: z.boolean().optional(),
    cardholder_id: z.string().optional(),
    cardholder_name: z.string().optional(),
    created_at: z.string().optional(),
    is_suspended: z.boolean(),
    state: CardStateSchema.optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the updated physical card.'),
        display_name: z.string().describe('Display name of the card after the update; reflects the associated fund or spend limit name when one is assigned.'),
        fund_id: z.string().nullable().optional().describe('ID of the fund or spend limit the card is assigned to, or null when unassigned.'),
        automatic_routing_enabled: z.boolean().optional().describe('Whether automatic routing is enabled for the card.'),
        cardholder_id: z.string().optional().describe('Unique identifier of the cardholder.'),
        cardholder_name: z.string().optional().describe('Full name of the cardholder.'),
        state: CardStateSchema.optional().describe('Current state of the card.'),
        is_suspended: z.boolean().describe('Whether the card is currently suspended.'),
        last_four: z.string().describe('Last four digits of the card number; redacted once the card is suspended or terminated.'),
        expiration: z.string().describe('Card expiration date in MMYY format; redacted once the card is suspended or terminated.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp at which the card was created.')
    })
    .describe('The physical card after the update, including its display name, fund assignment, automatic-routing setting, and current state.');

/**
 * @tags: [write]
 * @tagReason: Updates a physical card's provider-side settings (display name, fund assignment, automatic routing) via PATCH; it does not delete, revoke, or read other resources.
 * @pitfalls: fund_id and automatic_routing_enabled:true cannot be sent together; assigning a fund forces automatic_routing_enabled to false and locks display_name to the fund's name so it can no longer be changed while a fund is set; automatic_routing_enabled:true is only allowed on a user's primary card; a fund incompatible with the card is rejected; and fund_id:null does not clear the assignment, it attaches a default spend limit instead.
 */
const action = createAction({
    description: 'Update the display name, fund assignment, or automatic-routing setting of a physical card.',
    version: '1.0.0',
    scopes: ['cards:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.display_name === undefined && input.fund_id === undefined && input.automatic_routing_enabled === undefined) {
            throw new nango.ActionError({
                type: 'missing_update',
                message: 'Provide at least one of display_name, fund_id, or automatic_routing_enabled to update.'
            });
        }

        const config: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/physical-cards
            endpoint: `/developer/v1/cards/physical/${encodeURIComponent(input.card_id)}`,
            data: {
                ...(input.display_name !== undefined && { display_name: input.display_name }),
                ...(input.fund_id !== undefined && { fund_id: input.fund_id }),
                ...(input.automatic_routing_enabled !== undefined && { automatic_routing_enabled: input.automatic_routing_enabled })
            },
            // Absolute-value update; retrying with the same body is idempotent.
            retries: 3
        };

        const response = await nango.patch(config);

        const card = ProviderPhysicalCardSchema.parse(response.data);

        return {
            id: card.id ?? input.card_id,
            display_name: card.display_name,
            ...(card.fund_id !== undefined && { fund_id: card.fund_id }),
            ...(card.automatic_routing_enabled !== undefined && { automatic_routing_enabled: card.automatic_routing_enabled }),
            ...(card.cardholder_id !== undefined && { cardholder_id: card.cardholder_id }),
            ...(card.cardholder_name !== undefined && { cardholder_name: card.cardholder_name }),
            ...(card.state !== undefined && { state: card.state }),
            is_suspended: card.is_suspended,
            last_four: card.last_four,
            expiration: card.expiration,
            ...(card.created_at !== undefined && { created_at: card.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
