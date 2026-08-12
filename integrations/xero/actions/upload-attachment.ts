import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        resourceType: z
            .enum(['Invoices', 'Contacts', 'CreditNotes', 'BankTransactions', 'ManualJournals', 'PurchaseOrders'])
            .describe('The Xero resource type to attach the file to.'),
        resourceId: z.string().describe('The ID of the Xero resource. Example: "06c18279-c848-4b69-b434-6b9fecc75a47"'),
        fileName: z.string().describe('The name of the file including extension. Example: "nango-test.txt"'),
        contentType: z.string().describe('The MIME type of the file. Example: "text/plain"'),
        content: z.string().describe('The raw file content encoded as a base64 string.')
    })
    .describe('Input for uploading a file attachment to a Xero resource.');

const ProviderAttachmentSchema = z.object({
    AttachmentID: z.string().optional(),
    FileName: z.string().optional(),
    MimeType: z.string().optional(),
    ContentLength: z.number().optional(),
    IncludeInEmail: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    Attachments: z.array(ProviderAttachmentSchema).optional()
});

const ConnectionsSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

const OutputSchema = z
    .object({
        attachmentId: z.string().describe('The unique identifier of the attachment. Example: "d4ac2a5c-4de5-4c2f-ae3e-90fd003327bc"'),
        fileName: z.string().describe('The name of the uploaded file. Example: "nango-test.txt"'),
        mimeType: z.string().optional().describe('The MIME type of the uploaded file. Example: "text/plain"'),
        contentLength: z.number().optional().describe('The size of the uploaded file in bytes. Example: 123'),
        includeInEmail: z.boolean().optional().describe('Whether the attachment is included in emails sent from Xero.')
    })
    .describe('Output of a successful file attachment upload to a Xero resource.');

/**
 * @tags: [write]
 * @tagReason: Creates a new file attachment on a Xero resource.
 * @pitfalls: Uploading a file with the same name to the same resource overwrites the existing attachment and returns a new attachment ID.
 */
const action = createAction({
    description: 'Attach a new file to an Invoice, Contact, CreditNote, BankTransaction, ManualJournal, or PurchaseOrder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.attachments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        if (connection && typeof connection === 'object' && !Array.isArray(connection)) {
            if ('connection_config' in connection) {
                const config = connection['connection_config'];
                if (
                    config &&
                    typeof config === 'object' &&
                    !Array.isArray(config) &&
                    'tenant_id' in config &&
                    typeof config['tenant_id'] === 'string' &&
                    config['tenant_id'].length > 0
                ) {
                    tenantId = config['tenant_id'];
                }
            }
            if (!tenantId && 'metadata' in connection) {
                const metadata = connection['metadata'];
                if (
                    metadata &&
                    typeof metadata === 'object' &&
                    !Array.isArray(metadata) &&
                    'tenantId' in metadata &&
                    typeof metadata['tenantId'] === 'string' &&
                    metadata['tenantId'].length > 0
                ) {
                    tenantId = metadata['tenantId'];
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionsSchema.safeParse(connectionsResponse.data);
            if (!parsedConnections.success || parsedConnections.data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (parsedConnections.data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const first = parsedConnections.data[0];
            if (first && first.tenantId.length > 0) {
                tenantId = first.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const fileBuffer = Buffer.from(input.content, 'base64');

        // https://developer.xero.com/documentation/api/accounting/attachments
        const response = await nango.put({
            endpoint: `api.xro/2.0/${encodeURIComponent(input.resourceType)}/${encodeURIComponent(input.resourceId)}/Attachments/${encodeURIComponent(input.fileName)}`,
            headers: {
                'xero-tenant-id': tenantId,
                'Content-Type': input.contentType
            },
            data: fileBuffer,
            retries: 10
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The Xero API returned an unexpected response shape.'
            });
        }

        const attachments = parsedResponse.data.Attachments;
        if (!attachments || attachments.length === 0) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The Xero API returned no attachment in the response.'
            });
        }

        const attachment = attachments[0];
        if (!attachment) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The Xero API returned no attachment in the response.'
            });
        }

        return {
            attachmentId: attachment.AttachmentID || '',
            fileName: attachment.FileName || input.fileName,
            ...(attachment.MimeType !== undefined && { mimeType: attachment.MimeType }),
            ...(attachment.ContentLength !== undefined && { contentLength: attachment.ContentLength }),
            ...(attachment.IncludeInEmail !== undefined && { includeInEmail: attachment.IncludeInEmail })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
