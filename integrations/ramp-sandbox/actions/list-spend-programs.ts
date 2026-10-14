import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (e.g. cents for USD). Example: 30000 means $300.00.'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD".'),
    minor_unit_conversion_rate: z
        .number()
        .nullable()
        .describe('Divisor used to convert `amount` to the major currency unit (100 for USD), or null when not reported.')
});

const SpendingRestrictionsSchema = z.object({
    interval: z.string().describe('Reset cadence the restrictions apply on. Example: "MONTHLY", "QUARTERLY", "CUSTOM".'),
    limit: CurrencyAmountSchema.nullable().describe('Total amount allowed per interval, or null when no limit is set.'),
    temporary_limit: CurrencyAmountSchema.nullable().describe('Temporary per-interval limit, or null when not set.'),
    transaction_amount_limit: CurrencyAmountSchema.nullable().describe('Maximum amount allowed on a single transaction, or null when not set.'),
    auto_lock_date: z.string().nullable().describe('ISO-8601 timestamp when funds under this program auto-lock, or null.'),
    start_of_interval: z.string().nullable().describe('ISO-8601 timestamp marking the start of the current interval, or null.'),
    next_interval_reset: z.string().nullable().describe('ISO-8601 timestamp of the next interval reset, or null.'),
    allowed_categories: z.array(z.number()).describe('Ramp category codes that are explicitly allowed.'),
    blocked_categories: z.array(z.number()).describe('Ramp category codes that are explicitly blocked.'),
    allowed_vendors: z.array(z.string()).describe('Merchant/vendor IDs that are explicitly allowed.'),
    blocked_vendors: z.array(z.string()).describe('Merchant/vendor IDs that are explicitly blocked.')
});

const PermittedSpendTypesSchema = z.object({
    primary_card_enabled: z.boolean().describe('Whether a physical card can be linked to funds created from this program.'),
    reimbursements_enabled: z.boolean().describe('Whether reimbursements can be submitted against funds created from this program.')
});

const SpendProgramSchema = z.object({
    id: z.string().describe('Unique spend program identifier (UUID).'),
    display_name: z.string().describe('Human-readable name of the program template. Example: "Software".'),
    description: z.string().describe('Description of the program template.'),
    icon: z.string().describe('Icon identifier Ramp uses for the template. Example: "PerDiemCardIcon".'),
    is_shareable: z.boolean().describe('Whether the program can be shared across users.'),
    issue_physical_card_if_needed: z.boolean().describe('Whether a physical card should be issued when a user does not already have one.'),
    permitted_spend_types: PermittedSpendTypesSchema.nullable().describe('Spend types enabled for funds created from this program, or null.'),
    restrictions: SpendingRestrictionsSchema.nullable().describe('Policy limits and category/vendor restrictions for the program, or null.')
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor returned as `next_cursor` by the previous call. Omit to fetch the first page.'),
        page_size: z
            .number()
            .int()
            .min(2)
            .max(100)
            .optional()
            .describe('Number of programs to return per page (between 2 and 100). Defaults to 20 when omitted.')
    })
    .describe('Filters for listing spend program templates.');

const ProviderResponseSchema = z.object({
    data: z.array(SpendProgramSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const OutputSchema = z
    .object({
        items: z.array(SpendProgramSchema).describe('Spend program templates returned for this page.'),
        next_cursor: z.string().optional().describe('Cursor to pass back as `cursor` to fetch the next page; omitted on the last page.')
    })
    .describe('A page of spend program templates.');

/**
 * @tags: [read]
 * @tagReason: Reads spend program templates from the provider and does not modify any provider state.
 * @pitfalls: Returned items are template summaries only; each program's `custom_form_collection` intake form is omitted from this list and can only be read by fetching that single program by id.
 */
const action = createAction({
    description: 'List spend program templates that funds can be created from or inherit restrictions from.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['spend_programs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawResponse = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api-reference/spend-programs/list-spend-programs
            endpoint: '/developer/v1/spend-programs',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const response = ProviderResponseSchema.parse(rawResponse.data);
        const lastItem = response.data[response.data.length - 1];
        const hasNextPage = response.page.next !== null && lastItem !== undefined;

        return {
            items: response.data,
            ...(hasNextPage && { next_cursor: lastItem.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
