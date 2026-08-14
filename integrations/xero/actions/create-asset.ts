import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        assetName: z.string().describe('Name of the fixed asset.'),
        assetNumber: z.string().describe('Unique asset number. Not auto-generated despite asset settings prefix and sequence fields.'),
        assetTypeId: z.string().describe('ID of an existing asset type from the Fixed Assets API. Use list-asset-types to discover valid IDs.'),
        purchaseDate: z.string().describe('Purchase date of the asset in ISO 8601 format (YYYY-MM-DD).'),
        purchasePrice: z.number().describe('Purchase price of the asset.')
    })
    .describe('Input payload for creating a new Xero fixed asset.');

const OutputSchema = z
    .object({
        assetId: z.string().describe('Unique identifier of the created asset.'),
        assetName: z.string().describe('Name of the fixed asset.'),
        assetNumber: z.string().describe('Asset number assigned at creation.'),
        assetTypeId: z.string().describe('ID of the asset type.'),
        purchaseDate: z.string().describe('Purchase date of the asset.'),
        purchasePrice: z.number().describe('Purchase price of the asset.'),
        status: z.string().optional().describe('Status of the asset. Always DRAFT for newly created assets when present.')
    })
    .describe('Output of a newly created Xero fixed asset.');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish()
});

const ProviderAssetSchema = z.object({
    assetId: z.string(),
    assetName: z.string(),
    assetNumber: z.string(),
    assetTypeId: z.string(),
    purchaseDate: z.string(),
    purchasePrice: z.number(),
    status: z.string().optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new fixed asset in the Xero Fixed Assets API.
 * @pitfalls: assetNumber is mandatory and not auto-generated. Created assets cannot be updated or deleted via the API; lifecycle management requires the Xero UI.
 */
const action = createAction({
    description: 'Create a new fixed asset (always starts in Draft status).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['assets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = ConnectionSchema.parse(await nango.getConnection());

        let tenantId: string | undefined;
        if (connection.connection_config && typeof connection.connection_config['tenant_id'] === 'string') {
            tenantId = connection.connection_config['tenant_id'];
        }
        if (!tenantId && connection.metadata && typeof connection.metadata['tenantId'] === 'string') {
            tenantId = connection.metadata['tenantId'];
        }
        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/overview/connections
                endpoint: 'connections',
                retries: 10
            });
            const connectionsData = z.array(z.record(z.string(), z.unknown())).parse(connectionsResponse.data);
            if (connectionsData.length !== 1) {
                if (connectionsData.length === 0) {
                    throw new nango.ActionError({
                        type: 'missing_tenant',
                        message: 'No Xero tenants found for this connection.'
                    });
                }
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            const firstConnection = connectionsData.find(() => true);
            if (firstConnection && typeof firstConnection['tenantId'] === 'string') {
                tenantId = firstConnection['tenantId'];
            }
        }
        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const response = await nango.post({
            // https://developer.xero.com/documentation/api/assets/assets
            endpoint: 'assets.xro/1.0/Assets',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                assetName: input.assetName,
                assetNumber: input.assetNumber,
                assetTypeId: input.assetTypeId,
                purchaseDate: input.purchaseDate,
                purchasePrice: input.purchasePrice
            },
            retries: 10
        });

        const providerAsset = ProviderAssetSchema.parse(response.data);

        return {
            assetId: providerAsset.assetId,
            assetName: providerAsset.assetName,
            assetNumber: providerAsset.assetNumber,
            assetTypeId: providerAsset.assetTypeId,
            purchaseDate: providerAsset.purchaseDate,
            purchasePrice: providerAsset.purchasePrice,
            ...(providerAsset.status !== undefined && { status: providerAsset.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
