import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    credit_note_id: z.string().describe('The Xero CreditNoteID. Example: "a3c4c3b0-1234-4567-8901-abcdef123456"')
});

const CreditNoteOutputSchema = z.object({
    credit_note_id: z.string(),
    credit_note_number: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    contact: z.union([
        z.object({
            contact_id: z.union([z.string(), z.null()]),
            name: z.union([z.string(), z.null()])
        }),
        z.null()
    ]),
    reference: z.union([z.string(), z.null()]),
    sub_total: z.union([z.number(), z.null()]),
    total_tax: z.union([z.number(), z.null()]),
    total: z.union([z.number(), z.null()]),
    currency_code: z.union([z.string(), z.null()]),
    remaining_credit: z.union([z.number(), z.null()]),
    fully_paid_on_date: z.union([z.string(), z.null()]),
    date: z.union([z.string(), z.null()]),
    line_amount_types: z.union([z.string(), z.null()]),
    has_attachments: z.union([z.boolean(), z.null()]),
    updated_date_utc: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    credit_note: z.union([CreditNoteOutputSchema, z.null()])
});

const action = createAction({
    description: 'Retrieve a credit note by CreditNoteID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-credit-note',
        group: 'Credit Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.nango.dev/reference/functions#get-the-connection-credentials
        const connectionResponse = await nango.getConnection();

        let tenantId: string | undefined;

        if (connectionResponse && typeof connectionResponse === 'object' && 'connection_config' in connectionResponse) {
            const config = connectionResponse.connection_config;
            if (config && typeof config === 'object' && 'tenant_id' in config) {
                const tid = config['tenant_id'];
                if (typeof tid === 'string') {
                    tenantId = tid;
                }
            }
        }

        if (!tenantId && connectionResponse && typeof connectionResponse === 'object' && 'metadata' in connectionResponse) {
            const meta = connectionResponse.metadata;
            if (meta && typeof meta === 'object' && 'tenantId' in meta) {
                const tid = meta['tenantId'];
                if (typeof tid === 'string') {
                    tenantId = tid;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;

            if (connectionsData && typeof connectionsData === 'object' && 'data' in connectionsData && Array.isArray(connectionsData.data)) {
                const connections = connectionsData.data;
                if (connections.length === 1) {
                    const first = connections[0];
                    if (first && typeof first === 'object' && 'tenantId' in first) {
                        const tid = first['tenantId'];
                        if (typeof tid === 'string') {
                            tenantId = tid;
                        }
                    }
                } else if (connections.length > 1) {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Could not resolve Xero tenant ID. Please configure tenant_id in connection_config or set tenantId in metadata.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const response = await nango.get({
            endpoint: `api.xro/2.0/CreditNotes/${input.credit_note_id}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const responseData = response.data;

        if (!responseData || typeof responseData !== 'object') {
            return { credit_note: null };
        }

        const creditNotesData = 'CreditNotes' in responseData ? responseData.CreditNotes : undefined;

        if (!Array.isArray(creditNotesData) || creditNotesData.length === 0) {
            return { credit_note: null };
        }

        const creditNote = creditNotesData[0];

        if (!creditNote || typeof creditNote !== 'object') {
            return { credit_note: null };
        }

        const isRecord = (val: unknown): val is Record<string, unknown> => {
            return val !== null && typeof val === 'object' && !Array.isArray(val);
        };

        const getString = (obj: unknown, key: string): string | null => {
            if (isRecord(obj) && key in obj) {
                const val = obj[key];
                return typeof val === 'string' ? val : null;
            }
            return null;
        };

        const getNumber = (obj: unknown, key: string): number | null => {
            if (isRecord(obj) && key in obj) {
                const val = obj[key];
                return typeof val === 'number' ? val : null;
            }
            return null;
        };

        const getBoolean = (obj: unknown, key: string): boolean | null => {
            if (isRecord(obj) && key in obj) {
                const val = obj[key];
                return typeof val === 'boolean' ? val : null;
            }
            return null;
        };

        const cnId = getString(creditNote, 'CreditNoteID');
        const cnNumber = getString(creditNote, 'CreditNoteNumber');
        const status = getString(creditNote, 'Status');
        const type = getString(creditNote, 'Type');
        const reference = getString(creditNote, 'Reference');
        const subTotal = getNumber(creditNote, 'SubTotal');
        const totalTax = getNumber(creditNote, 'TotalTax');
        const total = getNumber(creditNote, 'Total');
        const currencyCode = getString(creditNote, 'CurrencyCode');
        const remainingCredit = getNumber(creditNote, 'RemainingCredit');
        const fullyPaidOnDate = getString(creditNote, 'FullyPaidOnDate');
        const date = getString(creditNote, 'Date');
        const lineAmountTypes = getString(creditNote, 'LineAmountTypes');
        const hasAttachments = getBoolean(creditNote, 'HasAttachments');
        const updatedDateUtc = getString(creditNote, 'UpdatedDateUTC');

        let contactObj: { contact_id: string | null; name: string | null } | null = null;
        if (creditNote && typeof creditNote === 'object' && 'Contact' in creditNote) {
            const contact = creditNote.Contact;
            if (contact && typeof contact === 'object') {
                const contactId = getString(contact, 'ContactID');
                const contactName = getString(contact, 'Name');
                contactObj = {
                    contact_id: contactId,
                    name: contactName
                };
            }
        }

        if (!cnId) {
            return { credit_note: null };
        }

        return {
            credit_note: {
                credit_note_id: cnId,
                credit_note_number: cnNumber,
                status: status,
                type: type,
                contact: contactObj,
                reference: reference,
                sub_total: subTotal,
                total_tax: totalTax,
                total: total,
                currency_code: currencyCode,
                remaining_credit: remainingCredit,
                fully_paid_on_date: fullyPaidOnDate,
                date: date,
                line_amount_types: lineAmountTypes,
                has_attachments: hasAttachments,
                updated_date_utc: updatedDateUtc
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
