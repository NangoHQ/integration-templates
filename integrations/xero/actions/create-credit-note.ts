import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    description: z.string().describe('Line item description'),
    quantity: z.number().describe('Quantity of the item'),
    unit_amount: z.number().describe('Unit price of the item'),
    account_code: z.string().describe('Account code for the line item'),
    tax_type: z.string().optional().describe('Tax type for the line item'),
    item_code: z.string().optional().describe('Item code if referencing an existing item')
});

const InputSchema = z.object({
    contact_id: z.string().describe('Xero ContactID for the credit note. Example: "430fa14a-f945-44d3-9f97-5df5e28441b8"'),
    type: z.enum(['ACCPAYCREDIT', 'ACCRECCREDIT']).describe('Credit note type'),
    date: z.string().describe('Date the credit note is issued YYYY-MM-DD. Example: "2024-01-15"'),
    line_items: z.array(LineItemInputSchema).min(1).describe('Line items for the credit note'),
    reference: z.string().optional().describe('Additional reference number (ACCRECCREDIT only)'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED']).optional().describe('Status of the credit note'),
    line_amount_types: z.enum(['Exclusive', 'Inclusive', 'NoTax']).optional().describe('Line amount types')
});

const LineItemOutputSchema = z.object({
    LineItemID: z.string().optional(),
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional(),
    LineAmount: z.number().optional()
});

const ContactOutputSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional(),
    ContactStatus: z.string().optional()
});

const CreditNoteOutputSchema = z.object({
    CreditNoteID: z.string().optional(),
    CreditNoteNumber: z.string().optional(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    Contact: ContactOutputSchema.optional(),
    Date: z.string().optional(),
    Reference: z.string().optional(),
    LineAmountTypes: z.string().optional(),
    LineItems: z.array(LineItemOutputSchema).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    RemainingCredit: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    CurrencyCode: z.string().optional(),
    HasErrors: z.boolean().optional(),
    ValidationErrors: z
        .array(
            z.object({
                Message: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    credit_note: CreditNoteOutputSchema
});

const action = createAction({
    description: 'Create a credit note for a contact',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-credit-note',
        group: 'Credit Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const lineItems = input.line_items.map((item) => {
            const lineItem: Record<string, unknown> = {
                Description: item.description,
                Quantity: item.quantity,
                UnitAmount: item.unit_amount,
                AccountCode: item.account_code
            };
            if (item.tax_type !== undefined) {
                lineItem['TaxType'] = item.tax_type;
            }
            if (item.item_code !== undefined) {
                lineItem['ItemCode'] = item.item_code;
            }
            return lineItem;
        });

        const creditNote: Record<string, unknown> = {
            Type: input.type,
            Contact: {
                ContactID: input.contact_id
            },
            Date: input.date,
            LineItems: lineItems
        };

        if (input.reference !== undefined) {
            creditNote['Reference'] = input.reference;
        }
        if (input.status !== undefined) {
            creditNote['Status'] = input.status;
        }
        if (input.line_amount_types !== undefined) {
            creditNote['LineAmountTypes'] = input.line_amount_types;
        }

        const payload = {
            CreditNotes: [creditNote]
        };

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const response = await nango.put({
            endpoint: 'api.xro/2.0/CreditNotes',
            headers: {
                'xero-tenant-id': tenantId,
                'Content-Type': 'application/json'
            },
            data: payload,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API: missing data'
            });
        }

        if (!('CreditNotes' in response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API: CreditNotes property is missing'
            });
        }

        const creditNotesArray = response.data.CreditNotes;
        if (!Array.isArray(creditNotesArray) || creditNotesArray.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API: CreditNotes array is missing or empty'
            });
        }

        const firstCreditNote = creditNotesArray[0];
        if (!firstCreditNote || typeof firstCreditNote !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API: first credit note is not an object'
            });
        }

        const providerCreditNote = CreditNoteOutputSchema.parse(firstCreditNote);

        if (providerCreditNote.HasErrors === true) {
            const errors =
                providerCreditNote.ValidationErrors?.map((e) => e.Message)
                    .filter(Boolean)
                    .join(', ') || 'Unknown validation error';
            throw new nango.ActionError({
                type: 'validation_error',
                message: `Credit note creation failed: ${errors}`
            });
        }

        return {
            credit_note: providerCreditNote
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;

async function resolveTenantId(nango: NangoActionLocal): Promise<string> {
    const connection = await nango.getConnection();

    const connectionConfigTenantId = connection.connection_config?.['tenant_id'];
    if (typeof connectionConfigTenantId === 'string' && connectionConfigTenantId.length > 0) {
        return connectionConfigTenantId;
    }

    const metadataTenantId = connection.metadata?.['tenantId'];
    if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
        return metadataTenantId;
    }

    // https://developer.xero.com/documentation/api/accounting/overview#get-organisation
    const connectionsResponse = await nango.get({
        // https://developer.xero.com/documentation/api/accounting/organisationconnections
        endpoint: 'connections',
        retries: 10
    });

    const connectionsData = connectionsResponse.data;
    if (!connectionsData || typeof connectionsData !== 'object') {
        throw new nango.ActionError({
            type: 'tenant_resolution_failed',
            message: 'Failed to resolve tenantId: connections response data is not an object'
        });
    }

    const connectionsArray = Array.isArray(connectionsData) ? connectionsData : connectionsData.data;
    if (!Array.isArray(connectionsArray)) {
        throw new nango.ActionError({
            type: 'tenant_resolution_failed',
            message: 'Failed to resolve tenantId: connections response does not contain an array'
        });
    }

    if (connectionsArray.length === 0) {
        throw new nango.ActionError({
            type: 'tenant_resolution_failed',
            message: 'Failed to resolve tenantId: no tenants found'
        });
    }

    if (connectionsArray.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = connectionsArray[0];
    if (!firstConnection || typeof firstConnection !== 'object') {
        throw new nango.ActionError({
            type: 'tenant_resolution_failed',
            message: 'Failed to resolve tenantId: first connection is not an object'
        });
    }

    const tenantId = firstConnection.tenantId;
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
        throw new nango.ActionError({
            type: 'tenant_resolution_failed',
            message: 'Failed to resolve tenantId: tenantId is missing or empty in connections response'
        });
    }

    return tenantId;
}
