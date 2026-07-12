import { z } from 'zod';
import { createAction } from 'nango';

const ProAccountMandateCustomerSchema = z.object({
    id: z.number().describe('Customer ID. Example: 47334785'),
    url: z.string().describe('URL to the customer resource')
});

const ProAccountMandateSchema = z.object({
    status: z.string().describe('Current status of the mandate. Example: "enabled"'),
    early_execution_date_permitted: z.boolean().describe('Whether early execution date is permitted for this mandate'),
    active_billing_subscription: z.boolean().describe('Whether the customer has at least one active billing subscription'),
    signed_at: z.string().nullable().describe('Date when the mandate was signed. Example: "2024-01-15"'),
    created_at: z.string().describe('Date and time when the mandate was created. Example: "2024-01-15T10:30:00Z"'),
    pdf_url: z.string().nullable().describe('URL to the PDF file of the mandate'),
    customer: ProAccountMandateCustomerSchema.nullable().describe('Associated customer information')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.')
});

const OutputSchema = z.object({
    items: z.array(ProAccountMandateSchema).describe('List of Pro Account payment mandates'),
    next_cursor: z.string().optional().describe('Cursor to retrieve the next set of results. Omit if there are no further pages.'),
    has_more: z.boolean().describe('Indicates whether additional results are available beyond this set')
});

const action = createAction({
    description: 'List Pro Account payment mandates',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_mandates:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch The Pro Account mandates endpoint returns 404 when the company has no Pro Account configured.
        // We gracefully recover by returning an empty list so the action remains usable across all sandbox states.
        try {
            // https://pennylane.readme.io/reference/getproaccountmandates
            const response = await nango.get({
                endpoint: '/api/external/v2/pro_account/mandates',
                params: {
                    ...(input.cursor !== undefined && { cursor: input.cursor }),
                    ...(input.limit !== undefined && { limit: String(input.limit) })
                },
                retries: 3
            });

            const errorDataSchema = z.object({
                error: z.string()
            });

            const errorCheck = errorDataSchema.safeParse(response.data);
            if (errorCheck.success && errorCheck.data.error === 'No Pro Account associated with the company') {
                return {
                    items: [],
                    has_more: false
                };
            }

            const listSchema = z.object({
                has_more: z.boolean(),
                next_cursor: z.string().nullable(),
                items: z.array(z.unknown())
            });

            const listData = listSchema.parse(response.data);

            const items = listData.items.map((item: unknown) => {
                const parsed = ProAccountMandateSchema.parse(item);
                return parsed;
            });

            return {
                items,
                has_more: listData.has_more,
                ...(listData.next_cursor != null && { next_cursor: listData.next_cursor })
            };
        } catch (err) {
            const errorSchema = z.object({
                response: z.object({
                    status: z.number(),
                    data: z.object({ error: z.string() }).partial()
                })
            });
            const parsedErr = errorSchema.safeParse(err);
            const isNoProAccount =
                parsedErr.success &&
                parsedErr.data.response.status === 404 &&
                parsedErr.data.response.data.error === 'No Pro Account associated with the company';

            if (isNoProAccount) {
                return {
                    items: [],
                    has_more: false
                };
            }

            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
