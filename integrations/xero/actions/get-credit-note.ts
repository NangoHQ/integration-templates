import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        creditNoteId: z.string().describe('Unique Xero identifier for the credit note. Example: "02cce9fe-e160-4fba-af84-8cc618a89ebe"')
    })
    .describe('Input to retrieve a single Xero credit note by its unique ID.');

const ContactSchema = z
    .object({
        ContactID: z.string().describe('Unique identifier for the contact.'),
        Name: z.string().describe('Name of the contact.')
    })
    .passthrough();

const AllocationSchema = z
    .object({
        AllocationID: z.string().describe('Unique identifier for the allocation.'),
        Amount: z.number().describe('Amount allocated to the invoice.'),
        Date: z.string().describe('Date the credit note was applied.'),
        Invoice: z
            .object({
                InvoiceID: z.string().describe('Unique identifier for the invoice.'),
                InvoiceNumber: z.string().describe('Invoice number reference.')
            })
            .passthrough()
            .describe('Invoice this credit note allocation is applied against.')
    })
    .passthrough();

const CreditNoteSchema = z
    .object({
        CreditNoteID: z.string().describe('Unique identifier for the credit note.'),
        CreditNoteNumber: z.string().optional().describe('Xero-generated credit note number.'),
        Type: z.string().describe('Credit note type, e.g. ACCRECCREDIT or ACCPAYCREDIT.'),
        Status: z.string().describe('Status of the credit note, e.g. AUTHORISED, PAID, VOIDED, DELETED.'),
        Contact: ContactSchema.describe('Contact associated with the credit note.'),
        Date: z.string().optional().describe('Date of the credit note in Xero date format.'),
        DateString: z.string().optional().describe('Date of the credit note as an ISO string.'),
        LineAmountTypes: z.string().optional().describe('Line amount type, e.g. Inclusive, Exclusive, NoTax.'),
        SubTotal: z.number().optional().describe('Subtotal before tax.'),
        TotalTax: z.number().optional().describe('Total tax amount.'),
        Total: z.number().optional().describe('Total amount including tax.'),
        UpdatedDateUTC: z.string().optional().describe('Last modified date in Xero date format.'),
        UpdatedDateUTCString: z.string().optional().describe('Last modified date as an ISO string.'),
        CurrencyCode: z.string().optional().describe('Currency code, e.g. USD.'),
        CurrencyRate: z.number().optional().describe('Exchange rate to the base currency.'),
        FullyPaidOnDate: z.string().optional().describe('Date the credit note was fully paid.'),
        RemainingCredit: z.number().optional().describe('Remaining unallocated credit amount.'),
        Allocations: z.array(AllocationSchema).optional().describe('Allocations of this credit note against invoices.')
    })
    .passthrough();

const OutputSchema = CreditNoteSchema.describe('A single Xero credit note returned by the Accounting API.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing credit note from the Xero Accounting API.
 * @pitfalls: Deleted and voided credit notes remain retrievable and return a 200 with Status set to DELETED or VOIDED instead of a 404.
 */
const action = createAction({
    description: 'Retrieve a credit note by CreditNoteID.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfig = z.object({ tenant_id: z.string().optional() }).parse(connection.connection_config || {});
        const metadata = z.object({ tenantId: z.string().optional() }).parse(connection.metadata || {});

        let tenantId: string | undefined = connectionConfig.tenant_id && connectionConfig.tenant_id.length > 0 ? connectionConfig.tenant_id : undefined;
        if (!tenantId && metadata.tenantId && metadata.tenantId.length > 0) {
            tenantId = metadata.tenantId;
        }

        if (!tenantId) {
            const config = {
                endpoint: 'connections',
                retries: 10
            };
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const response = await nango.get(config);
            const connectionsData = response.data;
            if (!Array.isArray(connectionsData) || connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            const first = z.object({ tenantId: z.string() }).safeParse(connectionsData[0]);
            if (first.success && first.data.tenantId.length > 0) {
                tenantId = first.data.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/creditnotes
            endpoint: `api.xro/2.0/CreditNotes/${encodeURIComponent(input.creditNoteId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Credit note not found for ID: ${input.creditNoteId}`
            });
        }

        const raw = z.object({ CreditNotes: z.array(z.unknown()) }).parse(response.data);
        if (!raw.CreditNotes || raw.CreditNotes.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Credit note not found for ID: ${input.creditNoteId}`
            });
        }

        const creditNote = CreditNoteSchema.parse(raw.CreditNotes[0]);
        return creditNote;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
