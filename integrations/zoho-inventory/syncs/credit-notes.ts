import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    organization_id: z.string()
});

const OrganizationListResponseSchema = z.object({
    organizations: z.array(OrganizationSchema)
});

const CreditNoteSchema = z
    .object({
        id: z.string().describe('Stable unique identifier of the credit note (the provider creditnote_id).'),
        creditnote_id: z.string().describe('Unique identifier of the credit note in Zoho Inventory.'),
        creditnote_number: z.string().describe('Human-readable credit note number, e.g. CN-00007.'),
        status: z
            .string()
            .describe('Credit note status: open, closed, draft or void. A closed credit note has been fully applied and is permanently settled.')
            .optional(),
        reference_number: z.string().describe('Reference number associated with the credit note, if any.').optional(),
        date: z.string().describe('Date the credit note was raised, formatted yyyy-mm-dd.').optional(),
        issued_date: z.string().describe('Date the credit note was issued, formatted yyyy-mm-dd; empty when not issued.').optional(),
        total: z.number().describe('Total amount credited by this credit note.').optional(),
        balance: z.number().describe('Remaining unapplied credit balance of the credit note.').optional(),
        customer_id: z.string().describe('Unique identifier of the customer the credit note was issued to.').optional(),
        customer_name: z.string().describe('Name of the customer the credit note was issued to.').optional(),
        applied_invoices: z.string().describe('Comma-separated invoice numbers the credit note has been applied to.').optional(),
        is_emailed: z.boolean().describe('Whether the credit note has been emailed to the customer.').optional(),
        has_attachment: z.boolean().describe('Whether the credit note has any attachments.').optional(),
        salesperson_name: z.string().describe('Name of the salesperson associated with the credit note.').optional(),
        salesperson_id: z.string().describe('Unique identifier of the salesperson associated with the credit note.').optional(),
        sales_channel: z.string().describe('Sales channel the credit note belongs to.').optional(),
        is_viewed_by_client: z.boolean().describe('Whether the customer has viewed the credit note.').optional(),
        client_viewed_time: z.string().describe('Timestamp when the customer viewed the credit note; empty when not viewed.').optional(),
        color_code: z.string().describe('Color code configured for the credit note status.').optional(),
        current_sub_status_id: z.string().describe('Unique identifier of the current workflow sub-status, if any.').optional(),
        current_sub_status: z.string().describe('Current workflow sub-status of the credit note.').optional(),
        currency_id: z.string().describe('Unique identifier of the currency used for the credit note.').optional(),
        currency_code: z.string().describe('ISO currency code of the credit note, e.g. USD.').optional(),
        created_time: z.string().describe('Timestamp when the credit note was created, including the provider timezone offset.').optional(),
        last_modified_time: z.string().describe('Timestamp when the credit note was last modified, including the provider timezone offset.').optional(),
        exchange_rate: z.number().describe('Exchange rate applied to the credit note relative to the organization base currency.').optional(),
        template_id: z.string().describe('Unique identifier of the credit note template used.').optional(),
        template_type: z.string().describe('Type of the credit note template, e.g. standard.').optional(),
        rounding_mode: z.string().describe('Rounding mode applied to the credit note totals, e.g. round_half_up.').optional(),
        price_precision: z.number().describe('Number of decimal places used for prices in the credit note.').optional(),
        tags: z.array(z.unknown()).describe('Reporting tags attached to the credit note; empty array when none are set.').optional()
    })
    .describe('A credit note issued to a customer in Zoho Inventory.');

const CreditNoteProviderSchema = CreditNoteSchema.omit({ id: true });

const CheckpointSchema = z
    .object({
        page: z.number().int().positive().describe('Next page to request when resuming an interrupted full refresh.')
    })
    .describe('Checkpoint storing the next credit notes page to request during a full refresh.');

const sync = createSync({
    description: 'Sync all credit notes issued to customers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CreditNote: CreditNoteSchema
    },

    exec: async (nango) => {
        // Prerequisite: every Zoho Inventory request needs the organization_id,
        // which is resolved before delete tracking starts.
        // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
        const organizationsResponse = await nango.get({
            endpoint: '/inventory/v1/organizations',
            retries: 3
        });

        const organizations = OrganizationListResponseSchema.parse(organizationsResponse.data).organizations;
        const organizationId = organizations[0]?.organization_id;

        if (!organizationId) {
            throw new Error('No Zoho Inventory organization is available for this connection.');
        }

        const checkpoint = CheckpointSchema.nullable().parse(await nango.getCheckpoint());
        let nextPage: number | undefined = checkpoint?.page ?? 1;

        // Credit notes expose no modified-since filter, so this remains a full refresh.
        // The page/per_page pagination is checkpointed so interrupted runs resume from the
        // next page, while deletion detection still completes only after the full scan and
        // checkpoint clear succeed.

        await nango.trackDeletesStart('CreditNote');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/credit-notes/#list-all-credit-notes
            endpoint: '/inventory/v1/creditnotes',
            params: {
                organization_id: organizationId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'creditnotes',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate<Record<string, unknown>>(proxyConfig)) {
            const creditNotes = batch.map((record) => {
                const creditNote = CreditNoteProviderSchema.parse(record);
                return {
                    id: creditNote.creditnote_id,
                    ...creditNote
                };
            });

            if (creditNotes.length > 0) {
                await nango.batchSave(creditNotes, 'CreditNote');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CreditNote');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
