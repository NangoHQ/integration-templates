import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    organization_id: z.string()
});

const TagSchema = z.object({
    tag_id: z.string().optional(),
    tag_name: z.string().optional(),
    tag_option_id: z.string().optional(),
    tag_option_name: z.string().optional(),
    is_tag_mandatory: z.boolean().optional()
});

const CustomFieldSchema = z.object({
    customfield_id: z.string().optional(),
    value: z.string().optional()
});

const JournalLineItemSchema = z.object({
    line_id: z.string().optional(),
    account_id: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    debit_or_credit: z.string().optional(),
    tax_exemption_id: z.string().optional(),
    tax_exemption_type: z.string().optional(),
    tax_exemption_code: z.string().optional(),
    tax_authority_id: z.string().optional(),
    tax_authority_name: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_type: z.string().optional(),
    tax_percentage: z.string().optional(),
    amount: z.number().optional(),
    bcy_amount: z.number().optional(),
    acquisition_vat_id: z.string().optional(),
    acquisition_vat_name: z.string().optional(),
    acquisition_vat_percentage: z.string().optional(),
    acquisition_vat_amount: z.string().optional(),
    reverse_charge_vat_id: z.string().optional(),
    reverse_charge_vat_name: z.string().optional(),
    reverse_charge_vat_percentage: z.string().optional(),
    reverse_charge_vat_amount: z.string().optional(),
    tags: z.array(TagSchema).optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    project_id: z.string().optional(),
    project_name: z.string().optional()
});

const JournalTaxSchema = z.object({
    tax_name: z.string().optional(),
    tax_amount: z.number().optional(),
    debit_or_credit: z.string().optional(),
    tax_account: z.boolean().optional()
});

const ProviderJournalSchema = z.object({
    journal_id: z.string(),
    entry_number: z.string().optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    exchange_rate: z.number().optional(),
    journal_date: z.string().optional(),
    journal_type: z.string().optional(),
    vat_treatment: z.string().optional(),
    product_type: z.string().optional(),
    include_in_vat_return: z.boolean().optional(),
    is_bas_adjustment: z.boolean().optional(),
    line_items: z.array(JournalLineItemSchema).optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    line_item_total: z.number().optional(),
    total: z.number().optional(),
    bcy_total: z.number().optional(),
    price_precision: z.number().optional(),
    taxes: z.array(JournalTaxSchema).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    status: z.string().optional(),
    custom_fields: z.array(CustomFieldSchema).optional(),
    tags: z.array(TagSchema).optional()
});

const JournalSchema = z.object({
    id: z.string(),
    entry_number: z.string().optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    exchange_rate: z.number().optional(),
    journal_date: z.string().optional(),
    journal_type: z.string().optional(),
    vat_treatment: z.string().optional(),
    product_type: z.string().optional(),
    include_in_vat_return: z.boolean().optional(),
    is_bas_adjustment: z.boolean().optional(),
    line_items: z.array(JournalLineItemSchema).optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    line_item_total: z.number().optional(),
    total: z.number().optional(),
    bcy_total: z.number().optional(),
    price_precision: z.number().optional(),
    taxes: z.array(JournalTaxSchema).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    status: z.string().optional(),
    custom_fields: z.array(CustomFieldSchema).optional(),
    tags: z.array(TagSchema).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number()
});

