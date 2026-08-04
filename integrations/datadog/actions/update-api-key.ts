import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    api_key_id: z.string().trim().min(1).describe('The ID of the API key to update. Example: "001e9b92-4dd8-4a5e-ba6f-e6ec82ed80a3"'),
    name: z.string().describe('The new name for the API key. Example: "Updated API Key Name"')
});

const ProviderApiKeySchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({
        category: z.string().optional(),
        created_at: z.string().optional(),
        date_last_used: z.string().nullable().optional(),
        key: z.string().optional(),
        last4: z.string().optional(),
        last_used_date: z
            .object({
                // Datadog: "null if no recent usage" (matches get-api-key.ts's handling of this same field).
                timestamp: z.string().nullable().optional(),
                description: z.string().optional()
            })
            .nullable()
            .optional(),
        modified_at: z.string().optional(),
        name: z.string(),
        private_action_runner_enroll_enabled: z.boolean().optional(),
        remote_config_read_enabled: z.boolean().optional(),
        status: z.string().optional(),
        used_in_last_24_hours: z.boolean().optional()
    }),
    relationships: z
        .object({
            created_by: z
                .object({
                    data: z
                        .object({
                            id: z.string(),
                            type: z.string()
                        })
                        .nullable()
                })
                .optional(),
            leak_information: z
                .object({
                    data: z.unknown().nullable()
                })
                .optional(),
            modified_by: z
                .object({
                    data: z
                        .object({
                            id: z.string(),
                            type: z.string()
                        })
                        .nullable()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    category: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    last4: z.string().optional(),
    remote_config_read_enabled: z.boolean().optional(),
    private_action_runner_enroll_enabled: z.boolean().optional()
});

const action = createAction({
    description: 'Rename an API key.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/api-keys/#edit-an-api-key
        const response = await nango.patch({
            endpoint: `v2/api_keys/${encodeURIComponent(input.api_key_id)}`,
            data: {
                data: {
                    id: input.api_key_id,
                    type: 'api_keys',
                    attributes: {
                        name: input.name
                    }
                }
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            data: ProviderApiKeySchema
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerApiKey = providerResponse.data;
        const attributes = providerApiKey.attributes;

        return {
            id: providerApiKey.id,
            type: providerApiKey.type,
            name: attributes.name,
            ...(attributes.category !== undefined && { category: attributes.category }),
            ...(attributes.status !== undefined && { status: attributes.status }),
            ...(attributes.created_at !== undefined && { created_at: attributes.created_at }),
            ...(attributes.modified_at !== undefined && { modified_at: attributes.modified_at }),
            ...(attributes.last4 !== undefined && { last4: attributes.last4 }),
            ...(attributes.remote_config_read_enabled !== undefined && { remote_config_read_enabled: attributes.remote_config_read_enabled }),
            ...(attributes.private_action_runner_enroll_enabled !== undefined && {
                private_action_runner_enroll_enabled: attributes.private_action_runner_enroll_enabled
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
