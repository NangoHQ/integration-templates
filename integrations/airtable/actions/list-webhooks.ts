import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "appJxrbEgLaF00M2f"')
});

const ProviderSourceOptionsSchema = z.object({
    formSubmission: z
        .object({
            viewId: z.string()
        })
        .nullable()
        .optional(),
    formPageSubmission: z
        .object({
            pageId: z.string()
        })
        .nullable()
        .optional()
});

const ProviderFiltersSchema = z.object({
    dataTypes: z.array(z.string()),
    recordChangeScope: z.string().nullable().optional(),
    changeTypes: z.array(z.string()).nullable().optional(),
    fromSources: z.array(z.string()).nullable().optional(),
    sourceOptions: ProviderSourceOptionsSchema.nullable().optional(),
    watchDataInFieldIds: z.array(z.string()).nullable().optional(),
    watchSchemasOfFieldIds: z.array(z.string()).nullable().optional()
});

const ProviderIncludesSchema = z.object({
    includeCellValuesInFieldIds: z.union([z.null(), z.array(z.string()), z.literal('all')]).optional(),
    includePreviousCellValues: z.boolean().optional(),
    includePreviousFieldDefinitions: z.boolean().optional()
});

const ProviderSpecificationSchema = z.object({
    options: z.object({
        filters: ProviderFiltersSchema,
        includes: ProviderIncludesSchema.nullable().optional()
    })
});

const ProviderWebhookErrorSchema = z.object({
    message: z.string()
});

const ProviderLastNotificationResultSchema = z.object({
    success: z.boolean(),
    completionTimestamp: z.string().optional(),
    durationMs: z.number().optional(),
    retryNumber: z.number().optional(),
    willBeRetried: z.boolean().nullable().optional(),
    error: ProviderWebhookErrorSchema.nullable().optional()
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    specification: ProviderSpecificationSchema,
    notificationUrl: z.string().nullable().optional(),
    cursorForNextPayload: z.number(),
    lastNotificationResult: ProviderLastNotificationResultSchema.nullable().optional(),
    areNotificationsEnabled: z.boolean(),
    lastSuccessfulNotificationTime: z.string().nullable().optional(),
    isHookEnabled: z.boolean(),
    expirationTime: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    webhooks: z.array(ProviderWebhookSchema)
});

const WebhookErrorSchema = z.object({
    message: z.string()
});

const LastNotificationResultSchema = z.object({
    success: z.boolean(),
    completionTimestamp: z.string().optional(),
    durationMs: z.number().optional(),
    retryNumber: z.number().optional(),
    willBeRetried: z.boolean().optional(),
    error: WebhookErrorSchema.optional()
});

const SourceOptionsSchema = z.object({
    formSubmission: z
        .object({
            viewId: z.string()
        })
        .optional(),
    formPageSubmission: z
        .object({
            pageId: z.string()
        })
        .optional()
});

const FiltersSchema = z.object({
    dataTypes: z.array(z.string()),
    recordChangeScope: z.string().optional(),
    changeTypes: z.array(z.string()).optional(),
    fromSources: z.array(z.string()).optional(),
    sourceOptions: SourceOptionsSchema.optional(),
    watchDataInFieldIds: z.array(z.string()).optional(),
    watchSchemasOfFieldIds: z.array(z.string()).optional()
});

const IncludesSchema = z.object({
    includeCellValuesInFieldIds: z.union([z.array(z.string()), z.literal('all')]).optional(),
    includePreviousCellValues: z.boolean().optional(),
    includePreviousFieldDefinitions: z.boolean().optional()
});

const SpecificationSchema = z.object({
    options: z.object({
        filters: FiltersSchema,
        includes: IncludesSchema.optional()
    })
});

const WebhookSchema = z.object({
    id: z.string(),
    specification: SpecificationSchema,
    notificationUrl: z.string().optional(),
    cursorForNextPayload: z.number(),
    lastNotificationResult: LastNotificationResultSchema.optional(),
    areNotificationsEnabled: z.boolean(),
    lastSuccessfulNotificationTime: z.string().optional(),
    isHookEnabled: z.boolean(),
    expirationTime: z.string().optional()
});

