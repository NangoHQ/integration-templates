import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    creditNoteId: z.string().describe('The Xero CreditNoteID. Example: "a3c4c3b0-1234-4567-8901-abcdef123456"')
});

const CreditNoteOutputSchema = z.object({
    creditNoteId: z.string(),
    creditNoteNumber: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    contact: z.union([
        z.object({
            contactId: z.union([z.string(), z.null()]),
            name: z.union([z.string(), z.null()])
        }),
        z.null()
    ]),
    reference: z.union([z.string(), z.null()]),
    subTotal: z.union([z.number(), z.null()]),
    totalTax: z.union([z.number(), z.null()]),
    total: z.union([z.number(), z.null()]),
    currencyCode: z.union([z.string(), z.null()]),
    remainingCredit: z.union([z.number(), z.null()]),
    fullyPaidOnDate: z.union([z.string(), z.null()]),
    date: z.union([z.string(), z.null()]),
    lineAmountTypes: z.union([z.string(), z.null()]),
    hasAttachments: z.union([z.boolean(), z.null()]),
    updatedDateUtc: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    creditNote: z.union([CreditNoteOutputSchema, z.null()])
});

const ConnectionsResponseSchema = z.array(z.object({ tenantId: z.string() }));

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

            const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse.data);

            if (!parsedConnections.success) {
                throw new nango.ActionError({ type: 'invalid_response', message: 'Failed to parse connections response' });
            }

            const connections = parsedConnections.data;

            if (connections.length === 0) {
                throw new nango.ActionError({ type: 'no_tenant', message: 'No Xero tenants found for this connection' });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            tenantId = connections[0]!.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Could not resolve Xero tenant ID. Please configure tenant_id in connection_config or set tenantId in metadata.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const response = await nango.get({
            endpoint: `api.xro/2.0/CreditNotes/${input.creditNoteId}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const responseData = response.data;

        if (!responseData || typeof responseData !== 'object') {
            return { creditNote: null };
        }

        const creditNotesData = 'CreditNotes' in responseData ? responseData.CreditNotes : undefined;

        if (!Array.isArray(creditNotesData) || creditNotesData.length === 0) {
            return { creditNote: null };
        }

        const creditNote = creditNotesData[0];

        if (!creditNote || typeof creditNote !== 'object') {
            return { creditNote: null };
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

        let contactObj: { contactId: string | null; name: string | null } | null = null;
        if (creditNote && typeof creditNote === 'object' && 'Contact' in creditNote) {
            const contact = creditNote.Contact;
            if (contact && typeof contact === 'object') {
                const contactId = getString(contact, 'ContactID');
                const contactName = getString(contact, 'Name');
                contactObj = {
                    contactId: contactId,
                    name: contactName
                };
            }
        }

        if (!cnId) {
            return { creditNote: null };
        }

        return {
            creditNote: {
                creditNoteId: cnId,
                creditNoteNumber: cnNumber,
                status: status,
                type: type,
                contact: contactObj,
                reference: reference,
                subTotal: subTotal,
                totalTax: totalTax,
                total: total,
                currencyCode: currencyCode,
                remainingCredit: remainingCredit,
                fullyPaidOnDate: fullyPaidOnDate,
                date: date,
                lineAmountTypes: lineAmountTypes,
                hasAttachments: hasAttachments,
                updatedDateUtc: updatedDateUtc
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
