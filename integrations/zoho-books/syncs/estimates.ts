import { createSync } from 'nango';
import { z } from 'zod';

const PageContextSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    has_more_page: z.boolean(),
    report_name: z.string().optional(),
    applied_filter: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.string().optional()
});

const ZohoEstimateSchema = z.object({
    estimate_id: z.union([z.string(), z.number()]),
    estimate_number: z.string(),
    status: z.string(),
    customer_id: z.union([z.string(), z.number()]),
    customer_name: z.string(),
    date: z.string(),
    expiry_date: z.string().optional(),
    reference_number: z.string().optional(),
    total: z.number(),
    sub_total: z.number().optional(),
    tax_total: z.number().optional(),
    currency_id: z.union([z.string(), z.number()]).optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    created_time: z.string(),
    last_modified_time: z.string(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    billing_address: z.record(z.string(), z.unknown()).optional(),
    shipping_address: z.record(z.string(), z.unknown()).optional(),
    line_items: z.array(z.record(z.string(), z.unknown())).optional(),
    custom_fields: z.array(z.record(z.string(), z.unknown())).optional(),
    tags: z.array(z.record(z.string(), z.unknown())).optional()
});

const ListEstimatesResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    estimates: z.array(ZohoEstimateSchema),
    page_context: PageContextSchema
});

const EstimateSchema = z.object({
    id: z.string(),
    estimate_number: z.string(),
    status: z.string(),
    customer_id: z.string(),
    customer_name: z.string(),
    date: z.string(),
    expiry_date: z.string().optional(),
    reference_number: z.string().optional(),
    total: z.number(),
    sub_total: z.number().optional(),
    tax_total: z.number().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    created_time: z.string(),
    last_modified_time: z.string(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    billing_address: z.record(z.string(), z.unknown()).optional(),
    shipping_address: z.record(z.string(), z.unknown()).optional(),
    line_items: z.array(z.record(z.string(), z.unknown())).optional(),
    custom_fields: z.array(z.record(z.string(), z.unknown())).optional(),
    tags: z.array(z.record(z.string(), z.unknown())).optional()
});

const MetadataSchema = z.object({
    organization_id: z.string()
});

const sync = createSync({
    description: 'Sync estimates from Zoho Books',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Estimate: EstimateSchema
    },
    endpoints: [
        {
            path: '/syncs/estimates',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        let page = 1;
        let hasMorePage = true;

        // Blocker: the estimates list endpoint documents page-based pagination,
        // filters, and sorting, but no changed-since cursor or last_modified_time
        // query parameter for incremental syncs.
        await nango.trackDeletesStart('Estimate');

        while (hasMorePage) {
            // https://www.zoho.com/books/api/v3/estimates/#list-estimates
            const response = await nango.get({
                endpoint: '/books/v3/estimates',
                params: {
                    organization_id: metadata.organization_id,
                    sort_column: 'created_time',
                    sort_order: 'A',
                    page,
                    per_page: 100
                },
                retries: 3
            });

            const validated = ListEstimatesResponseSchema.parse(response.data);
            const estimates = validated.estimates;
            const pageContext = validated.page_context;

            if (estimates.length === 0) {
                break;
            }

            const mapped = estimates.map((record) => ({
                id: String(record.estimate_id),
                estimate_number: record.estimate_number,
                status: record.status,
                customer_id: String(record.customer_id),
                customer_name: record.customer_name,
                date: record.date,
                ...(record.expiry_date != null && { expiry_date: record.expiry_date }),
                ...(record.reference_number != null && { reference_number: record.reference_number }),
                total: record.total,
                ...(record.sub_total != null && { sub_total: record.sub_total }),
                ...(record.tax_total != null && { tax_total: record.tax_total }),
                ...(record.currency_id != null && { currency_id: String(record.currency_id) }),
                ...(record.currency_code != null && { currency_code: record.currency_code }),
                ...(record.exchange_rate != null && { exchange_rate: record.exchange_rate }),
                created_time: record.created_time,
                last_modified_time: record.last_modified_time,
                ...(record.notes != null && { notes: record.notes }),
                ...(record.terms != null && { terms: record.terms }),
                ...(record.billing_address != null && { billing_address: record.billing_address }),
                ...(record.shipping_address != null && { shipping_address: record.shipping_address }),
                ...(record.line_items != null && { line_items: record.line_items }),
                ...(record.custom_fields != null && { custom_fields: record.custom_fields }),
                ...(record.tags != null && { tags: record.tags })
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Estimate');
            }

            hasMorePage = pageContext?.has_more_page ?? false;
            if (hasMorePage) {
                page = page + 1;
            }
        }

        await nango.trackDeletesEnd('Estimate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
