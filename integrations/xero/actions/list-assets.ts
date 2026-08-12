import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        status: z.enum(['DRAFT', 'REGISTERED', 'DISPOSED']).describe('Asset status filter. Must be DRAFT, REGISTERED, or DISPOSED.')
    })
    .describe('Input for listing Xero fixed assets.');

const PaginationSchema = z.object({
    page: z.number().optional().describe('Current page number.'),
    pageSize: z.number().optional().describe('Number of items per page.'),
    pageCount: z.number().optional().describe('Total number of pages available.'),
    itemCount: z.number().optional().describe('Total number of items returned.')
});

const BookDepreciationSettingSchema = z.object({
    depreciationRate: z.number().optional().describe('Depreciation rate as a percentage.'),
    depreciationMethod: z.string().optional().describe('Depreciation method name.'),
    averagingMethod: z.string().optional().describe('Averaging method name.'),
    effectiveLifeYears: z.number().optional().describe('Effective life in years.'),
    depreciationCalculationMethod: z.string().optional().describe('Method used to calculate depreciation.'),
    bookEffectiveDateOfChangeId: z.string().optional().describe('ID of the effective date of change record.')
});

const BookDepreciationDetailSchema = z.object({
    currentCapitalGain: z.number().optional().describe('Current capital gain amount.'),
    currentGainLoss: z.number().optional().describe('Current gain or loss amount.'),
    depreciationStartDate: z.string().optional().describe('Date depreciation started. Format: yyyy-MM-dd.'),
    costLimit: z.number().optional().describe('Cost limit amount.'),
    residualValue: z.number().optional().describe('Residual value of the asset.'),
    priorAccumDepreciationAmount: z.number().optional().describe('Prior accumulated depreciation amount.'),
    currentAccumDepreciationAmount: z.number().optional().describe('Current accumulated depreciation amount.'),
    currentYearDepreciationAmount: z.number().optional().describe('Current year depreciation amount.'),
    depreciableAmount: z.number().optional().describe('Depreciable amount.'),
    fullDepreciation: z.boolean().optional().describe('Whether the asset is fully depreciated.'),
    bookEffectiveLife: z.number().optional().describe('Book effective life in years.'),
    bookEffectiveDateOfChangeId: z.string().optional().describe('ID of the effective date of change record.')
});

const AssetSchema = z.object({
    assetId: z.string().describe('Unique identifier for the asset.'),
    assetName: z.string().describe('Name of the asset.'),
    assetNumber: z.string().describe('Asset number or code.'),
    purchaseDate: z.string().optional().describe('Purchase date. Format: yyyy-MM-dd.'),
    purchasePrice: z.number().optional().describe('Purchase price of the asset.'),
    disposalPrice: z.number().optional().describe('Disposal price of the asset.'),
    assetStatus: z.string().optional().describe('Status of the asset.'),
    bookDepreciationSetting: BookDepreciationSettingSchema.optional().describe('Depreciation settings for the asset.'),
    bookDepreciationDetail: BookDepreciationDetailSchema.optional().describe('Depreciation detail for the asset.'),
    canRollback: z.boolean().optional().describe('Whether the asset status can be rolled back.'),
    accountingBookValue: z.number().optional().describe('Current accounting book value.'),
    isDeleteEnabledForDate: z.boolean().optional().describe('Whether the asset can be deleted for the given date.')
});

const ProviderResponseSchema = z.object({
    pagination: PaginationSchema.optional(),
    items: z.array(AssetSchema).optional()
});

const OutputSchema = z
    .object({
        items: z.array(AssetSchema).describe('List of fixed assets matching the requested status.'),
        page: z.number().optional().describe('Current page number.'),
        pageSize: z.number().optional().describe('Number of items per page.'),
        pageCount: z.number().optional().describe('Total number of pages available.'),
        itemCount: z.number().optional().describe('Total number of items returned.')
    })
    .describe('Output containing a paginated list of Xero fixed assets.');

/**
 * @tags: [read]
 * @tagReason: Reads fixed assets from the Xero Fixed Assets API.
 * @pitfalls: The status parameter is mandatory; omitting it returns a bare 403 "Forbidden" that looks like a permissions error but is actually a missing-parameter error.
 */
const action = createAction({
    description: 'List fixed assets, filtered by status.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['assets.read', 'assets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionData = z
            .object({
                connection_config: z.record(z.string(), z.unknown()).nullable().optional(),
                metadata: z.record(z.string(), z.unknown()).nullable().optional()
            })
            .parse(connection);

        let tenantId: string | undefined;

        if (
            connectionData.connection_config &&
            typeof connectionData.connection_config['tenant_id'] === 'string' &&
            connectionData.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connectionData.connection_config['tenant_id'];
        }

        if (!tenantId && connectionData.metadata && typeof connectionData.metadata['tenantId'] === 'string' && connectionData.metadata['tenantId'].length > 0) {
            tenantId = connectionData.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = z
                .object({
                    data: z.array(z.record(z.string(), z.unknown())).optional()
                })
                .parse(connectionsResponse);

            const connections = connectionsData.data || [];

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

            const firstConnection = connections[0];
            if (firstConnection && typeof firstConnection['tenantId'] === 'string' && firstConnection['tenantId'].length > 0) {
                tenantId = firstConnection['tenantId'];
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
            endpoint: `assets.xro/1.0/Assets`,
            params: {
                status: input.status
            },
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.items || [],
            ...(parsed.pagination?.page !== undefined && { page: parsed.pagination.page }),
            ...(parsed.pagination?.pageSize !== undefined && { pageSize: parsed.pagination.pageSize }),
            ...(parsed.pagination?.pageCount !== undefined && { pageCount: parsed.pagination.pageCount }),
            ...(parsed.pagination?.itemCount !== undefined && { itemCount: parsed.pagination.itemCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
