import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    status: z.string().optional().describe('Filter by invoice status. Example: "draft"'),
    project_id: z.string().optional().describe('Filter by project ID. Example: "6a71de59f55241acad0cd44e"'),
    updated_after: z.string().optional().describe('Only show objects updated after or equal to this date (ISO-8601). Example: "2024-08-21T07:25:30Z"'),
    updated_before: z.string().optional().describe('Only show objects updated before or equal to this date (ISO-8601). Example: "2024-08-21T07:25:30Z"'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100). Default: 20'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page. Example: "2"')
});

const ProviderInvoiceItemSchema = z.object({
    id: z.string(),
    gross_value: z.string().nullish(),
    unit_value: z.string().nullish(),
    unit_quantity: z.number().int().nullish(),
    cost_code_id: z.string().nullish(),
    retention_gross_value: z.string().nullish(),
    retention_withheld_this_period_value: z.string().nullish(),
    retention_released_value: z.string().nullish(),
    description: z.string().nullish(),
    site_id: z.string().nullish()
});

const ProviderContractedInvoiceSchema = z.object({
    id: z.string(),
    generated_id: z.string().nullish(),
    contract_id: z.string().nullish(),
    client_company_id: z.string().nullish(),
    vendor_company_id: z.string().nullish(),
    custom_id: z.string().nullish(),
    description: z.string().nullish(),
    type: z.string().nullish(),
    project_id: z.string().nullish(),
    invoice_date: z.string().nullish(),
    start_date: z.string().nullish(),
    end_date: z.string().nullish(),
    net_value: z.string().nullish(),
    gross_value: z.string().nullish(),
    paid_value: z.string().nullish(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    items: z.array(ProviderInvoiceItemSchema).nullish(),
    document_ids: z.array(z.string()).nullish()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderContractedInvoiceSchema),
    total: z.number().int(),
    page: z.number().int(),
    per_page: z.number().int(),
    first_page_url: z.string().optional().nullable(),
    last_page_url: z.string().optional().nullable(),
    next_page_url: z.string().optional().nullable(),
    prev_page_url: z.string().optional().nullable()
});

const OutputItemSchema = z.object({
    id: z.string(),
    gross_value: z.string().optional(),
    unit_value: z.string().optional(),
    unit_quantity: z.number().int().optional(),
    cost_code_id: z.string().optional(),
    retention_gross_value: z.string().optional(),
    retention_withheld_this_period_value: z.string().optional(),
    retention_released_value: z.string().optional(),
    description: z.string().optional(),
    site_id: z.string().optional()
});

const OutputInvoiceSchema = z.object({
    id: z.string(),
    generated_id: z.string().optional(),
    contract_id: z.string().optional(),
    client_company_id: z.string().optional(),
    vendor_company_id: z.string().optional(),
    custom_id: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    project_id: z.string().optional(),
    invoice_date: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    net_value: z.string().optional(),
    gross_value: z.string().optional(),
    paid_value: z.string().optional(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    items: z.array(OutputItemSchema),
    document_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(OutputInvoiceSchema),
    next_cursor: z.string().optional()
});

function mapInvoiceItem(item: z.infer<typeof ProviderInvoiceItemSchema>): z.infer<typeof OutputItemSchema> {
    return {
        id: item.id,
        ...(item.gross_value != null && { gross_value: item.gross_value }),
        ...(item.unit_value != null && { unit_value: item.unit_value }),
        ...(item.unit_quantity != null && { unit_quantity: item.unit_quantity }),
        ...(item.retention_gross_value != null && { retention_gross_value: item.retention_gross_value }),
        ...(item.retention_withheld_this_period_value != null && {
            retention_withheld_this_period_value: item.retention_withheld_this_period_value
        }),
        ...(item.retention_released_value != null && { retention_released_value: item.retention_released_value }),
        ...(item.cost_code_id != null && { cost_code_id: item.cost_code_id }),
        ...(item.description != null && { description: item.description }),
        ...(item.site_id != null && { site_id: item.site_id })
    };
}

function mapInvoice(invoice: z.infer<typeof ProviderContractedInvoiceSchema>): z.infer<typeof OutputInvoiceSchema> {
    return {
        id: invoice.id,
        ...(invoice.generated_id != null && { generated_id: invoice.generated_id }),
        ...(invoice.contract_id != null && { contract_id: invoice.contract_id }),
        ...(invoice.client_company_id != null && { client_company_id: invoice.client_company_id }),
        ...(invoice.vendor_company_id != null && { vendor_company_id: invoice.vendor_company_id }),
        ...(invoice.project_id != null && { project_id: invoice.project_id }),
        ...(invoice.net_value != null && { net_value: invoice.net_value }),
        ...(invoice.gross_value != null && { gross_value: invoice.gross_value }),
        ...(invoice.paid_value != null && { paid_value: invoice.paid_value }),
        status: invoice.status,
        created_at: invoice.created_at,
        updated_at: invoice.updated_at,
        items: (invoice.items ?? []).map(mapInvoiceItem),
        ...(invoice.custom_id != null && { custom_id: invoice.custom_id }),
        ...(invoice.description != null && { description: invoice.description }),
        ...(invoice.type != null && { type: invoice.type }),
        ...(invoice.invoice_date != null && { invoice_date: invoice.invoice_date }),
        ...(invoice.start_date != null && { start_date: invoice.start_date }),
        ...(invoice.end_date != null && { end_date: invoice.end_date }),
        ...(invoice.document_ids != null && { document_ids: invoice.document_ids })
    };
}

const action = createAction({
    description: 'List AP invoices tied to contracts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let page = 1;
        let perPage = input.per_page ?? 20;

        // The page size is encoded in the cursor (rather than relying solely on the page number)
        // so that a caller supplying a different per_page on a follow-up call can't desync the
        // scan and skip or repeat invoices.
        if (input.cursor !== undefined) {
            const match = /^(\d+):(\d+)$/.exec(input.cursor);
            const pageStr = match?.[1];
            const perPageStr = match?.[2];
            if (pageStr === undefined || perPageStr === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
            page = parseInt(pageStr, 10);
            perPage = parseInt(perPageStr, 10);
            if (page < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
        }

        const response = await nango.get({
            // https://api.ingenious.build/reference/v2-get-contracted-invoicespub.md
            endpoint: '/api/v2/pub/contracted-invoices',
            params: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.updated_after !== undefined && { updated_after: input.updated_after }),
                ...(input.updated_before !== undefined && { updated_before: input.updated_before }),
                per_page: String(perPage),
                page: String(page)
            },
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);

        const hasNextPage = listResponse.page * listResponse.per_page < listResponse.total;

        return {
            items: listResponse.items.map(mapInvoice),
            ...(hasNextPage && { next_cursor: `${page + 1}:${perPage}` })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
