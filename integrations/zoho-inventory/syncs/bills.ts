import { createSync } from 'nango';
import { z } from 'zod';

import { OrganizationMetadataSchema, resolveSyncOrganizationId } from '../helpers/organization.js';
import { paginateByLastModifiedTime } from '../helpers/pagination.js';

const ProviderBillSchema = z.object({
    bill_id: z.string(),
    bill_number: z.string().optional().nullable(),
    vendor_id: z.string().optional().nullable(),
    vendor_name: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    current_sub_status: z.string().optional().nullable(),
    reference_number: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    due_days: z.string().optional().nullable(),
    currency_id: z.string().optional().nullable(),
    currency_code: z.string().optional().nullable(),
    price_precision: z.number().optional().nullable(),
    exchange_rate: z.number().optional().nullable(),
    total: z.number().optional().nullable(),
    tds_total: z.number().optional().nullable(),
    balance: z.number().optional().nullable(),
    balance_due: z.number().optional().nullable(),
    unprocessed_payment_amount: z.number().optional().nullable(),
    created_time: z.string().optional().nullable(),
    last_modified_time: z.string().optional().nullable(),
    created_by: z.string().optional().nullable(),
    last_modified_by: z.string().optional().nullable(),
    has_attachment: z.boolean().optional().nullable(),
    is_opening_balance: z.string().optional().nullable(),
    is_uber_bill: z.boolean().optional().nullable(),
    is_tally_bill: z.boolean().optional().nullable(),
    entity_type: z.string().optional().nullable(),
    is_bill_reconciliation_violated: z.boolean().optional().nullable()
});

