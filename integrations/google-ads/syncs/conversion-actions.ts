import { createSync } from 'nango';
import { z } from 'zod';

const ConversionActionSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    valueSettings: z
        .object({
            defaultValue: z.number().optional().nullable(),
            alwaysUseDefaultValue: z.boolean().optional().nullable(),
            currencyCode: z.string().optional().nullable(),
            defaultCurrencyCode: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const MetadataSchema = z.object({
    customerIds: z.array(z.string()).min(1),
    loginCustomerId: z.string().optional(),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const GoogleAdsRowSchema = z.object({
    conversionAction: z
        .object({
            resourceName: z.string(),
            id: z.string().optional(),
            name: z.string().optional().nullable(),
            type: z.string().optional().nullable(),
            category: z.string().optional().nullable(),
            status: z.string().optional().nullable(),
            valueSettings: z
                .object({
                    defaultValue: z.number().optional().nullable(),
                    alwaysUseDefaultValue: z.boolean().optional().nullable(),
                    currencyCode: z.string().optional().nullable(),
                    defaultCurrencyCode: z.string().optional().nullable()
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable()
});

const SearchStreamChunkSchema = z.object({
    results: z.array(GoogleAdsRowSchema).optional(),
    fieldMask: z.string().optional(),
    requestId: z.string().optional()
});

const sync = createSync({
    description: 'Sync conversion actions configured on customer accounts in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        ConversionAction: ConversionActionSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error('Invalid metadata: ' + metadataResult.error.message);
        }
        const metadata = metadataResult.data;

        // Blocker: Google Ads SearchStream does not support incremental filters,
        // resumable cursor pagination, or a deleted-record endpoint for conversion_action.
        // Conversion actions are a small, low-cardinality, long-lived reference set,
        // so full refresh with trackDeletes is appropriate.
        await nango.trackDeletesStart('ConversionAction');

        for (const customerId of metadata.customerIds) {
            // https://developers.google.com/google-ads/api/docs/reporting/streaming
            const response = await nango.post({
                endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
                headers: {
                    'developer-token': metadata.developerToken,
                    ...(metadata.loginCustomerId && {
                        'login-customer-id': metadata.loginCustomerId
                    })
                },
                data: {
                    query: 'SELECT conversion_action.id, conversion_action.name, conversion_action.type, conversion_action.category, conversion_action.status, conversion_action.value_settings.default_value, conversion_action.value_settings.always_use_default_value FROM conversion_action'
                },
                retries: 3
            });

            const rawData = response.data;
            const chunks = [];
            if (Array.isArray(rawData)) {
                for (const chunk of rawData) {
                    const parsed = SearchStreamChunkSchema.safeParse(chunk);
                    if (!parsed.success) {
                        throw new Error('Failed to parse searchStream chunk: ' + parsed.error.message);
                    }
                    chunks.push(parsed.data);
                }
            } else {
                const parsed = SearchStreamChunkSchema.safeParse(rawData);
                if (!parsed.success) {
                    throw new Error('Failed to parse searchStream response: ' + parsed.error.message);
                }
                chunks.push(parsed.data);
            }

            const records = [];
            for (const chunk of chunks) {
                for (const row of chunk.results ?? []) {
                    if (!row.conversionAction) {
                        throw new Error('Missing conversionAction in searchStream row');
                    }
                    const ca = row.conversionAction;
                    const record = {
                        id: ca.resourceName,
                        ...(ca.name != null && { name: ca.name }),
                        ...(ca.type != null && { type: ca.type }),
                        ...(ca.category != null && { category: ca.category }),
                        ...(ca.status != null && { status: ca.status }),
                        ...(ca.valueSettings != null && {
                            valueSettings: {
                                ...(ca.valueSettings.defaultValue != null && {
                                    defaultValue: ca.valueSettings.defaultValue
                                }),
                                ...(ca.valueSettings.alwaysUseDefaultValue != null && {
                                    alwaysUseDefaultValue: ca.valueSettings.alwaysUseDefaultValue
                                }),
                                ...(ca.valueSettings.currencyCode != null && {
                                    currencyCode: ca.valueSettings.currencyCode
                                }),
                                ...(ca.valueSettings.defaultCurrencyCode != null && {
                                    defaultCurrencyCode: ca.valueSettings.defaultCurrencyCode
                                })
                            }
                        })
                    };
                    records.push(record);
                }
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'ConversionAction');
            }
        }

        await nango.trackDeletesEnd('ConversionAction');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
