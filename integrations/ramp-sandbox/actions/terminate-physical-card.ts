import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        card_id: z.string().describe('Unique identifier of the physical card to terminate. Example: "42e5d32c-fce1-404c-ab13-2e99ffc439d9"')
    })
    .describe('Identifies the physical card to terminate.');

const PhysicalCardSchema = z.object({
    id: z.string(),
    state: z.string(),
    is_suspended: z.boolean().nullable().optional(),
    last_four: z.string().nullable().optional(),
    expiration: z.string().nullable().optional(),
    cardholder_id: z.string().nullable().optional(),
    cardholder_name: z.string().nullable().optional(),
    fund_id: z.string().nullable().optional(),
    display_name: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        card_id: z.string().describe('Unique identifier of the terminated physical card.'),
        state: z.string().describe('Card state reported after termination. Expected to be "TERMINATED".'),
        terminated: z.boolean().describe('True when the card is confirmed to be in the "TERMINATED" state.'),
        is_suspended: z.boolean().optional().describe('Whether the card is currently suspended.'),
        last_four: z.string().optional().describe('Last four digits of the card number, redacted by the provider to "*REDACTED*" once terminated.'),
        expiration: z.string().optional().describe('Card expiration in MMYY format, redacted by the provider to "*REDACTED*" once terminated.'),
        cardholder_id: z.string().optional().describe('Unique identifier of the user who held the card.'),
        cardholder_name: z.string().optional().describe('Full name of the user who held the card.'),
        fund_id: z.string().optional().describe('Unique identifier of the fund the card belonged to, when still reported after termination.'),
        display_name: z.string().optional().describe('Cosmetic display name of the card.')
    })
    .describe('Confirmed state of the physical card after termination.');

/**
 * @tags: [write, destructive]
 * @tagReason: Terminates a physical card, a permanent and irreversible provider-side state change.
 * @pitfalls: Termination is irreversible and a soft delete: the card is still returned with state "TERMINATED" instead of a 404, its number fields are redacted to "*REDACTED*", and terminating an already-terminated card fails.
 */
const action = createAction({
    description: 'Permanently terminate a physical card.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cardId = encodeURIComponent(input.card_id);

        await nango.delete({
            // Destructive and non-idempotent: a retry after a lost response hits a provider HTTP 400 on the already-terminated card, so do not replay.
            // Ramp API reference (machine-readable): https://docs.ramp.com/llms-api.txt - "Terminate a card" (DELETE /developer/v1/cards/physical/{card_id})
            endpoint: `/developer/v1/cards/physical/${cardId}`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const response = await nango.get({
            // Ramp API reference (machine-readable): https://docs.ramp.com/llms-api.txt - "Fetch a physical card" (GET /developer/v1/cards/physical/{card_id})
            endpoint: `/developer/v1/cards/physical/${cardId}`,
            retries: 3
        });

        const card = PhysicalCardSchema.parse(response.data);

        if (card.state !== 'TERMINATED') {
            throw new nango.ActionError({
                type: 'termination_not_confirmed',
                message: `Card ${input.card_id} is in state "${card.state}" instead of "TERMINATED" after the terminate request.`,
                card_id: input.card_id,
                state: card.state
            });
        }

        return {
            card_id: card.id,
            state: card.state,
            terminated: card.state === 'TERMINATED',
            ...(card.is_suspended != null && { is_suspended: card.is_suspended }),
            ...(card.last_four != null && { last_four: card.last_four }),
            ...(card.expiration != null && { expiration: card.expiration }),
            ...(card.cardholder_id != null && { cardholder_id: card.cardholder_id }),
            ...(card.cardholder_name != null && { cardholder_name: card.cardholder_name }),
            ...(card.fund_id != null && { fund_id: card.fund_id }),
            ...(card.display_name != null && { display_name: card.display_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