const BillSchema = z
    .object({
        id: z.string().describe('Unique Zoho Inventory bill ID. Example: "260815000000163114".'),
        bill_number: z.string().optional().describe('Bill number assigned by the organization. Example: "NANGO-UPDATE-BILL-TEST".'),
        vendor_id: z.string().optional().describe('Unique ID of the vendor the bill is recorded against.'),
        vendor_name: z.string().optional().describe('Display name of the vendor the bill is recorded against. Example: "Beta Supplies Ltd".'),
        status: z
            .string()
            .optional()
            .describe('Fulfillment/receipt rollup status of the bill, e.g. "open", "overdue", "paid" or "void". Can differ from current_sub_status.'),
        current_sub_status: z.string().optional().describe('Workflow sub-status of the bill, e.g. "open", "overdue" or "void". Example: "open".'),
        reference_number: z.string().optional().describe('Vendor reference number recorded on the bill, when provided.'),
        date: z.string().optional().describe('Bill date in yyyy-MM-dd format. Example: "2026-10-09".'),
        due_date: z.string().optional().describe('Payment due date in yyyy-MM-dd format. Example: "2026-10-09".'),
        due_days: z.string().optional().describe('Human-readable due-date description. Example: "Due Today".'),
        currency_id: z.string().optional().describe('Unique ID of the bill currency in Zoho Inventory.'),
        currency_code: z.string().optional().describe('ISO currency code of the bill. Example: "USD".'),
        price_precision: z.number().optional().describe('Number of decimal places used for prices on the bill. Example: 2.'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the bill currency. Example: 1.'),
        total: z.number().optional().describe('Total amount of the bill before payments. Example: 100.'),
        tds_total: z.number().optional().describe('Total tax deducted at source (TDS) amount on the bill.'),
        balance: z.number().optional().describe('Outstanding balance still due on the bill. Example: 100.'),
        balance_due: z.number().optional().describe('Balance due on the bill as reported by Zoho Inventory. Example: 100.'),
        unprocessed_payment_amount: z.number().optional().describe('Payment amount recorded against the bill but not yet processed.'),
        created_time: z.string().optional().describe('Timestamp when the bill was created, with a numeric UTC offset. Example: "2026-10-09T14:25:15-0400".'),
        last_modified_time: z
            .string()
            .optional()
            .describe('Timestamp when the bill was last modified, with a numeric UTC offset. Example: "2026-10-09T14:25:15-0400".'),
        created_by: z.string().optional().describe('Name of the user who created the bill. Example: "Nango Developer".'),
        last_modified_by: z.string().optional().describe('Name of the user who last modified the bill.'),
        has_attachment: z.boolean().optional().describe('Whether the bill has at least one attachment.'),
        is_opening_balance: z.string().optional().describe('Set to the bill ID when the bill was created as an opening-balance entry, otherwise empty.'),
        is_uber_bill: z.boolean().optional().describe('Whether the bill is an Uber-style receipt bill.'),
        is_tally_bill: z.boolean().optional().describe('Whether the bill came from a Tally import.'),
        entity_type: z.string().optional().describe('Zoho entity type for the record. Example: "bill".'),
        is_bill_reconciliation_violated: z.boolean().optional().describe('Whether the bill violates the organization bill-reconciliation setting.')
    })
    .describe('A vendor bill in Zoho Inventory.');

const CheckpointSchema = z
    .object({
        organization_id: z.string().describe('Organization the interrupted scan belongs to; a checkpoint for another organization is ignored.'),
        last_modified_time: z
            .string()
            .describe('Inclusive last_modified_time cursor to resume the interrupted full refresh from; empty before the first full page.'),
        page: z.number().int().positive().describe('Page within the records sharing the cursor timestamp.')
    })
    .describe('Checkpoint storing the keyset position of an interrupted bills full refresh.');

const sync = createSync({
    description: 'Sync all vendor bills in the organization.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: OrganizationMetadataSchema,
    scopes: ['ZohoInventory.bills.READ', 'ZohoInventory.settings.READ'],
    models: {
        Bill: BillSchema
    },

    exec: async (nango) => {
        const organizationId = await resolveSyncOrganizationId(nango);

        const checkpoint = CheckpointSchema.nullable().parse(await nango.getCheckpoint());
        // A checkpoint left by a scan of another organization (metadata changed mid-scan) does not apply.
        const resume = checkpoint?.organization_id === organizationId ? checkpoint : null;

        // Full refresh: deletions are only detectable by a complete scan. The scan uses a
        // last_modified_time keyset cursor (see paginateByLastModifiedTime) rather than page offsets,
        // so resuming an interrupted scan cannot skip records that trackDeletesEnd would then delete.
        await nango.trackDeletesStart('Bill');

        const pages = paginateByLastModifiedTime(nango, {
            // https://www.zoho.com/inventory/api/v1/bills/
            endpoint: '/inventory/v1/bills',
            responseKey: 'bills',
            organizationId,
            start: { cursor: resume?.last_modified_time || undefined, page: resume?.page ?? 1 }
        });

        for await (const { records: billsPage, next, done } of pages) {
            const parsedBills = z.array(ProviderBillSchema).safeParse(billsPage);
            if (!parsedBills.success) {
                throw new Error(`Failed to parse bills: ${parsedBills.error.message}`);
            }

            const bills = parsedBills.data.map((bill) => ({
                id: bill.bill_id,
                ...(bill.bill_number != null && { bill_number: bill.bill_number }),
                ...(bill.vendor_id != null && { vendor_id: bill.vendor_id }),
                ...(bill.vendor_name != null && { vendor_name: bill.vendor_name }),
                ...(bill.status != null && { status: bill.status }),
                ...(bill.current_sub_status != null && { current_sub_status: bill.current_sub_status }),
                ...(bill.reference_number != null && { reference_number: bill.reference_number }),
                ...(bill.date != null && { date: bill.date }),
                ...(bill.due_date != null && { due_date: bill.due_date }),
                ...(bill.due_days != null && { due_days: bill.due_days }),
                ...(bill.currency_id != null && { currency_id: bill.currency_id }),
                ...(bill.currency_code != null && { currency_code: bill.currency_code }),
                ...(bill.price_precision != null && { price_precision: bill.price_precision }),
                ...(bill.exchange_rate != null && { exchange_rate: bill.exchange_rate }),
                ...(bill.total != null && { total: bill.total }),
                ...(bill.tds_total != null && { tds_total: bill.tds_total }),
                ...(bill.balance != null && { balance: bill.balance }),
                ...(bill.balance_due != null && { balance_due: bill.balance_due }),
                ...(bill.unprocessed_payment_amount != null && { unprocessed_payment_amount: bill.unprocessed_payment_amount }),
                ...(bill.created_time != null && { created_time: bill.created_time }),
                ...(bill.last_modified_time != null && { last_modified_time: bill.last_modified_time }),
                ...(bill.created_by != null && { created_by: bill.created_by }),
                ...(bill.last_modified_by != null && { last_modified_by: bill.last_modified_by }),
                ...(bill.has_attachment != null && { has_attachment: bill.has_attachment }),
                ...(bill.is_opening_balance != null && { is_opening_balance: bill.is_opening_balance }),
                ...(bill.is_uber_bill != null && { is_uber_bill: bill.is_uber_bill }),
                ...(bill.is_tally_bill != null && { is_tally_bill: bill.is_tally_bill }),
                ...(bill.entity_type != null && { entity_type: bill.entity_type }),
                ...(bill.is_bill_reconciliation_violated != null && { is_bill_reconciliation_violated: bill.is_bill_reconciliation_violated })
            }));

            if (bills.length > 0) {
                await nango.batchSave(bills, 'Bill');
            }

            if (!done) {
                await nango.saveCheckpoint({ organization_id: organizationId, last_modified_time: next.cursor ?? '', page: next.page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Bill');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
