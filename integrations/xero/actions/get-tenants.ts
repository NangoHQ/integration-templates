import { z } from 'zod';
import { createAction } from 'nango';

const TenantSchema = z.object({
    id: z.string(),
    authEventId: z.string(),
    tenantId: z.string(),
    tenantType: z.string(),
    tenantName: z.string(),
    createdDateUtc: z.string(),
    updatedDateUtc: z.string()
});

const OutputSchema = z.object({
    tenants: z.array(TenantSchema)
});

const TenantsResponseSchema = z.array(z.unknown());

const action = createAction({
    description: 'Fetches all the tenants the connection has access to.\nThis can be used to set the metadata to the selected tenant.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-tenants',
        group: 'Tenants'
    },
    input: z.void(),
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.xero.com/documentation/guides/oauth2/tenants
        const response = await nango.get({
            endpoint: 'connections',
            retries: 3
        });

        const parsed = TenantsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid tenants data received from connections endpoint'
            });
        }

        const tenants = parsed.data
            .map((t) => {
                const tenant = TenantSchema.safeParse(t);
                if (!tenant.success) {
                    return null;
                }
                return tenant.data;
            })
            .filter((t): t is z.infer<typeof TenantSchema> => t !== null);

        return { tenants };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
