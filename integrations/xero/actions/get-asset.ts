import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        assetId: z.string().describe('The unique identifier of the fixed asset to retrieve. Example: "f9c66fb6-2d6a-478f-88bf-f0624797369b"')
    })
    .describe('Input for retrieving a single fixed asset from Xero.');

const AssetTypeSchema = z.object({
    assetTypeId: z.string().optional(),
    assetTypeName: z.string().optional(),
    fixedAssetAccountId: z.string().optional(),
    depreciationExpenseAccountId: z.string().optional(),
    accumulatedDepreciationAccountId: z.string().optional(),
    bookDepreciationSetting: z
        .object({
            depreciationMethod: z.string().optional(),
            averagingMethod: z.string().optional(),
            effectiveLifeYears: z.number().optional(),
            depreciationRate: z.number().optional()
        })
        .optional(),
    locking: z.string().optional()
});

const BookDepreciationDetailSchema = z
    .object({
        currentCapitalGain: z.number().optional(),
        currentGainLoss: z.number().optional(),
        depreciationStartDate: z.string().optional(),
        costLimit: z.number().optional(),
        residualValue: z.number().optional(),
        priorAccumDepreciationAmount: z.number().optional(),
        currentAccumDepreciationAmount: z.number().optional(),
        currentYearDepreciationAmount: z.number().optional(),
        totalDepreciation: z.number().optional(),
        effectiveLifeYearsLeft: z.number().optional(),
        totalEffectiveLifeYears: z.number().optional(),
        depreciationMethod: z.string().optional(),
        averagingMethod: z.string().optional(),
        customisedDegreeOfFit: z.number().optional(),
        customisedEffectiveLifeRate: z.number().optional()
    })
    .optional();

const ProviderAssetSchema = z.object({
    assetId: z.string(),
    assetName: z.string(),
    assetNumber: z.string().optional(),
    purchaseDate: z.string().optional(),
    purchasePrice: z.number().optional(),
    disposalPrice: z.number().optional(),
    assetStatus: z.string().optional(),
    bookDepreciationSetting: z
        .object({
            depreciationMethod: z.string().optional(),
            averagingMethod: z.string().optional(),
            effectiveLifeYears: z.number().optional(),
            depreciationRate: z.number().optional(),
            effectiveLifeUnits: z.number().optional(),
            depreciableObjectId: z.string().optional(),
            depreciableObjectType: z.string().optional(),
            bookEffectiveDateOfChangeId: z.union([z.string(), z.number()]).optional()
        })
        .optional(),
    bookDepreciationDetail: BookDepreciationDetailSchema,
    accountingBookValue: z.number().optional(),
    isDeleteEnabledForDate: z.boolean().optional(),
    assetType: AssetTypeSchema.optional()
});

