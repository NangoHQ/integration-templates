import { z } from 'zod';
import { createAction } from 'nango';

const DeleteManualJournalInputSchema = z
    .object({
        manualJournalId: z.string().describe('The unique Xero identifier of the manual journal to mark as deleted.')
    })
    .describe('Input for deleting a Xero manual journal.');

const DeleteManualJournalOutputSchema = z.null().describe('Empty response indicating the manual journal was successfully marked as deleted.');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const ConnectionsItemSchema = z.object({
    tenantId: z.string().optional()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Marks a manual journal as deleted on Xero. The record remains gettable by ID afterward with Status DELETED.
 * @pitfalls: The deleted journal remains gettable by ID with Status DELETED and never returns 404; calling delete on an already-deleted journal raises a validation exception.
 */
const action = createAction({
    description: 'Delete a manual journal',
    version: '1.0.0',
    input: DeleteManualJournalInputSchema,
    output: DeleteManualJournalOutputSchema,
    scopes: ['accounting.manualjournals'],

    exec: async (nango, input) => {
        const tenantId = await resolveTenantId(nango);

        // https://developer.xero.com/documentation/api/accounting/overview
        await nango.post({
            endpoint: `api.xro/2.0/ManualJournals/${encodeURIComponent(input.manualJournalId)}`,
            headers: {
                'xero-tenant-id': tenantId,
                'Content-Type': 'application/json'
            },
            data: {
                Status: 'DELETED'
            },
            retries: 3
        });

        return null;
    }
});

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const parsedConnection = ConnectionSchema.safeParse(connection);

    if (parsedConnection.success) {
        const configTenantId = parsedConnection.data.connection_config?.['tenant_id'];
        if (typeof configTenantId === 'string' && configTenantId.length > 0) {
            return configTenantId;
        }

        const metadataTenantId = parsedConnection.data.metadata?.['tenantId'];
        if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
            return metadataTenantId;
        }
    }

    // https://developer.xero.com/documentation/api/overview/connections
    const response = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const connections: z.infer<typeof ConnectionsItemSchema>[] = [];
    if (Array.isArray(response.data)) {
        for (const item of response.data) {
            const parsed = ConnectionsItemSchema.safeParse(item);
            if (parsed.success) {
                connections.push(parsed.data);
            }
        }
    } else if (response.data !== null && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
        for (const item of response.data.data) {
            const parsed = ConnectionsItemSchema.safeParse(item);
            if (parsed.success) {
                connections.push(parsed.data);
            }
        }
    }

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

    const tenantId = connections[0]?.tenantId;
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'Unable to resolve xero-tenant-id.'
        });
    }

    return tenantId;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
