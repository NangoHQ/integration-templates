import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required.');

const TenantSchema = z.object({
    id: z.string().describe('Unique connection ID for this tenant link. Example: "12345678-1234-1234-1234-123456789012"'),
    tenantId: z
        .string()
        .describe('Xero tenant (organisation) ID used as the xero-tenant-id header in other Xero API calls. Example: "27e853de-cfdc-4bf3-85e9-3979ee2bcaba"'),
    tenantType: z.string().describe('Type of tenant. Example: "ORGANISATION"'),
    tenantName: z.string().describe('Display name of the tenant. Example: "Demo Company (US)"'),
    createdDateUtc: z.string().describe('UTC timestamp when the connection was created. Example: "2024-01-15T10:30:00Z"'),
    updatedDateUtc: z.string().describe('UTC timestamp when the connection was last updated. Example: "2024-06-20T14:45:00Z"')
});

const OutputSchema = z
    .object({
        tenants: z.array(TenantSchema).describe('List of tenants accessible to the connection.')
    })
    .describe('List of Xero tenants the connection has access to.');

/**
 * @tags: [read]
 * @tagReason: Fetches tenant metadata from the Xero Identity API without modifying any data.
 */
const action = createAction({
    description: 'Fetches all the tenants the connection has access to. This can be used to set the metadata to the selected tenant.',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.xero.com/documentation/guides/oauth2/connections/
        const response = await nango.get({
            endpoint: 'connections',
            baseUrlOverride: 'https://api.xero.com',
            retries: 3
        });

        const rawData: unknown = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array of tenants from the Xero connections endpoint.'
            });
        }

        const tenants = rawData.map((item: unknown) => {
            return TenantSchema.parse(item);
        });

        return {
            tenants
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
