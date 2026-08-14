import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required');

const BookDepreciationSettingSchema = z
    .object({
        depreciationMethod: z.string().optional().describe('Method used to calculate depreciation, e.g. "StraightLine"'),
        averagingMethod: z.string().optional().describe('Averaging method applied to the depreciation calculation, e.g. "ActualDays"'),
        depreciationRate: z.number().optional().describe('Annual depreciation rate as a decimal'),
        effectiveLifeYears: z.number().optional().describe('Estimated useful life of the asset in years'),
        depreciableObjectId: z.string().optional().describe('ID of the account or object against which depreciation is recorded'),
        depreciableObjectName: z.string().optional().describe('Name of the account or object against which depreciation is recorded')
    })
    .passthrough();

const AssetTypeSchema = z
    .object({
        assetTypeId: z.string().describe('Unique identifier for the asset type'),
        assetTypeName: z.string().describe('Human-readable name for the asset type'),
        fixedAssetAccountId: z.string().optional().describe('Account ID used for the fixed-asset account'),
        depreciationExpenseAccountId: z.string().optional().describe('Account ID used for the depreciation-expense account'),
        accumulatedDepreciationAccountId: z.string().optional().describe('Account ID used for the accumulated-depreciation account'),
        bookDepreciationSetting: BookDepreciationSettingSchema.optional().describe('Depreciation settings applicable to this asset type')
    })
    .passthrough();

const OutputSchema = z.array(AssetTypeSchema).describe('List of fixed-asset types configured for the organisation');

/**
 * @tags: [read]
 * @tagReason: Reads fixed-asset types from the Xero Assets API.
 * @pitfalls: The depreciationRate in bookDepreciationSetting is returned as a whole-number percentage (e.g. 40 for 40%), not a decimal fraction.
 */
const action = createAction({
    description: 'List the fixed-asset types configured for this organisation (each with its depreciation settings).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['assets.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        if (connection && typeof connection === 'object') {
            const connConfig = connection['connection_config'];
            if (connConfig && typeof connConfig === 'object') {
                const candidate = connConfig['tenant_id'];
                if (typeof candidate === 'string' && candidate.length > 0) {
                    tenantId = candidate;
                }
            }
        }

        if (!tenantId) {
            if (connection && typeof connection === 'object') {
                const metadata = connection['metadata'];
                if (metadata && typeof metadata === 'object') {
                    const candidate = metadata['tenantId'];
                    if (typeof candidate === 'string' && candidate.length > 0) {
                        tenantId = candidate;
                    }
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsArray = z.array(z.object({}).passthrough()).parse(connectionsResponse.data);

            if (connectionsArray.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsArray.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const first = connectionsArray[0];
            if (first && typeof first === 'object') {
                const candidate = first['tenantId'];
                if (typeof candidate === 'string' && candidate.length > 0) {
                    tenantId = candidate;
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
            endpoint: 'assets.xro/1.0/AssetTypes',
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const assetTypes = z.array(z.object({}).passthrough()).parse(response.data);

        return assetTypes.map((raw) => {
            const parsed = AssetTypeSchema.parse(raw);
            return {
                assetTypeId: parsed.assetTypeId,
                assetTypeName: parsed.assetTypeName,
                ...(parsed.fixedAssetAccountId !== undefined && { fixedAssetAccountId: parsed.fixedAssetAccountId }),
                ...(parsed.depreciationExpenseAccountId !== undefined && { depreciationExpenseAccountId: parsed.depreciationExpenseAccountId }),
                ...(parsed.accumulatedDepreciationAccountId !== undefined && { accumulatedDepreciationAccountId: parsed.accumulatedDepreciationAccountId }),
                ...(parsed.bookDepreciationSetting !== undefined && { bookDepreciationSetting: parsed.bookDepreciationSetting })
            };
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
