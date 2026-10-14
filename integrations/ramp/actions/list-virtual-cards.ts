import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination cursor (`start`) returned as `next_cursor` by a previous call. Omit to fetch the first page.')
    })
    .describe('Input for listing Ramp virtual cards.');

const ProviderVirtualCardSchema = z.object({
    id: z.string(),
    fund_id: z.string().nullable(),
    user_id: z.string().optional(),
    is_card_suspended: z.boolean(),
    created_at: z.string().optional()
});

const ProviderPageSchema = z.object({
    next: z.string().nullable()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderVirtualCardSchema),
    page: ProviderPageSchema
});

const VirtualCardSchema = z.object({
    id: z.string().describe('Unique identifier of the virtual card. Example: "d8135cfe-0396-4b2d-b2cf-ad809fb04731".'),
    fund_id: z.string().nullable().describe('Unique identifier of the fund the card is associated with, or null when the card is not tied to a fund.'),
    user_id: z.string().optional().describe('Unique identifier of the card owner; join against the users list for a display name.'),
    is_card_suspended: z.boolean().describe('Whether the virtual card is currently suspended (locked).'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the card was created. Example: "2022-05-04T00:00:00+00:00".')
});

const OutputSchema = z
    .object({
        items: z.array(VirtualCardSchema).describe('Virtual cards returned on this page.'),
        next_cursor: z.string().optional().describe('Cursor to pass back as `cursor` to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('A page of Ramp virtual cards.');

/**
 * @tags: [read]
 * @tagReason: Reads virtual cards from the provider without modifying any provider data.
 * @pitfalls: Only non-terminated virtual cards are returned, and entries omit the cardholder name and card last four digits, so join `user_id` against the users list when a display name is needed.
 */
const action = createAction({
    description: 'List virtual cards.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get<unknown>({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/cards/virtual)
            endpoint: '/developer/v1/cards/virtual',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const nextCursor = parsed.page.next !== null ? new URL(parsed.page.next).searchParams.get('start') : null;

        return {
            items: parsed.data.map((card) => ({
                id: card.id,
                fund_id: card.fund_id,
                ...(card.user_id != null && { user_id: card.user_id }),
                is_card_suspended: card.is_card_suspended,
                ...(card.created_at != null && { created_at: card.created_at })
            })),
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
