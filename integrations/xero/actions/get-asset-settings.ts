import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required.');

const ProviderSettingsSchema = z.object({
    assetNumberPrefix: z.string().optional(),
    assetNumberSequence: z.string().optional(),
    assetStartDate: z.string().optional(),
    optInForTax: z.boolean().optional()
});

const OutputSchema = z
    .object({
        assetNumberPrefix: z.string().optional().describe("Prefix applied to auto-generated asset numbers. Example: 'FA-'."),
        assetNumberSequence: z.string().optional().describe("Current sequence number for the next auto-generated asset. Example: '100'."),
        assetStartDate: z.string().optional().describe("Date from which fixed assets are tracked. Example: '2024-01-01'."),
        optInForTax: z.boolean().optional().describe('Whether the organisation has opted in for tax on fixed assets.')
    })
    .describe("This organisation's fixed-asset numbering and tax settings.");

/**
 * @tags: [read]
 * @tagReason: Only reads the organisation's fixed-asset settings.
 * @pitfalls: The returned assetNumberPrefix and assetNumberSequence do not auto-generate asset numbers; create-asset still requires an explicit assetNumber.
 */
const action = createAction({
    description: "Get this organisation's fixed-asset numbering/tax settings.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['assets.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        const metadata = connection.metadata;

        let tenantId: string | undefined;
        if (connectionConfig && typeof connectionConfig === 'object' && 'tenant_id' in connectionConfig) {
            const raw = connectionConfig['tenant_id'];
            if (typeof raw === 'string' && raw.length > 0) {
                tenantId = raw;
            }
        }

        if (!tenantId && metadata && typeof metadata === 'object' && 'tenantId' in metadata) {
            const raw = metadata['tenantId'];
            if (typeof raw === 'string' && raw.length > 0) {
                tenantId = raw;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/scopes/
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/connections
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (!Array.isArray(connectionsData) || connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsData[0];
            if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection) {
                const raw = firstConnection['tenantId'];
                if (typeof raw === 'string' && raw.length > 0) {
                    tenantId = raw;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/assets/assets
        const response = await nango.get({
            endpoint: 'assets.xro/1.0/Settings',
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsed = ProviderSettingsSchema.parse(response.data);

        return {
            ...(parsed.assetNumberPrefix !== undefined && { assetNumberPrefix: parsed.assetNumberPrefix }),
            ...(parsed.assetNumberSequence !== undefined && { assetNumberSequence: parsed.assetNumberSequence }),
            ...(parsed.assetStartDate !== undefined && { assetStartDate: parsed.assetStartDate }),
            ...(parsed.optInForTax !== undefined && { optInForTax: parsed.optInForTax })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
