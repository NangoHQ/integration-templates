import { z } from 'zod';
import { createAction, NangoAction } from 'nango';

const InputSchema = z
    .object({
        resourceType: z.string().describe('The Xero resource type that owns the attachment, e.g., "Invoices", "Contacts", "BankTransactions".'),
        resourceId: z.string().describe('The ID of the resource that owns the attachment.'),
        fileName: z.string().describe('The exact filename of the attachment as it was uploaded.')
    })
    .describe('Input parameters for downloading an attachment by filename.');

const OutputSchema = z.string().describe('The raw file content of the attachment.');

const ConnectionsResponseSchema = z.array(
    z
        .object({
            id: z.string(),
            tenantId: z.string(),
            tenantName: z.string().optional()
        })
        .passthrough()
);

/**
 * @tags: [read]
 * @tagReason: Downloads the raw content of an existing attachment without modifying provider data.
 * @pitfalls: Binary attachment content may be corrupted because the response is decoded as a text string.
 */
const action = createAction({
    description: 'Download the raw content of an attachment by filename.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.attachments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        // https://developer.xero.com/documentation/api/accounting/attachments
        const response = await nango.get({
            endpoint: `api.xro/2.0/${encodeURIComponent(input.resourceType)}/${encodeURIComponent(input.resourceId)}/Attachments/${encodeURIComponent(input.fileName)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            responseType: 'text',
            retries: 3
        });

        if (typeof response.data !== 'string') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Attachment content was not returned as text.'
            });
        }

        return response.data;
    }
});

async function resolveTenantId(nango: NangoAction): Promise<string> {
    const connection = await nango.getConnection();

    if (
        typeof connection.connection_config === 'object' &&
        connection.connection_config !== null &&
        'tenant_id' in connection.connection_config &&
        typeof connection.connection_config['tenant_id'] === 'string' &&
        connection.connection_config['tenant_id'].length > 0
    ) {
        return connection.connection_config['tenant_id'];
    }

    if (
        typeof connection.metadata === 'object' &&
        connection.metadata !== null &&
        'tenantId' in connection.metadata &&
        typeof connection.metadata['tenantId'] === 'string' &&
        connection.metadata['tenantId'].length > 0
    ) {
        return connection.metadata['tenantId'];
    }

    // https://developer.xero.com/documentation/guides/oauth2/connections/
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

    const parsedConnection = ConnectionsResponseSchema.element.safeParse(rawConnections[0]);
    if (parsedConnection.success && parsedConnection.data.tenantId.length > 0) {
        return parsedConnection.data.tenantId;
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve xero-tenant-id.'
    });
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
