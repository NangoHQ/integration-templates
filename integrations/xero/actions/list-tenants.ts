import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const TenantSchema = z.object({
    id: z.string().describe('Connection ID'),
    tenantId: z.string().describe('Tenant ID'),
    tenantName: z.string().describe('Tenant name'),
    tenantType: z.string().describe('Tenant type'),
    createdDateUtc: z.string().describe('Created date in UTC'),
    updatedDateUtc: z.string().describe('Updated date in UTC')
});

const OutputSchema = z.object({
    tenants: z.array(TenantSchema)
});

const action = createAction({
    description: 'List Xero tenants connected to the current OAuth token',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-tenants',
        group: 'Tenants'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['offline_access'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.xero.com/documentation/guides/oauth2/connections
        const response = await nango.get({
            endpoint: '/connections',
            retries: 3
        });

        if (!response.data || !Array.isArray(response.data)) {
            return { tenants: [] };
        }

        const tenants: z.infer<typeof TenantSchema>[] = [];
        for (const connection of response.data) {
            if (
                typeof connection === 'object' &&
                connection !== null &&
                'id' in connection &&
                'tenantId' in connection &&
                'tenantName' in connection &&
                'tenantType' in connection &&
                'createdDateUtc' in connection &&
                'updatedDateUtc' in connection
            ) {
                tenants.push({
                    id: String(connection.id),
                    tenantId: String(connection.tenantId),
                    tenantName: String(connection.tenantName),
                    tenantType: String(connection.tenantType),
                    createdDateUtc: String(connection.createdDateUtc),
                    updatedDateUtc: String(connection.updatedDateUtc)
                });
            }
        }

        return { tenants };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
