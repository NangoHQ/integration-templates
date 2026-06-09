import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    organization_id: z.string().describe('Zoho Books organization ID. Example: "927270289"')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of records per page. Max 200.'),
    vendor_id: z.string().optional().describe('Filter by vendor ID.'),
    customer_id: z.string().optional().describe('Filter by customer ID.'),
    status: z.string().optional().describe('Filter by expense status. Values: unbilled, invoiced, reimbursed, non-billable, billable.'),
    date_start: z.string().optional().describe('Filter by expense date range start (yyyy-mm-dd).'),
    date_end: z.string().optional().describe('Filter by expense date range end (yyyy-mm-dd).')
});

const ExpenseSchema = z.object({
    expense_id: z.string(),
    date: z.string().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().optional(),
    currency_code: z.string().optional(),
    status: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    reference_number: z.string().nullable().optional(),
    is_billable: z.boolean().optional(),
    project_id: z.string().optional(),
    project_name: z.string().optional()
});

const PageContextSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    has_more_page: z.boolean()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    expenses: z.array(z.unknown()).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ExpenseSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List expenses from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-expenses',
        group: 'Expenses'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.expenses.READ'],
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'metadata.organization_id is required.'
            });
        }

        const organizationId = parsedMetadata.data.organization_id;

        const params: Record<string, string | number> = {
            organization_id: organizationId
        };

        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.vendor_id !== undefined) {
            params['vendor_id'] = input.vendor_id;
        }
        if (input.customer_id !== undefined) {
            params['customer_id'] = input.customer_id;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.date_start !== undefined) {
            params['date_start'] = input.date_start;
        }
        if (input.date_end !== undefined) {
            params['date_end'] = input.date_end;
        }

        // https://www.zoho.com/books/api/v3/expenses/#list-expenses
        const response = await nango.get({
            endpoint: '/books/v3/expenses',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        const rawExpenses = providerResponse.expenses ?? [];
        const expenses = rawExpenses
            .map((raw) => {
                const parsed = ExpenseSchema.safeParse(raw);
                if (!parsed.success) {
                    return undefined;
                }
                return parsed.data;
            })
            .filter((item): item is z.infer<typeof ExpenseSchema> => item !== undefined);

        const pageContext = providerResponse.page_context;
        const nextCursor = pageContext && pageContext.has_more_page ? String(pageContext.page + 1) : undefined;

        return {
            items: expenses,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
