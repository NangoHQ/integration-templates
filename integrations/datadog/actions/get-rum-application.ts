import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    app_id: z.string().describe('RUM application ID. Example: "f34e959e-2ec6-4cee-8122-b625abbfad05"')
});

const ProviderRumApplicationAttributesSchema = z.object({
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

const ProviderRumApplicationDataSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ProviderRumApplicationAttributesSchema
});

const ProviderRumApplicationResponseSchema = z.object({
    data: ProviderRumApplicationDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    application_id: z.string(),
    client_token: z.string(),
    created_at: z.number(),
    created_by_handle: z.string(),
    name: z.string(),
    org_id: z.number(),
    application_type: z.string(),
    updated_at: z.number(),
    updated_by_handle: z.string(),
    api_key_id: z.number().optional(),
    hash: z.string().optional(),
    is_active: z.boolean().optional(),
    remote_config_id: z.string().optional()
});

const action = createAction({
    description: 'Get a single RUM application by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/rum/#get-a-rum-application
        const response = await nango.get({
            endpoint: `v2/rum/applications/${encodeURIComponent(input.app_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'RUM application not found',
                app_id: input.app_id
            });
        }

        const providerResponse = ProviderRumApplicationResponseSchema.parse(response.data);
        const attrs = providerResponse.data.attributes;

        return {
            id: providerResponse.data.id,
            type: providerResponse.data.type,
            application_id: attrs.application_id,
            client_token: attrs.client_token,
            created_at: attrs.created_at,
            created_by_handle: attrs.created_by_handle,
            name: attrs.name,
            org_id: attrs.org_id,
            application_type: attrs.type,
            updated_at: attrs.updated_at,
            updated_by_handle: attrs.updated_by_handle,
            ...(attrs.api_key_id !== undefined && { api_key_id: attrs.api_key_id }),
            ...(attrs.hash !== undefined && { hash: attrs.hash }),
            ...(attrs.is_active !== undefined && { is_active: attrs.is_active }),
            ...(attrs.remote_config_id !== undefined && { remote_config_id: attrs.remote_config_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