const OutputSchema = z
    .object({
        assetId: z.string().describe('The unique identifier of the fixed asset.'),
        assetName: z.string().describe('The display name of the fixed asset.'),
        assetNumber: z.string().optional().describe('The asset number assigned to the fixed asset.'),
        purchaseDate: z.string().optional().describe('The date the asset was purchased, in ISO 8601 format.'),
        purchasePrice: z.number().optional().describe('The original purchase price of the asset.'),
        disposalPrice: z.number().optional().describe('The price received when the asset was disposed.'),
        assetStatus: z.string().optional().describe('The current lifecycle status of the asset.'),
        bookDepreciationSetting: z
            .object({
                depreciationMethod: z.string().optional().describe('The depreciation method applied to the asset.'),
                averagingMethod: z.string().optional().describe('The averaging method used for depreciation calculations.'),
                effectiveLifeYears: z.number().optional().describe('The total effective life of the asset in years.'),
                depreciationRate: z.number().optional().describe('The annual depreciation rate.'),
                effectiveLifeUnits: z.number().optional().describe('The effective life expressed in units, if applicable.'),
                depreciableObjectId: z.string().optional().describe('The identifier of the associated depreciable object.'),
                depreciableObjectType: z.string().optional().describe('The type of the associated depreciable object.'),
                bookEffectiveDateOfChangeId: z
                    .union([z.string(), z.number()])
                    .optional()
                    .describe('The identifier for the effective date of a depreciation setting change.')
            })
            .optional()
            .describe('Depreciation configuration for the asset.'),
        bookDepreciationDetail: z
            .object({
                currentCapitalGain: z.number().optional().describe('The current capital gain on the asset.'),
                currentGainLoss: z.number().optional().describe('The current unrealised gain or loss.'),
                depreciationStartDate: z.string().optional().describe('The date depreciation calculations began.'),
                costLimit: z.number().optional().describe('The cost limit for depreciation purposes.'),
                residualValue: z.number().optional().describe('The estimated residual value at the end of the asset life.'),
                priorAccumDepreciationAmount: z.number().optional().describe('Accumulated depreciation from prior periods.'),
                currentAccumDepreciationAmount: z.number().optional().describe('Total accumulated depreciation to date.'),
                currentYearDepreciationAmount: z.number().optional().describe('Depreciation allocated to the current year.'),
                totalDepreciation: z.number().optional().describe('Total depreciation recorded for the asset.'),
                effectiveLifeYearsLeft: z.number().optional().describe('Remaining effective life in years.'),
                totalEffectiveLifeYears: z.number().optional().describe('Original effective life in years.'),
                depreciationMethod: z.string().optional().describe('The method used to calculate depreciation.'),
                averagingMethod: z.string().optional().describe('The averaging method applied to depreciation.'),
                customisedDegreeOfFit: z.number().optional().describe('Custom degree of fit for depreciation calculations.'),
                customisedEffectiveLifeRate: z.number().optional().describe('Custom effective life rate for depreciation calculations.')
            })
            .optional()
            .describe('Calculated depreciation details for the asset.'),
        accountingBookValue: z.number().optional().describe('The current net book value of the asset.'),
        isDeleteEnabledForDate: z.boolean().optional().describe('Whether the asset is eligible for deletion based on its date.'),
        assetType: z
            .object({
                assetTypeId: z.string().optional().describe('The unique identifier of the asset type.'),
                assetTypeName: z.string().optional().describe('The display name of the asset type.'),
                fixedAssetAccountId: z.string().optional().describe('The account identifier for the fixed asset ledger account.'),
                depreciationExpenseAccountId: z.string().optional().describe('The account identifier for the depreciation expense ledger account.'),
                accumulatedDepreciationAccountId: z.string().optional().describe('The account identifier for the accumulated depreciation ledger account.'),
                bookDepreciationSetting: z
                    .object({
                        depreciationMethod: z.string().optional().describe('The depreciation method configured for this asset type.'),
                        averagingMethod: z.string().optional().describe('The averaging method configured for this asset type.'),
                        effectiveLifeYears: z.number().optional().describe('The default effective life in years for this asset type.'),
                        depreciationRate: z.number().optional().describe('The default depreciation rate for this asset type.')
                    })
                    .optional()
                    .describe('Default depreciation settings for the asset type.'),
                locking: z.string().optional().describe('The locking status of the asset type configuration.')
            })
            .optional()
            .describe('The asset type classification and linked accounts for the asset.')
    })
    .describe('A single fixed asset retrieved from the Xero Fixed Assets API.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single fixed asset by its identifier from the Xero Fixed Assets API.
 * @pitfalls: The API returns assetStatus as mixed-case strings like Draft rather than the documented uppercase enums, and may omit the assetType object even when assetTypeId is present.
 */
const action = createAction({
    description: 'Retrieve a single fixed asset by AssetId.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['assets.read'],

    exec: async (nango, input) => {
        const connection = await nango.getConnection();
        const connectionData = connection.connection_config;
        const metadata = connection.metadata;

        let tenantId: string | undefined;
        if (
            connectionData &&
            typeof connectionData === 'object' &&
            'tenant_id' in connectionData &&
            typeof connectionData['tenant_id'] === 'string' &&
            connectionData['tenant_id'].length > 0
        ) {
            tenantId = connectionData['tenant_id'];
        }

        if (
            !tenantId &&
            metadata &&
            typeof metadata === 'object' &&
            'tenantId' in metadata &&
            typeof metadata['tenantId'] === 'string' &&
            metadata['tenantId'].length > 0
        ) {
            tenantId = metadata['tenantId'];
        }

        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/guides/oauth2/scopes/
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
            if (
                firstConnection &&
                typeof firstConnection === 'object' &&
                'tenantId' in firstConnection &&
                typeof firstConnection['tenantId'] === 'string' &&
                firstConnection['tenantId'].length > 0
            ) {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/assets/assets
            endpoint: `assets.xro/1.0/Assets/${encodeURIComponent(input.assetId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Asset with id ${input.assetId} not found.`
            });
        }

        const providerAsset = ProviderAssetSchema.parse(response.data);

        return {
            assetId: providerAsset.assetId,
            assetName: providerAsset.assetName,
            ...(providerAsset.assetNumber !== undefined && { assetNumber: providerAsset.assetNumber }),
            ...(providerAsset.purchaseDate !== undefined && { purchaseDate: providerAsset.purchaseDate }),
            ...(providerAsset.purchasePrice !== undefined && { purchasePrice: providerAsset.purchasePrice }),
            ...(providerAsset.disposalPrice !== undefined && { disposalPrice: providerAsset.disposalPrice }),
            ...(providerAsset.assetStatus !== undefined && { assetStatus: providerAsset.assetStatus }),
            ...(providerAsset.bookDepreciationSetting !== undefined && {
                bookDepreciationSetting: {
                    ...(providerAsset.bookDepreciationSetting.depreciationMethod !== undefined && {
                        depreciationMethod: providerAsset.bookDepreciationSetting.depreciationMethod
                    }),
                    ...(providerAsset.bookDepreciationSetting.averagingMethod !== undefined && {
                        averagingMethod: providerAsset.bookDepreciationSetting.averagingMethod
                    }),
                    ...(providerAsset.bookDepreciationSetting.effectiveLifeYears !== undefined && {
                        effectiveLifeYears: providerAsset.bookDepreciationSetting.effectiveLifeYears
                    }),
                    ...(providerAsset.bookDepreciationSetting.depreciationRate !== undefined && {
                        depreciationRate: providerAsset.bookDepreciationSetting.depreciationRate
                    }),
                    ...(providerAsset.bookDepreciationSetting.effectiveLifeUnits !== undefined && {
                        effectiveLifeUnits: providerAsset.bookDepreciationSetting.effectiveLifeUnits
                    }),
                    ...(providerAsset.bookDepreciationSetting.depreciableObjectId !== undefined && {
                        depreciableObjectId: providerAsset.bookDepreciationSetting.depreciableObjectId
                    }),
                    ...(providerAsset.bookDepreciationSetting.depreciableObjectType !== undefined && {
                        depreciableObjectType: providerAsset.bookDepreciationSetting.depreciableObjectType
                    }),
                    ...(providerAsset.bookDepreciationSetting.bookEffectiveDateOfChangeId !== undefined && {
                        bookEffectiveDateOfChangeId: providerAsset.bookDepreciationSetting.bookEffectiveDateOfChangeId
                    })
                }
            }),
            ...(providerAsset.bookDepreciationDetail !== undefined && {
                bookDepreciationDetail: {
                    ...(providerAsset.bookDepreciationDetail.currentCapitalGain !== undefined && {
                        currentCapitalGain: providerAsset.bookDepreciationDetail.currentCapitalGain
                    }),
                    ...(providerAsset.bookDepreciationDetail.currentGainLoss !== undefined && {
                        currentGainLoss: providerAsset.bookDepreciationDetail.currentGainLoss
                    }),
                    ...(providerAsset.bookDepreciationDetail.depreciationStartDate !== undefined && {
                        depreciationStartDate: providerAsset.bookDepreciationDetail.depreciationStartDate
                    }),
                    ...(providerAsset.bookDepreciationDetail.costLimit !== undefined && {
                        costLimit: providerAsset.bookDepreciationDetail.costLimit
                    }),
                    ...(providerAsset.bookDepreciationDetail.residualValue !== undefined && {
                        residualValue: providerAsset.bookDepreciationDetail.residualValue
                    }),
                    ...(providerAsset.bookDepreciationDetail.priorAccumDepreciationAmount !== undefined && {
                        priorAccumDepreciationAmount: providerAsset.bookDepreciationDetail.priorAccumDepreciationAmount
                    }),
                    ...(providerAsset.bookDepreciationDetail.currentAccumDepreciationAmount !== undefined && {
                        currentAccumDepreciationAmount: providerAsset.bookDepreciationDetail.currentAccumDepreciationAmount
                    }),
                    ...(providerAsset.bookDepreciationDetail.currentYearDepreciationAmount !== undefined && {
                        currentYearDepreciationAmount: providerAsset.bookDepreciationDetail.currentYearDepreciationAmount
                    }),
                    ...(providerAsset.bookDepreciationDetail.totalDepreciation !== undefined && {
                        totalDepreciation: providerAsset.bookDepreciationDetail.totalDepreciation
                    }),
                    ...(providerAsset.bookDepreciationDetail.effectiveLifeYearsLeft !== undefined && {
                        effectiveLifeYearsLeft: providerAsset.bookDepreciationDetail.effectiveLifeYearsLeft
                    }),
                    ...(providerAsset.bookDepreciationDetail.totalEffectiveLifeYears !== undefined && {
                        totalEffectiveLifeYears: providerAsset.bookDepreciationDetail.totalEffectiveLifeYears
                    }),
                    ...(providerAsset.bookDepreciationDetail.depreciationMethod !== undefined && {
                        depreciationMethod: providerAsset.bookDepreciationDetail.depreciationMethod
                    }),
                    ...(providerAsset.bookDepreciationDetail.averagingMethod !== undefined && {
                        averagingMethod: providerAsset.bookDepreciationDetail.averagingMethod
                    }),
                    ...(providerAsset.bookDepreciationDetail.customisedDegreeOfFit !== undefined && {
                        customisedDegreeOfFit: providerAsset.bookDepreciationDetail.customisedDegreeOfFit
                    }),
                    ...(providerAsset.bookDepreciationDetail.customisedEffectiveLifeRate !== undefined && {
                        customisedEffectiveLifeRate: providerAsset.bookDepreciationDetail.customisedEffectiveLifeRate
                    })
                }
            }),
            ...(providerAsset.accountingBookValue !== undefined && { accountingBookValue: providerAsset.accountingBookValue }),
            ...(providerAsset.isDeleteEnabledForDate !== undefined && { isDeleteEnabledForDate: providerAsset.isDeleteEnabledForDate }),
            ...(providerAsset.assetType !== undefined && {
                assetType: {
                    ...(providerAsset.assetType.assetTypeId !== undefined && { assetTypeId: providerAsset.assetType.assetTypeId }),
                    ...(providerAsset.assetType.assetTypeName !== undefined && { assetTypeName: providerAsset.assetType.assetTypeName }),
                    ...(providerAsset.assetType.fixedAssetAccountId !== undefined && {
                        fixedAssetAccountId: providerAsset.assetType.fixedAssetAccountId
                    }),
                    ...(providerAsset.assetType.depreciationExpenseAccountId !== undefined && {
                        depreciationExpenseAccountId: providerAsset.assetType.depreciationExpenseAccountId
                    }),
                    ...(providerAsset.assetType.accumulatedDepreciationAccountId !== undefined && {
                        accumulatedDepreciationAccountId: providerAsset.assetType.accumulatedDepreciationAccountId
                    }),
                    ...(providerAsset.assetType.bookDepreciationSetting !== undefined && {
                        bookDepreciationSetting: {
                            ...(providerAsset.assetType.bookDepreciationSetting.depreciationMethod !== undefined && {
                                depreciationMethod: providerAsset.assetType.bookDepreciationSetting.depreciationMethod
                            }),
                            ...(providerAsset.assetType.bookDepreciationSetting.averagingMethod !== undefined && {
                                averagingMethod: providerAsset.assetType.bookDepreciationSetting.averagingMethod
                            }),
                            ...(providerAsset.assetType.bookDepreciationSetting.effectiveLifeYears !== undefined && {
                                effectiveLifeYears: providerAsset.assetType.bookDepreciationSetting.effectiveLifeYears
                            }),
                            ...(providerAsset.assetType.bookDepreciationSetting.depreciationRate !== undefined && {
                                depreciationRate: providerAsset.assetType.bookDepreciationSetting.depreciationRate
                            })
                        }
                    }),
                    ...(providerAsset.assetType.locking !== undefined && { locking: providerAsset.assetType.locking })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
