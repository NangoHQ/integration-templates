import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CreditNoteSchema = z.object({
    id: z.string(),
    creditnote_number: z.string().optional(),
    status: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    issued_date: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    currency_code: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const MetadataSchema = z.object({
    organization_id: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const OrganizationsResponseSchema = z.object({
    organizations: z.array(
        z
            .object({
                organization_id: z.string()
            })
            .passthrough()
    )
});

const ProviderCreditNoteSchema = z
    .object({
        creditnote_id: z.string(),
        creditnote_number: z.string().optional(),
        status: z.string().optional(),
        reference_number: z.string().optional(),
        date: z.string().optional(),
        issued_date: z.string().optional(),
        total: z.number().optional(),
        balance: z.number().optional(),
        customer_id: z.string().optional(),
        customer_name: z.string().optional(),
        currency_code: z.string().optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync credit notes from Zoho Books.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        CreditNote: CreditNoteSchema
    },
    endpoints: [{ path: '/syncs/credit-notes', method: 'POST' }],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        let organizationId: string | undefined;
        if (parsedMetadata.success && parsedMetadata.data['organization_id']) {
            organizationId = parsedMetadata.data['organization_id'];
        } else {
            // https://www.zoho.com/books/api/v3/organizations/#list-organizations
            const orgsResponse = await nango.get({
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const parsedOrgs = OrganizationsResponseSchema.safeParse(orgsResponse.data);
            if (!parsedOrgs.success || parsedOrgs.data.organizations.length === 0) {
                throw new Error('Failed to resolve organization_id from Zoho Books');
            }
            const firstOrg = parsedOrgs.data.organizations[0];
            if (!firstOrg) {
                throw new Error('Failed to resolve organization_id from Zoho Books');
            }
            organizationId = firstOrg.organization_id;
        }

        const rawCheckpoint = await nango.getCheckpoint();
        let page: number | undefined = 1;
        if (rawCheckpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsedCheckpoint.success) {
                throw new Error('Failed to parse checkpoint: ' + parsedCheckpoint.error.message);
            }
            page = parsedCheckpoint.data.page;
        }

        // Blocker: List Credit Notes documents pagination, filters, and sorting, but
        // no changed-since cursor or last_modified_time filter for incremental syncs.
        await nango.trackDeletesStart('CreditNote');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/credit-notes/#list-all-credit-notes
            endpoint: '/books/v3/creditnotes',
            params: {
                organization_id: organizationId,
                sort_column: 'created_time',
                sort_order: 'A'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'creditnotes',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const creditNotes: Array<z.infer<typeof CreditNoteSchema>> = [];
            for (const raw of pageResults) {
                const parsed = ProviderCreditNoteSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error('Failed to parse credit note from provider response');
                }
                const record = parsed.data;
                creditNotes.push({
                    id: record.creditnote_id,
                    ...(record.creditnote_number != null && { creditnote_number: record.creditnote_number }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.reference_number != null && { reference_number: record.reference_number }),
                    ...(record.date != null && { date: record.date }),
                    ...(record.issued_date != null && { issued_date: record.issued_date }),
                    ...(record.total != null && { total: record.total }),
                    ...(record.balance != null && { balance: record.balance }),
                    ...(record.customer_id != null && { customer_id: record.customer_id }),
                    ...(record.customer_name != null && { customer_name: record.customer_name }),
                    ...(record.currency_code != null && { currency_code: record.currency_code }),
                    ...(record.created_time != null && { created_time: record.created_time }),
                    ...(record.last_modified_time != null && { last_modified_time: record.last_modified_time })
                });
            }

            if (creditNotes.length > 0) {
                await nango.batchSave(creditNotes, 'CreditNote');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CreditNote');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
