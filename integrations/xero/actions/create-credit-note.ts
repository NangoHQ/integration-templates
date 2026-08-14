import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    description: z.string().describe('Description of the line item.'),
    quantity: z.number().describe('Quantity of the item.'),
    unitAmount: z.number().describe('Unit price of the item.'),
    accountCode: z.string().optional().describe('Account code for the line item. Required unless itemCode is provided.'),
    itemCode: z.string().optional().describe('Item code for the line item. Used to look up default account and pricing.'),
    taxType: z.string().optional().describe('Tax type for the line item.')
});

const InputSchema = z
    .object({
        type: z
            .enum(['ACCRECCREDIT', 'ACCPAYCREDIT'])
            .describe('Type of credit note. ACCRECCREDIT for a sales credit note or ACCPAYCREDIT for a purchase credit note.'),
        contactId: z.string().describe('Xero Contact ID to associate with the credit note.'),
        date: z.string().describe('Date of the credit note in YYYY-MM-DD format.'),
        status: z
            .enum(['AUTHORISED', 'DRAFT', 'SUBMITTED'])
            .optional()
            .describe('Status of the credit note. DRAFT does not post to the ledger; SUBMITTED is pending approval; AUTHORISED does post.'),
        lineItems: z.array(LineItemInputSchema).describe('Line items for the credit note.')
    })
    .describe('Input for creating a Xero credit note.');

const ProviderContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const ProviderLineItemSchema = z.object({
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    ItemCode: z.string().optional(),
    TaxType: z.string().optional(),
    LineAmount: z.number().optional(),
    TaxAmount: z.number().optional()
});

