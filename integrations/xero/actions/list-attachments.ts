import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        resourceType: z
            .enum(['Invoices', 'Contacts', 'CreditNotes', 'BankTransactions', 'ManualJournals', 'PurchaseOrders'])
            .describe('The Xero resource type that supports attachments.'),
        resourceId: z.string().describe('The unique ID of the specific resource to list attachments for. Example: "06c18279-c848-4b69-b434-6b9fecc75a47"')
    })
    .describe('Input parameters for listing attachments on a Xero resource.');

const ProviderAttachmentSchema = z.object({
    AttachmentID: z.string().optional(),
    FileName: z.string().optional(),
    Url: z.string().optional(),
    MimeType: z.string().optional(),
    ContentLength: z.number().optional()
});

const ProviderResponseSchema = z.object({
    Attachments: z.array(ProviderAttachmentSchema).optional()
});

const OutputSchema = z
    .object({
        Attachments: z
            .array(
                z.object({
                    AttachmentID: z.string().optional().describe('Unique identifier for the attachment. Example: "d4ac2a5c-4de5-4c2f-ae3e-90fd003327bc"'),
                    FileName: z.string().optional().describe('Name of the attached file. Example: "nango-test.txt"'),
                    Url: z.string().optional().describe('Direct URL to download the attachment content.'),
                    MimeType: z.string().optional().describe('MIME type of the attachment. Example: "text/plain"'),
                    ContentLength: z.number().optional().describe('Size of the attachment in bytes.')
                })
            )
            .optional()
            .describe('List of attachments associated with the specified Xero resource.')
    })
    .describe('Response containing the list of attachments for a Xero resource.');

/**
 * @tags: [read]
 * @tagReason: Lists existing attachments from the provider.
 * @pitfalls: Attachments remain listable even when the parent resource is deleted, voided, or archived because Xero soft-deletes those records and never returns a 404.
 */
const action = createAction({
    description: 'List attachments on a specific Invoice, Contact, CreditNote, BankTransaction, ManualJournal, or PurchaseOrder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.attachments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionSchema = z.object({
            connection_config: z.object({ tenant_id: z.string().optional() }).nullable().optional(),
            metadata: z.object({ tenantId: z.string().optional() }).nullable().optional()
        });
        const connectionResult = connectionSchema.safeParse(connection);

        let tenantId: string | undefined;

        if (connectionResult.success) {
            const configTenant = connectionResult.data.connection_config?.tenant_id;
            if (typeof configTenant === 'string' && configTenant.length > 0) {
                tenantId = configTenant;
            }

            if (!tenantId) {
                const metadataTenant = connectionResult.data.metadata?.tenantId;
                if (typeof metadataTenant === 'string' && metadataTenant.length > 0) {
                    tenantId = metadataTenant;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connections = connectionsResponse.data;

            if (!Array.isArray(connections) || connections.length === 0) {
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

            const firstConnection = z.object({ tenantId: z.string().optional() }).safeParse(connections[0]);
            if (firstConnection.success && typeof firstConnection.data.tenantId === 'string' && firstConnection.data.tenantId.length > 0) {
                tenantId = firstConnection.data.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.get({
            endpoint: `api.xro/2.0/${encodeURIComponent(input.resourceType)}/${encodeURIComponent(input.resourceId)}/Attachments`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const rawDataSchema = z.record(z.string(), z.unknown());
        const rawResult = rawDataSchema.safeParse(response.data);
        if (!rawResult.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse response data.'
            });
        }

        const parsedResponse = ProviderResponseSchema.safeParse(rawResult.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse attachments response.'
            });
        }

        const attachments = parsedResponse.data.Attachments || [];

        return {
            Attachments: attachments.map((attachment) => ({
                ...(attachment.AttachmentID !== undefined && { AttachmentID: attachment.AttachmentID }),
                ...(attachment.FileName !== undefined && { FileName: attachment.FileName }),
                ...(attachment.Url !== undefined && { Url: attachment.Url }),
                ...(attachment.MimeType !== undefined && { MimeType: attachment.MimeType }),
                ...(attachment.ContentLength !== undefined && { ContentLength: attachment.ContentLength })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
