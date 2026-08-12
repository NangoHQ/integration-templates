import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        creditNoteId: z.string().describe('The Xero CreditNoteID of the credit note to update. Example: "02cce9fe-e160-4fba-af84-8cc618a89ebe"'),
        status: z.string().optional().describe('New status for the credit note. Valid values: DRAFT, SUBMITTED, AUTHORISED, VOIDED, DELETED.'),
        reference: z.string().nullable().optional().describe('New reference text. Pass null to clear the existing reference.'),
        sentToContact: z.boolean().optional().describe('Whether the credit note has been sent to the contact.')
    })
    .describe('Input fields for updating an existing Xero credit note.');

const ProviderContactSchema = z.object({
    ContactID: z.string(),
    Name: z.string().optional()
});

const ProviderLineItemSchema = z.object({
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional()
});

const ProviderCreditNoteSchema = z.object({
    CreditNoteID: z.string(),
    CreditNoteNumber: z.string().optional(),
    Status: z.string().optional(),
    Reference: z.string().optional(),
    Type: z.string().optional(),
    Contact: ProviderContactSchema.optional(),
    Date: z.string().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    LineItems: z.array(ProviderLineItemSchema).optional()
});

const ProviderResponseSchema = z.object({
    CreditNotes: z.array(ProviderCreditNoteSchema).optional(),
    Status: z.string().optional()
});

const OutputSchema = z
    .object({
        creditNoteId: z.string().describe('The Xero CreditNoteID of the updated credit note.'),
        creditNoteNumber: z.string().optional().describe('The human-readable credit note number assigned by Xero.'),
        status: z.string().optional().describe('Current status of the credit note, e.g. AUTHORISED, VOIDED, DELETED.'),
        reference: z.string().optional().describe('Reference text associated with the credit note.'),
        type: z.string().optional().describe('Credit note type, e.g. ACCPAYCREDIT or ACCRECCREDIT.'),
        contact: z
            .object({
                contactId: z.string().describe('Xero ContactID of the associated contact.'),
                name: z.string().optional().describe('Display name of the associated contact.')
            })
            .optional()
            .describe('Contact associated with the credit note.'),
        date: z.string().optional().describe('Issue date of the credit note in YYYY-MM-DD format.'),
        subTotal: z.number().optional().describe('Subtotal amount excluding tax.'),
        totalTax: z.number().optional().describe('Total tax amount.'),
        total: z.number().optional().describe('Total amount including tax.'),
        updatedDateUtc: z.string().optional().describe('UTC timestamp of the last update in ISO 8601 format.')
    })
    .describe('The updated Xero credit note returned after a successful update.');

/**
 * @tags: [write]
 * @tagReason: Sends a POST mutation to update an existing credit note on the provider.
 * @pitfalls: Updates fail if the credit note's contact is archived, even for non-contact changes. An AUTHORISED credit note must be VOIDED before it can be DELETED; DELETED only works directly from DRAFT or SUBMITTED.
 */
const action = createAction({
    description: 'Update an existing credit note.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const ConnectionConfigSchema = z.object({
            tenant_id: z.string().optional()
        });
        const connectionConfig = ConnectionConfigSchema.parse(connection.connection_config || {});

        const MetadataSchema = z.object({
            tenantId: z.string().optional()
        });
        const metadata = MetadataSchema.parse(connection.metadata || {});

        let tenantId = connectionConfig.tenant_id || metadata.tenantId || '';

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/auth-flow/#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const rawConnections = connectionsResponse.data;
            if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (rawConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = z.object({ tenantId: z.string() }).safeParse(rawConnections[0]);
            if (firstConnection.success && firstConnection.data.tenantId.length > 0) {
                tenantId = firstConnection.data.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const creditNotePayload: Record<string, unknown> = {
            CreditNoteID: input.creditNoteId,
            ...(input.status !== undefined && { Status: input.status }),
            ...(input.reference !== undefined && { Reference: input.reference }),
            ...(input.sentToContact !== undefined && { SentToContact: input.sentToContact })
        };

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const response = await nango.post({
            endpoint: 'api.xro/2.0/CreditNotes',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                CreditNotes: [creditNotePayload]
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data || {});

        if (parsed.Status && parsed.Status !== 'OK') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Xero returned status: ${parsed.Status}`
            });
        }

        const creditNotes = parsed.CreditNotes || [];
        const firstNote = creditNotes[0];

        if (!firstNote) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No credit note returned in the provider response.'
            });
        }

        return {
            creditNoteId: firstNote.CreditNoteID,
            ...(firstNote.CreditNoteNumber !== undefined && { creditNoteNumber: firstNote.CreditNoteNumber }),
            ...(firstNote.Status !== undefined && { status: firstNote.Status }),
            ...(firstNote.Reference !== undefined && { reference: firstNote.Reference }),
            ...(firstNote.Type !== undefined && { type: firstNote.Type }),
            ...(firstNote.Contact !== undefined && {
                contact: {
                    contactId: firstNote.Contact.ContactID,
                    ...(firstNote.Contact.Name !== undefined && { name: firstNote.Contact.Name })
                }
            }),
            ...(firstNote.Date !== undefined && { date: firstNote.Date }),
            ...(firstNote.SubTotal !== undefined && { subTotal: firstNote.SubTotal }),
            ...(firstNote.TotalTax !== undefined && { totalTax: firstNote.TotalTax }),
            ...(firstNote.Total !== undefined && { total: firstNote.Total }),
            ...(firstNote.UpdatedDateUTC !== undefined && { updatedDateUtc: firstNote.UpdatedDateUTC })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
