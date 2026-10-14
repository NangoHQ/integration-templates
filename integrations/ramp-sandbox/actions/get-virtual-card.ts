import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        card_id: z.string().describe('Unique identifier of the virtual card to retrieve. Example: "6c58e256-314f-42f3-8462-6aebbb1a1d95"')
    })
    .describe('Input for retrieving a single virtual card by its ID.');

const ProviderVirtualCardSchema = z.object({
    id: z.string().optional(),
    user_id: z.string().optional(),
    fund_id: z.string().nullable(),
    is_card_suspended: z.boolean(),
    created_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the virtual card.'),
        user_id: z.string().optional().describe('Unique identifier of the card owner.'),
        fund_id: z.string().nullable().describe('Unique identifier of the associated fund, or null when the card is not attached to a fund.'),
        is_card_suspended: z.boolean().describe('Whether the virtual card has been locked (suspended).'),
        created_at: z.string().optional().describe('ISO 8601 date-time at which the card was created.')
    })
    .describe('A single virtual card with its owner, fund, suspension state, and creation time.');

/**
 * @tags: [read]
 * @tagReason: Fetches a single virtual card from the provider without creating, updating, or deleting anything.
 */
const action = createAction({
    description: 'Retrieve a single virtual card by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/overview/introduction (GET /developer/v1/cards/virtual/{card_id})
            endpoint: `/developer/v1/cards/virtual/${encodeURIComponent(input.card_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Virtual card not found',
                card_id: input.card_id
            });
        }

        const card = ProviderVirtualCardSchema.parse(response.data);

        return {
            id: card.id ?? input.card_id,
            ...(card.user_id != null && { user_id: card.user_id }),
            fund_id: card.fund_id,
            is_card_suspended: card.is_card_suspended,
            ...(card.created_at != null && { created_at: card.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
