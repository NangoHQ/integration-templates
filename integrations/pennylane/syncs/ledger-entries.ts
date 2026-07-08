import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number()
    }),
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderJournalSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderAttachmentSchema = z.object({
    filename: z.string(),
    url: z.string()
});

const ProviderLedgerEntrySchema = z.object({
    id: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    label: z.string().nullable(),
    piece_number: z.string().nullable(),
    date: z.string().nullable(),
    due_date: z.string().nullable(),
    invoice_number: z.string().nullable(),
    journal_id: z.number().optional(),
    journal: ProviderJournalSchema,
    status: z.string().nullable(),
    categories: ProviderCategorySchema.array(),
    ledger_attachment_filename: z.string().nullable(),
    attachment: ProviderAttachmentSchema.nullable()
});

const LedgerEntrySchema = z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    label: z.string().optional(),
    piece_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    invoice_number: z.string().optional(),
    journal_id: z.string(),
    journal_url: z.string(),
    status: z.string().optional(),
    categories: z
        .object({
            id: z.string(),
            label: z.string(),
            weight: z.string(),
            category_group_id: z.string(),
            analytical_code: z.string().optional(),
            created_at: z.string(),
            updated_at: z.string()
        })
        .array()
        .optional(),
    attachment_filename: z.string().optional(),
    attachment_url: z.string().optional()
});

const MetadataSchema = z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional()
});

const sync = createSync({
    description: 'Sync ledger entries.',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        LedgerEntry: LedgerEntrySchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = rawMetadata ? MetadataSchema.parse(rawMetadata) : undefined;

        const filters: Array<{ field: string; operator: string; value: string }> = [];
        if (metadata?.date_from) {
            filters.push({ field: 'date', operator: 'gteq', value: metadata.date_from });
        }
        if (metadata?.date_to) {
            filters.push({ field: 'date', operator: 'lteq', value: metadata.date_to });
        }
        const isFiltered = filters.length > 0;

        const params: { limit: number; filter?: string } = {
            limit: 100
        };
        if (filters.length > 0) {
            params.filter = JSON.stringify(filters);
        }

        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getledgerentries
            endpoint: '/api/external/v2/ledger_entries',
            params,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        // Delete tracking must only run for unfiltered, full enumerations: when date_from/date_to
        // narrow the crawl, records outside that window are legitimately absent from the run and
        // must not be treated as deleted.
        if (!isFiltered) {
            await nango.trackDeletesStart('LedgerEntry');
        }

        for await (const page of nango.paginate(config)) {
            const entries = z.array(ProviderLedgerEntrySchema).parse(page);

            const records = entries.map((entry) => ({
                id: String(entry.id),
                created_at: entry.created_at,
                updated_at: entry.updated_at,
                ...(entry.label != null && { label: entry.label }),
                ...(entry.piece_number != null && { piece_number: entry.piece_number }),
                ...(entry.date != null && { date: entry.date }),
                ...(entry.due_date != null && { due_date: entry.due_date }),
                ...(entry.invoice_number != null && { invoice_number: entry.invoice_number }),
                journal_id: String(entry.journal.id),
                journal_url: entry.journal.url,
                ...(entry.status != null && { status: entry.status }),
                categories: entry.categories.map((category) => ({
                    id: String(category.id),
                    label: category.label,
                    weight: category.weight,
                    category_group_id: String(category.category_group.id),
                    ...(category.analytical_code != null && { analytical_code: category.analytical_code }),
                    created_at: category.created_at,
                    updated_at: category.updated_at
                })),
                ...(entry.attachment != null && {
                    attachment_filename: entry.attachment.filename,
                    attachment_url: entry.attachment.url
                })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'LedgerEntry');
            }
        }

        if (!isFiltered) {
            await nango.trackDeletesEnd('LedgerEntry');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
