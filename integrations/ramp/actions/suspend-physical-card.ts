import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        card_id: z.string().describe('Unique identifier of the physical card to suspend. Example: "d8135cfe-0396-4b2d-b2cf-ad809fb04731"')
    })
    .describe('Input for suspending a physical card.');

const ProviderPhysicalCardSchema = z.object({
    id: z.string(),
    is_suspended: z.boolean(),
    state: z.string().nullable().optional(),
    cardholder_id: z.string().nullable().optional(),
    cardholder_name: z.string().nullable().optional(),
    display_name: z.string().nullable().optional(),
    last_four: z.string().nullable().optional(),
    expiration: z.string().nullable().optional(),
    fund_id: z.string().nullable().optional(),
    is_physical: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the physical card.'),
        is_suspended: z.boolean().describe('Whether the card is suspended. True after a successful suspension.'),
        state: z.string().optional().describe('Provider lifecycle state of the card, such as ACTIVE, SUSPENDED or TERMINATED.'),
        cardholder_id: z.string().optional().describe('Unique identifier of the cardholder the card is issued to.'),
        cardholder_name: z.string().optional().describe('Full name of the cardholder.'),
        display_name: z.string().optional().describe('Cosmetic display name of the card.'),
        last_four: z.string().optional().describe('Last four digits of the card number.'),
        expiration: z.string().optional().describe('Card expiration date in MMYY format.'),
        fund_id: z.string().optional().describe('Unique identifier of the fund the card belongs to, when the card is associated with a fund.'),
        is_physical: z.boolean().optional().describe('Whether the card is a physical card.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp at which the card was created.')
    })
    .describe('The physical card after the suspension request, including its current suspension state.');

/**
 * @tags: [write]
 * @tagReason: Suspends a physical card through the provider, changing its transaction state; it reads and deletes nothing and the change is reversible.
 * @pitfalls: Suspending a card sets is_suspended to true but can leave the card's state reported as ACTIVE, so detect suspension via is_suspended rather than state; suspending an already-suspended card returns a provider error instead of being a no-op.
 */
const action = createAction({
    description: 'Temporarily suspend a physical card, blocking new transactions until it is unsuspended.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post<unknown>({
            // https://docs.ramp.com/openapi/developer-api.json (POST /developer/v1/cards/physical/{card_id}/suspension)
            endpoint: `/developer/v1/cards/physical/${encodeURIComponent(input.card_id)}/suspension`,
            // Non-idempotent: a retry after a lost response hits the provider's "already suspended" error (HTTP 400), so do not replay.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        if (response.data == null) {
            throw new nango.ActionError({
                type: 'suspend_failed',
                message: 'Ramp did not return the suspended card.'
            });
        }

        const card = ProviderPhysicalCardSchema.parse(response.data);

        return {
            id: card.id,
            is_suspended: card.is_suspended,
            ...(card.state != null && { state: card.state }),
            ...(card.cardholder_id != null && { cardholder_id: card.cardholder_id }),
            ...(card.cardholder_name != null && { cardholder_name: card.cardholder_name }),
            ...(card.display_name != null && { display_name: card.display_name }),
            ...(card.last_four != null && { last_four: card.last_four }),
            ...(card.expiration != null && { expiration: card.expiration }),
            ...(card.fund_id != null && { fund_id: card.fund_id }),
            ...(card.is_physical != null && { is_physical: card.is_physical }),
            ...(card.created_at != null && { created_at: card.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