const ProviderCreditNoteSchema = z.object({
    CreditNoteID: z.string().optional(),
    CreditNoteNumber: z.string().optional(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    Contact: ProviderContactSchema.optional(),
    Date: z.string().optional(),
    LineItems: z.array(ProviderLineItemSchema).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    HasErrors: z.boolean().optional(),
    ValidationErrors: z
        .array(
            z.object({
                Message: z.string().optional()
            })
        )
        .optional()
});

const ProviderResponseSchema = z.object({
    CreditNotes: z.array(ProviderCreditNoteSchema).optional()
});

const XeroValidationErrorResponseSchema = z.object({
    Elements: z.array(
        z.object({
            ValidationErrors: z
                .array(
                    z.object({
                        Message: z.string().optional()
                    })
                )
                .optional()
        })
    )
});

const ErrorWithResponseDataSchema = z.object({
    response: z.object({
        data: z.unknown()
    })
});

function extractXeroValidationError(err: unknown): string | undefined {
    const parsedError = ErrorWithResponseDataSchema.safeParse(err);
    if (!parsedError.success) {
        return undefined;
    }

    const parsed = XeroValidationErrorResponseSchema.safeParse(parsedError.data.response.data);
    if (!parsed.success) {
        return undefined;
    }

    const messages = parsed.data.Elements.flatMap((element) => element.ValidationErrors?.map((e) => e.Message).filter(Boolean) ?? []);

    return messages.length > 0 ? messages.join(', ') : undefined;
}

const OutputSchema = z
    .object({
        creditNoteId: z.string().describe('Unique identifier of the created credit note.'),
        creditNoteNumber: z.string().optional().describe('Xero-generated credit note number.'),
        type: z.string().optional().describe('Type of the credit note.'),
        status: z.string().optional().describe('Status of the credit note.'),
        contactId: z.string().optional().describe('Contact ID associated with the credit note.'),
        contactName: z.string().optional().describe('Name of the associated contact.'),
        date: z.string().optional().describe('Date of the credit note.'),
        lineItems: z
            .array(
                z.object({
                    description: z.string().optional().describe('Description of the line item.'),
                    quantity: z.number().optional().describe('Quantity of the line item.'),
                    unitAmount: z.number().optional().describe('Unit price of the line item.'),
                    accountCode: z.string().optional().describe('Account code of the line item.'),
                    itemCode: z.string().optional().describe('Item code of the line item.'),
                    taxType: z.string().optional().describe('Tax type of the line item.'),
                    lineAmount: z.number().optional().describe('Total amount for the line item.'),
                    taxAmount: z.number().optional().describe('Tax amount for the line item.')
                })
            )
            .optional()
            .describe('Line items of the credit note.'),
        subTotal: z.number().optional().describe('Subtotal of the credit note.'),
        totalTax: z.number().optional().describe('Total tax of the credit note.'),
        total: z.number().optional().describe('Total amount of the credit note.'),
        updatedDateUTC: z.string().optional().describe('UTC timestamp when the credit note was last updated.')
    })
    .describe('Output of the created Xero credit note.');

/**
 * @tags: [write]
 * @tagReason: Creates a new credit note in Xero.
 * @pitfalls: DRAFT does not post to the ledger; an already-AUTHORISED credit note can only be reversed by voiding. Archived contacts are rejected. Output date fields use /Date(...)/ format.
 */
const action = createAction({
    description: 'Create a credit note for a contact.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        if (
            connection.connection_config &&
            typeof connection.connection_config === 'object' &&
            'tenant_id' in connection.connection_config &&
            typeof connection.connection_config['tenant_id'] === 'string'
        ) {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (
            !tenantId &&
            connection.metadata &&
            typeof connection.metadata === 'object' &&
            'tenantId' in connection.metadata &&
            typeof connection.metadata['tenantId'] === 'string'
        ) {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const connections = z.array(z.object({ tenantId: z.string() })).parse(connectionsResponse.data);
            const firstConnection = connections[0];
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            if (connections.length !== 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const lineItemsPayload = input.lineItems.map((item) => ({
            Description: item.description,
            Quantity: item.quantity,
            UnitAmount: item.unitAmount,
            ...(item.accountCode !== undefined && { AccountCode: item.accountCode }),
            ...(item.itemCode !== undefined && { ItemCode: item.itemCode }),
            ...(item.taxType !== undefined && { TaxType: item.taxType })
        }));

        const body: Record<string, unknown> = {
            Type: input.type,
            Contact: { ContactID: input.contactId },
            Date: input.date,
            LineItems: lineItemsPayload
        };

        if (input.status !== undefined) {
            body['Status'] = input.status;
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        // Xero returns HTTP 400 (not 200 with HasErrors) when the single submitted CreditNote fails validation,
        // so the validation message must be read off the thrown error's response body.
        let response;
        // @allowTryCatch
        try {
            response = await nango.put({
                endpoint: 'api.xro/2.0/CreditNotes',
                headers: {
                    'xero-tenant-id': tenantId
                },
                data: {
                    CreditNotes: [body]
                },
                retries: 3
            });
        } catch (err) {
            const validationMessage = extractXeroValidationError(err);
            if (validationMessage) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: `Credit note creation failed: ${validationMessage}`
                });
            }
            throw err;
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const creditNotes = parsed.CreditNotes;
        if (!creditNotes || creditNotes.length === 0) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned an empty CreditNotes array.'
            });
        }

        const note = creditNotes[0];
        if (!note) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned an empty CreditNotes array.'
            });
        }

        if (note.HasErrors === true) {
            const errors =
                note.ValidationErrors?.map((e) => e.Message)
                    .filter(Boolean)
                    .join(', ') || 'Unknown validation error';
            throw new nango.ActionError({
                type: 'validation_error',
                message: `Credit note creation failed: ${errors}`
            });
        }

        if (!note.CreditNoteID) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero did not return a CreditNoteID for the created credit note.'
            });
        }

        return {
            creditNoteId: note.CreditNoteID,
            ...(note.CreditNoteNumber !== undefined && { creditNoteNumber: note.CreditNoteNumber }),
            ...(note.Type !== undefined && { type: note.Type }),
            ...(note.Status !== undefined && { status: note.Status }),
            ...(note.Contact?.ContactID !== undefined && { contactId: note.Contact.ContactID }),
            ...(note.Contact?.Name !== undefined && { contactName: note.Contact.Name }),
            ...(note.Date !== undefined && { date: note.Date }),
            ...(note.LineItems !== undefined && {
                lineItems: note.LineItems.map((item) => ({
                    ...(item.Description !== undefined && { description: item.Description }),
                    ...(item.Quantity !== undefined && { quantity: item.Quantity }),
                    ...(item.UnitAmount !== undefined && { unitAmount: item.UnitAmount }),
                    ...(item.AccountCode !== undefined && { accountCode: item.AccountCode }),
                    ...(item.ItemCode !== undefined && { itemCode: item.ItemCode }),
                    ...(item.TaxType !== undefined && { taxType: item.TaxType }),
                    ...(item.LineAmount !== undefined && { lineAmount: item.LineAmount }),
                    ...(item.TaxAmount !== undefined && { taxAmount: item.TaxAmount })
                }))
            }),
            ...(note.SubTotal !== undefined && { subTotal: note.SubTotal }),
            ...(note.TotalTax !== undefined && { totalTax: note.TotalTax }),
            ...(note.Total !== undefined && { total: note.Total }),
            ...(note.UpdatedDateUTC !== undefined && { updatedDateUTC: note.UpdatedDateUTC })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