const PageContextSchema = z.object({
    page_context: z
        .object({
            has_more_page: z.boolean().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync manual journal entries from Zoho Books.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Journal: JournalSchema
    },
    endpoints: [
        // https://www.zoho.com/books/api/v3/journals/#get-journal-list
        {
            path: '/syncs/journals',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const checkpoint = await nango.getCheckpoint();
        const raw = checkpoint ?? { updated_after: '', page: 1 };
        const parsedCheckpoint = CheckpointSchema.safeParse(raw);
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }

        let updatedAfter = parsedCheckpoint.data.updated_after || undefined;
        let page: number | undefined = parsedCheckpoint.data.page ?? 1;
        let lastProcessedUpdatedAt: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/journals/#get-journal-list
            endpoint: '/books/v3/journals',
            params: {
                organization_id: metadata.organization_id,
                sort_column: 'last_modified_time',
                sort_order: 'A',
                ...(updatedAfter && { last_modified_time: updatedAfter }),
                per_page: 100
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'journals',
                on_page: async ({ nextPageParam, response }) => {
                    const parsed = PageContextSchema.safeParse(response.data);
                    if (parsed.success && parsed.data.page_context?.has_more_page === false) {
                        page = undefined;
                    } else if (typeof nextPageParam === 'number') {
                        page = nextPageParam;
                    }
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const journals = [];

            for (const raw of pageResults) {
                const parsed = ProviderJournalSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse journal: ${parsed.error.message}`);
                }

                const journal = parsed.data;
                journals.push({
                    id: journal.journal_id,
                    ...(journal.entry_number !== undefined && { entry_number: journal.entry_number }),
                    ...(journal.reference_number !== undefined && { reference_number: journal.reference_number }),
                    ...(journal.notes !== undefined && { notes: journal.notes }),
                    ...(journal.currency_id !== undefined && { currency_id: journal.currency_id }),
                    ...(journal.currency_code !== undefined && { currency_code: journal.currency_code }),
                    ...(journal.currency_symbol !== undefined && { currency_symbol: journal.currency_symbol }),
                    ...(journal.exchange_rate !== undefined && { exchange_rate: journal.exchange_rate }),
                    ...(journal.journal_date !== undefined && { journal_date: journal.journal_date }),
                    ...(journal.journal_type !== undefined && { journal_type: journal.journal_type }),
                    ...(journal.vat_treatment !== undefined && { vat_treatment: journal.vat_treatment }),
                    ...(journal.product_type !== undefined && { product_type: journal.product_type }),
                    ...(journal.include_in_vat_return !== undefined && { include_in_vat_return: journal.include_in_vat_return }),
                    ...(journal.is_bas_adjustment !== undefined && { is_bas_adjustment: journal.is_bas_adjustment }),
                    ...(journal.line_items !== undefined && { line_items: journal.line_items }),
                    ...(journal.location_id !== undefined && { location_id: journal.location_id }),
                    ...(journal.location_name !== undefined && { location_name: journal.location_name }),
                    ...(journal.line_item_total !== undefined && { line_item_total: journal.line_item_total }),
                    ...(journal.total !== undefined && { total: journal.total }),
                    ...(journal.bcy_total !== undefined && { bcy_total: journal.bcy_total }),
                    ...(journal.price_precision !== undefined && { price_precision: journal.price_precision }),
                    ...(journal.taxes !== undefined && { taxes: journal.taxes }),
                    ...(journal.created_time !== undefined && { created_time: journal.created_time }),
                    ...(journal.last_modified_time !== undefined && { last_modified_time: journal.last_modified_time }),
                    ...(journal.status !== undefined && { status: journal.status }),
                    ...(journal.custom_fields !== undefined && { custom_fields: journal.custom_fields }),
                    ...(journal.tags !== undefined && { tags: journal.tags })
                });

                if (journal.last_modified_time) {
                    if (lastProcessedUpdatedAt === undefined || journal.last_modified_time > lastProcessedUpdatedAt) {
                        lastProcessedUpdatedAt = journal.last_modified_time;
                    }
                }
            }

            if (journals.length === 0) {
                if (page === undefined && lastProcessedUpdatedAt) {
                    await nango.saveCheckpoint({
                        updated_after: lastProcessedUpdatedAt,
                        page: 1
                    });
                }
                continue;
            }

            await nango.batchSave(journals, 'Journal');

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    page
                });
                continue;
            }

            updatedAfter = lastProcessedUpdatedAt;
            await nango.saveCheckpoint({
                updated_after: updatedAfter || '',
                page: 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
