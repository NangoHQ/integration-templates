import { createSync } from 'nango';
import { z } from 'zod';

import { OrganizationMetadataSchema, resolveSyncOrganizationId } from '../helpers/organization.js';
import { paginateByLastModifiedTime } from '../helpers/pagination.js';

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
        organization_id: z.string().describe('Organization the interrupted scan belongs to; a checkpoint for another organization is ignored.'),
        last_modified_time: z
            .string()
            .describe('Inclusive last_modified_time cursor to resume the interrupted full refresh from; empty before the first full page.'),
        page: z.number().int().positive().describe('Page within the records sharing the cursor timestamp.')
    })
    .describe('Checkpoint storing the keyset position of an interrupted credit notes full refresh.');

const sync = createSync({
    description: 'Sync all credit notes issued to customers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: OrganizationMetadataSchema,
    scopes: ['ZohoInventory.creditnotes.READ', 'ZohoInventory.settings.READ'],
    models: {
        CreditNote: CreditNoteSchema
    },

    exec: async (nango) => {
        const organizationId = await resolveSyncOrganizationId(nango);

        const checkpoint = CheckpointSchema.nullable().parse(await nango.getCheckpoint());
        // A checkpoint left by a scan of another organization (metadata changed mid-scan) does not apply.
        const resume = checkpoint?.organization_id === organizationId ? checkpoint : null;

        // Full refresh: deletions are only detectable by a complete scan. The scan uses a
        // last_modified_time keyset cursor (see paginateByLastModifiedTime) rather than page offsets,
        // so resuming an interrupted scan cannot skip records that trackDeletesEnd would then delete.
        await nango.trackDeletesStart('CreditNote');

        const pages = paginateByLastModifiedTime(nango, {
            // https://www.zoho.com/inventory/api/v1/credit-notes/#list-all-credit-notes
            endpoint: '/inventory/v1/creditnotes',
            responseKey: 'creditnotes',
            organizationId,
            start: { cursor: resume?.last_modified_time || undefined, page: resume?.page ?? 1 }
        });

        for await (const { records: batch, next, done } of pages) {
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

            if (!done) {
                await nango.saveCheckpoint({ organization_id: organizationId, last_modified_time: next.cursor ?? '', page: next.page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CreditNote');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