const OutputSchema = z.object({
    webhooks: z.array(WebhookSchema)
});

function mapProviderWebhook(webhook: z.infer<typeof ProviderWebhookSchema>): z.infer<typeof WebhookSchema> {
    const filters = webhook.specification.options.filters;
    const sourceOptions: z.infer<typeof SourceOptionsSchema> = {};
    if (filters.sourceOptions != null) {
        if (filters.sourceOptions.formSubmission != null) {
            sourceOptions.formSubmission = { viewId: filters.sourceOptions.formSubmission.viewId };
        }
        if (filters.sourceOptions.formPageSubmission != null) {
            sourceOptions.formPageSubmission = { pageId: filters.sourceOptions.formPageSubmission.pageId };
        }
    }

    const filtersOutput: z.infer<typeof FiltersSchema> = {
        dataTypes: filters.dataTypes,
        ...(filters.recordChangeScope != null && { recordChangeScope: filters.recordChangeScope }),
        ...(filters.changeTypes != null && { changeTypes: filters.changeTypes }),
        ...(filters.fromSources != null && { fromSources: filters.fromSources }),
        ...(Object.keys(sourceOptions).length > 0 && { sourceOptions }),
        ...(filters.watchDataInFieldIds != null && { watchDataInFieldIds: filters.watchDataInFieldIds }),
        ...(filters.watchSchemasOfFieldIds != null && { watchSchemasOfFieldIds: filters.watchSchemasOfFieldIds })
    };

    const includes = webhook.specification.options.includes;
    let includesOutput: z.infer<typeof IncludesSchema> | undefined;
    if (includes != null) {
        includesOutput = {};
        if (includes.includeCellValuesInFieldIds != null) {
            includesOutput.includeCellValuesInFieldIds = includes.includeCellValuesInFieldIds;
        }
        if (includes.includePreviousCellValues !== undefined) {
            includesOutput.includePreviousCellValues = includes.includePreviousCellValues;
        }
        if (includes.includePreviousFieldDefinitions !== undefined) {
            includesOutput.includePreviousFieldDefinitions = includes.includePreviousFieldDefinitions;
        }
    }

    const result: z.infer<typeof WebhookSchema> = {
        id: webhook.id,
        specification: {
            options: {
                filters: filtersOutput,
                ...(includesOutput !== undefined && { includes: includesOutput })
            }
        },
        cursorForNextPayload: webhook.cursorForNextPayload,
        areNotificationsEnabled: webhook.areNotificationsEnabled,
        isHookEnabled: webhook.isHookEnabled
    };

    if (webhook.notificationUrl != null) {
        result.notificationUrl = webhook.notificationUrl;
    }

    if (webhook.lastNotificationResult != null) {
        result.lastNotificationResult = {
            success: webhook.lastNotificationResult.success,
            ...(webhook.lastNotificationResult.completionTimestamp != null && {
                completionTimestamp: webhook.lastNotificationResult.completionTimestamp
            }),
            ...(webhook.lastNotificationResult.durationMs !== undefined && {
                durationMs: webhook.lastNotificationResult.durationMs
            }),
            ...(webhook.lastNotificationResult.retryNumber !== undefined && {
                retryNumber: webhook.lastNotificationResult.retryNumber
            }),
            ...(webhook.lastNotificationResult.willBeRetried != null && {
                willBeRetried: webhook.lastNotificationResult.willBeRetried
            }),
            ...(webhook.lastNotificationResult.error != null && {
                error: { message: webhook.lastNotificationResult.error.message }
            })
        };
    }

    if (webhook.lastSuccessfulNotificationTime != null) {
        result.lastSuccessfulNotificationTime = webhook.lastSuccessfulNotificationTime;
    }

    if (webhook.expirationTime != null) {
        result.expirationTime = webhook.expirationTime;
    }

    return result;
}

const action = createAction({
    description: 'List webhooks configured on an Airtable base.',
    version: '2.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-webhooks',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://airtable.com/developers/web/api/list-webhooks
            endpoint: `/v0/bases/${input.baseId}/webhooks`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No webhooks found or unexpected response from Airtable API.'
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            webhooks: providerData.webhooks.map(mapProviderWebhook)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
