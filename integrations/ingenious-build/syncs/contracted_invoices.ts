import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InvoiceItemSchema = z.object({
    id: z.string(),
    gross_value: z.string().optional(),
    unit_value: z.string().optional(),
    unit_quantity: z.number().optional(),
    cost_code_id: z.string().optional(),
    retention_gross_value: z.string().optional(),
    retention_withheld_this_period_value: z.string().optional(),
    retention_released_value: z.string().optional(),
    description: z.string().optional(),
    site_id: z.string().optional()
});

const ContractedInvoiceSchema = z.object({
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
    items: z.array(InvoiceItemSchema).optional(),
    document_ids: z.array(z.string()).optional()
});

const RawInvoiceItemSchema = z.object({
    id: z.string(),
    gross_value: z.string().nullish(),
    unit_value: z.string().nullish(),
    unit_quantity: z.number().nullish(),
    cost_code_id: z.string().nullish(),
    retention_gross_value: z.string().nullish(),
    retention_withheld_this_period_value: z.string().nullish(),
    retention_released_value: z.string().nullish(),
    description: z.string().nullish(),
    site_id: z.string().nullish()
});

const RawContractedInvoiceSchema = z.object({
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
    items: z.array(RawInvoiceItemSchema).nullish(),
    document_ids: z.array(z.string()).nullish()
});

const ListResponseSchema = z.object({
    items: z.array(z.unknown()),
    total: z.number().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    next_page_url: z.string().nullish()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync AP invoices tied to contracts',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ContractedInvoice: ContractedInvoiceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Blocker: provider only exposes /api/v2/pub/contracted-invoices with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor beyond page/per_page.
        let page = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;
        if (page === 1) {
            await nango.trackDeletesStart('ContractedInvoice');
        }

        const perPage = 100;
        let hasNextPage = true;

        while (hasNextPage) {
            // https://api.ingenious.build/reference/v2-get-contracted-invoicespub.md
            const proxyConfig: Omit<ProxyConfiguration, 'method'> = {
                endpoint: '/api/v2/pub/contracted-invoices',
                params: {
                    page: String(page),
                    per_page: String(perPage)
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);
            const parsed = ListResponseSchema.parse(response.data);
            const rawItems = parsed.items;

            if (rawItems.length === 0) {
                break;
            }

            const invoices = rawItems.map((rawItem) => {
                const raw = RawContractedInvoiceSchema.parse(rawItem);
                return {
                    id: raw.id,
                    ...(raw.generated_id != null && { generated_id: raw.generated_id }),
                    ...(raw.contract_id != null && { contract_id: raw.contract_id }),
                    ...(raw.client_company_id != null && { client_company_id: raw.client_company_id }),
                    ...(raw.vendor_company_id != null && { vendor_company_id: raw.vendor_company_id }),
                    ...(raw.custom_id != null && { custom_id: raw.custom_id }),
                    ...(raw.description != null && { description: raw.description }),
                    ...(raw.type != null && { type: raw.type }),
                    ...(raw.project_id != null && { project_id: raw.project_id }),
                    ...(raw.invoice_date != null && { invoice_date: raw.invoice_date }),
                    ...(raw.start_date != null && { start_date: raw.start_date }),
                    ...(raw.end_date != null && { end_date: raw.end_date }),
                    ...(raw.net_value != null && { net_value: raw.net_value }),
                    ...(raw.gross_value != null && { gross_value: raw.gross_value }),
                    ...(raw.paid_value != null && { paid_value: raw.paid_value }),
                    status: raw.status,
                    created_at: raw.created_at,
                    updated_at: raw.updated_at,
                    ...(raw.items != null && {
                        items: raw.items.map((item) => ({
                            id: item.id,
                            ...(item.gross_value != null && { gross_value: item.gross_value }),
                            ...(item.unit_value != null && { unit_value: item.unit_value }),
                            ...(item.unit_quantity != null && { unit_quantity: item.unit_quantity }),
                            ...(item.cost_code_id != null && { cost_code_id: item.cost_code_id }),
                            ...(item.retention_gross_value != null && { retention_gross_value: item.retention_gross_value }),
                            ...(item.retention_withheld_this_period_value != null && {
                                retention_withheld_this_period_value: item.retention_withheld_this_period_value
                            }),
                            ...(item.retention_released_value != null && { retention_released_value: item.retention_released_value }),
                            ...(item.description != null && { description: item.description }),
                            ...(item.site_id != null && { site_id: item.site_id })
                        }))
                    }),
                    ...(raw.document_ids != null && { document_ids: raw.document_ids })
                };
            });

            await nango.batchSave(invoices, 'ContractedInvoice');

            hasNextPage = parsed.next_page_url != null && rawItems.length === perPage;
            page++;

            if (hasNextPage) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ContractedInvoice');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
