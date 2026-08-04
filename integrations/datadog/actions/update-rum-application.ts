import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('The RUM application ID. Example: "f34e959e-2ec6-4cee-8122-b625abbfad05"'),
    name: z.string().optional().describe('Updated name of the RUM application.'),
    type: z
        .enum(['browser', 'ios', 'android', 'react-native', 'flutter', 'roku', 'electron', 'unity', 'kotlin-multiplatform'])
        .optional()
        .describe('Type of the RUM application.'),
    productAnalyticsRetentionState: z
        .enum(['MAX', 'NONE'])
        .optional()
        .describe('Controls the retention policy for Product Analytics data derived from RUM events.'),
    rumEventProcessingState: z
        .enum(['ALL', 'ERROR_FOCUSED_MODE', 'NONE'])
        .optional()
        .describe('Configures which RUM events are processed and stored for the application.')
});

const ProviderApplicationAttributesSchema = z.object({
    application_id: z.string(),
    client_token: z.string(),
    created_at: z.number(),
    created_by_handle: z.string(),
    name: z.string(),
    org_id: z.number(),
    type: z.string(),
    updated_at: z.number(),
    updated_by_handle: z.string(),
    api_key_id: z.number().optional(),
    hash: z.string().optional(),
    is_active: z.boolean().optional(),
    remote_config_id: z.string().optional()
});

const ProviderApplicationSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ProviderApplicationAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: ProviderApplicationSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    applicationId: z.string(),
    clientToken: z.string(),
    createdAt: z.number(),
    createdByHandle: z.string(),
    orgId: z.number(),
    updatedAt: z.number(),
    updatedByHandle: z.string(),
    apiKeyId: z.number().optional(),
    hash: z.string().optional(),
    isActive: z.boolean().optional(),
    remoteConfigId: z.string().optional()
});

const action = createAction({
    description: "Update a RUM application's name or settings.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const attributes: Record<string, unknown> = {};

        if (input.name !== undefined) {
            attributes['name'] = input.name;
        }
        if (input.type !== undefined) {
            attributes['type'] = input.type;
        }
        if (input.productAnalyticsRetentionState !== undefined) {
            attributes['product_analytics_retention_state'] = input.productAnalyticsRetentionState;
        }
        if (input.rumEventProcessingState !== undefined) {
            attributes['rum_event_processing_state'] = input.rumEventProcessingState;
        }

        const response = await nango.patch({
            // https://docs.datadoghq.com/api/latest/rum/#update-a-rum-application
            endpoint: `v2/rum/applications/${encodeURIComponent(input.appId)}`,
            data: {
                data: {
                    id: input.appId,
                    type: 'rum_application_update',
                    attributes
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const app = providerResponse.data;
        const attrs = app.attributes;

        return {
            id: app.id,
            name: attrs.name,
            type: attrs.type,
            applicationId: attrs.application_id,
            clientToken: attrs.client_token,
            createdAt: attrs.created_at,
            createdByHandle: attrs.created_by_handle,
            orgId: attrs.org_id,
            updatedAt: attrs.updated_at,
            updatedByHandle: attrs.updated_by_handle,
            ...(attrs.api_key_id !== undefined && { apiKeyId: attrs.api_key_id }),
            ...(attrs.hash !== undefined && { hash: attrs.hash }),
            ...(attrs.is_active !== undefined && { isActive: attrs.is_active }),
            ...(attrs.remote_config_id !== undefined && { remoteConfigId: attrs.remote_config_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
