import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const TenantSchema = z.object({
    tenantId: z.string().describe('Xero tenant ID. Example: "8fecd03b-d211-491a-a3bb-7203920abac7"'),
    tenantName: z.string().describe('Xero tenant name. Example: "Demo Company"'),
    tenantType: z.string().describe('Xero tenant type. Example: "ORGANISATION"')
});

const OutputSchema = z.object({
    tenants: z.array(TenantSchema)
});

const action = createAction({
    description: 'List Xero tenants connected to the current OAuth token.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-tenants',
        group: 'Tenants'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.xero.com/documentation/guides/oauth2/connections/
            endpoint: '/connections',
            retries: 10
        });

        const ConnectionSchema = z.object({
            tenantId: z.string(),
            tenantName: z.string(),
            tenantType: z.string()
        });

        const connections = z.array(ConnectionSchema).parse(response.data);

        return {
            tenants: connections.map((connection) => ({
                tenantId: connection.tenantId,
                tenantName: connection.tenantName,
                tenantType: connection.tenantType
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
