import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        credit_note_id: z.string().describe('The Xero CreditNoteID to delete. Example: "a3f2c4d5-e6b7-4890-abcd-1234567890ab"')
    })
    .describe('Input to delete a Xero credit note.');

const CreditNoteOutputSchema = z
    .object({
        credit_note_id: z.string().describe('Unique Xero identifier for the credit note.'),
        credit_note_number: z.string().optional().describe('Human-readable credit note number.'),
        status: z.string().describe('Current status of the credit note, e.g. DELETED.')
    })
    .describe('Output of a deleted Xero credit note.');

const ProviderCreditNoteSchema = z.object({
    CreditNoteID: z.string(),
    CreditNoteNumber: z.string().optional(),
    Status: z.string()
});

const ProviderCreditNotesResponseSchema = z.object({
    CreditNotes: z.array(ProviderCreditNoteSchema).optional(),
    Status: z.string().optional()
});

const ConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates the provider credit note status to DELETED, which is difficult to reverse.
 * @pitfalls: Only credit notes in DRAFT or SUBMITTED status can be deleted; AUTHORISED credit notes must be voided first. The record is not removed — it remains gettable by ID with Status DELETED.
 */
const action = createAction({
    description: 'Delete a draft or submitted credit note by setting its status to DELETED.',
    version: '1.0.0',
    input: InputSchema,
    output: CreditNoteOutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof CreditNoteOutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config !== undefined && connection.connection_config !== null ? connection.connection_config : {};
        const metadata = connection.metadata !== undefined && connection.metadata !== null ? connection.metadata : {};

        let tenantId: string | undefined;
        if (typeof connectionConfig['tenant_id'] === 'string' && connectionConfig['tenant_id'].length > 0) {
            tenantId = connectionConfig['tenant_id'];
        } else if (typeof metadata['tenantId'] === 'string' && metadata['tenantId'].length > 0) {
            tenantId = metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/best-practices/managing-connections/connections/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const connections = ConnectionsResponseSchema.parse(connectionsResponse.data);
            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            const firstConnection = connections[0];
            if (firstConnection !== undefined && firstConnection.tenantId.length > 0) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const response = await nango.post({
            endpoint: `api.xro/2.0/CreditNotes/${encodeURIComponent(input.credit_note_id)}`,
            headers: {
                'xero-tenant-id': tenantId,
                'Content-Type': 'application/json'
            },
            data: {
                Status: 'DELETED'
            },
            retries: 3
        });

        const responseData = ProviderCreditNotesResponseSchema.parse(response.data);

        const creditNotes = responseData.CreditNotes;
        if (!creditNotes || creditNotes.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Credit note not found or could not be deleted.',
                credit_note_id: input.credit_note_id
            });
        }

        const creditNote = creditNotes[0];
        if (creditNote === undefined) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider returned an empty credit notes array.',
                credit_note_id: input.credit_note_id
            });
        }

        return {
            credit_note_id: creditNote.CreditNoteID,
            ...(creditNote.CreditNoteNumber !== undefined && { credit_note_number: creditNote.CreditNoteNumber }),
            status: creditNote.Status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
