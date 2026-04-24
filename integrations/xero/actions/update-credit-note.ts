import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    CreditNoteID: z.string().describe('Credit Note ID. Example: "249f15fa-f2a7-4acc-8769-0984103f2225"'),
    Status: z.string().optional().describe('Status. Example: "AUTHORISED"'),
    Reference: z.string().optional().describe('Reference. Example: "Updated Reference"'),
    Date: z.string().optional().describe('Date in YYYY-MM-DD format'),
    ContactID: z.string().optional().describe('Contact ID. Example: "430fa14a-f945-44d3-9f97-5df5e28441b8"'),
    LineAmountTypes: z.string().optional().describe('Line amount types. Example: "Exclusive"'),
    Type: z.string().optional().describe('Credit note type. Example: "ACCPAYCREDIT"')
});

const CreditNoteSchema = z.object({
    CreditNoteID: z.string().optional(),
    CreditNoteNumber: z.string().optional(),
    Status: z.string().optional(),
    Reference: z.string().optional(),
    Type: z.string().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    CurrencyCode: z.string().optional(),
    LineAmountTypes: z.string().optional()
});

const OutputSchema = z.object({
    CreditNoteID: z.string(),
    CreditNoteNumber: z.string().optional(),
    Status: z.string().optional(),
    Reference: z.string().optional(),
    Type: z.string().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    CurrencyCode: z.string().optional(),
    LineAmountTypes: z.string().optional()
});

const XeroResponseSchema = z.object({
    CreditNotes: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Update an existing credit note.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-credit-note',
        group: 'Credit Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const configTenantId = connection.connection_config['tenant_id'];
        if (typeof configTenantId === 'string') {
            tenantId = configTenantId;
        }

        if (!tenantId && connection.metadata !== null) {
            const metaTenantId = connection.metadata['tenantId'];
            if (typeof metaTenantId === 'string') {
                tenantId = metaTenantId;
            }
        }

        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/connections
                endpoint: 'connections',
                retries: 10
            });

            const data: unknown = connectionsResponse.data;
            if (!Array.isArray(data)) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No tenant data found in connections response.'
                });
            }

            if (data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No tenants found for this connection.'
                });
            }

            if (data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = data[0];
            if (firstConnection === undefined || typeof firstConnection !== 'object' || firstConnection === null) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'Invalid tenant data in connections response.'
                });
            }

            const resolvedTenantId = 'tenantId' in firstConnection ? firstConnection['tenantId'] : undefined;
            if (typeof resolvedTenantId === 'string') {
                tenantId = resolvedTenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Could not resolve Xero tenant ID.'
            });
        }

        const creditNotePayload: Record<string, unknown> = {
            CreditNoteID: input.CreditNoteID
        };

        if (input.Status !== undefined) {
            creditNotePayload['Status'] = input.Status;
        }
        if (input.Reference !== undefined) {
            creditNotePayload['Reference'] = input.Reference;
        }
        if (input.Date !== undefined) {
            creditNotePayload['Date'] = input.Date;
        }
        if (input.ContactID !== undefined) {
            creditNotePayload['Contact'] = { ContactID: input.ContactID };
        }
        if (input.LineAmountTypes !== undefined) {
            creditNotePayload['LineAmountTypes'] = input.LineAmountTypes;
        }
        if (input.Type !== undefined) {
            creditNotePayload['Type'] = input.Type;
        }

        const response = await nango.post({
            // https://developer.xero.com/documentation/api/accounting/creditnotes
            endpoint: 'api.xro/2.0/CreditNotes',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                CreditNotes: [creditNotePayload]
            },
            retries: 3
        });

        const responseData: unknown = response.data;
        if (responseData === null || typeof responseData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API.'
            });
        }

        const parsedResponse = XeroResponseSchema.safeParse(responseData);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Could not parse Xero API response.'
            });
        }

        const creditNotes = parsedResponse.data.CreditNotes;
        if (!creditNotes || creditNotes.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Credit note was not returned in the response.'
            });
        }

        const firstCreditNote = creditNotes[0];
        if (firstCreditNote === undefined || typeof firstCreditNote !== 'object' || firstCreditNote === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid credit note data in response.'
            });
        }

        const parsedCreditNote = CreditNoteSchema.parse(firstCreditNote);

        if (!parsedCreditNote.CreditNoteID) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Credit Note ID is missing from the response.'
            });
        }

        return {
            CreditNoteID: parsedCreditNote.CreditNoteID,
            ...(parsedCreditNote.CreditNoteNumber !== undefined && { CreditNoteNumber: parsedCreditNote.CreditNoteNumber }),
            ...(parsedCreditNote.Status !== undefined && { Status: parsedCreditNote.Status }),
            ...(parsedCreditNote.Reference !== undefined && { Reference: parsedCreditNote.Reference }),
            ...(parsedCreditNote.Type !== undefined && { Type: parsedCreditNote.Type }),
            ...(parsedCreditNote.Total !== undefined && { Total: parsedCreditNote.Total }),
            ...(parsedCreditNote.UpdatedDateUTC !== undefined && { UpdatedDateUTC: parsedCreditNote.UpdatedDateUTC }),
            ...(parsedCreditNote.Date !== undefined && { Date: parsedCreditNote.Date }),
            ...(parsedCreditNote.DueDate !== undefined && { DueDate: parsedCreditNote.DueDate }),
            ...(parsedCreditNote.SubTotal !== undefined && { SubTotal: parsedCreditNote.SubTotal }),
            ...(parsedCreditNote.TotalTax !== undefined && { TotalTax: parsedCreditNote.TotalTax }),
            ...(parsedCreditNote.CurrencyCode !== undefined && { CurrencyCode: parsedCreditNote.CurrencyCode }),
            ...(parsedCreditNote.LineAmountTypes !== undefined && { LineAmountTypes: parsedCreditNote.LineAmountTypes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
