import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    api_key_id: z.string().trim().min(1).describe('The ID of the API key. Example: "12345678-1234-1234-1234-123456789abc"')
});

const LastUsedDateSchema = z.object({
    timestamp: z.string().nullable().optional(),
    description: z.string().optional()
});

const ApiKeyAttributesSchema = z.object({
    category: z.string().optional(),
    created_at: z.string().optional(),
    date_last_used: z.string().nullable().optional(),
    key: z.string().nullable().optional(),
    last4: z.string().optional(),
    last_used_date: LastUsedDateSchema.optional(),
    modified_at: z.string().optional(),
    name: z.string().optional(),
    private_action_runner_enroll_enabled: z.boolean().optional(),
    remote_config_read_enabled: z.boolean().optional(),
    status: z.string().optional(),
    used_in_last_24_hours: z.boolean().optional()
});

const ProviderApiKeySchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ApiKeyAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: ProviderApiKeySchema
});

const OutputSchema = z.object({
    type: z.string(),
    id: z.string(),
    category: z.string().optional(),
    created_at: z.string().optional(),
    date_last_used: z.string().nullable().optional(),
    key: z.string().nullable().optional(),
    last4: z.string().optional(),
    last_used_date: LastUsedDateSchema.optional(),
    modified_at: z.string().optional(),
    name: z.string().optional(),
    private_action_runner_enroll_enabled: z.boolean().optional(),
    remote_config_read_enabled: z.boolean().optional(),
    status: z.string().optional(),
    used_in_last_24_hours: z.boolean().optional()
});

const action = createAction({
    description: "Get a single API key's metadata by id.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api_keys_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/api-keys/#get-an-api-key
            endpoint: `v2/api_keys/${encodeURIComponent(input.api_key_id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const attrs = parsed.data.attributes;

        return {
            type: parsed.data.type,
            id: parsed.data.id,
            ...(attrs.category !== undefined && { category: attrs.category }),
            ...(attrs.created_at !== undefined && { created_at: attrs.created_at }),
            ...(attrs.date_last_used !== undefined && { date_last_used: attrs.date_last_used }),
            ...(attrs.key !== undefined && { key: attrs.key }),
            ...(attrs.last4 !== undefined && { last4: attrs.last4 }),
            ...(attrs.last_used_date !== undefined && { last_used_date: attrs.last_used_date }),
            ...(attrs.modified_at !== undefined && { modified_at: attrs.modified_at }),
            ...(attrs.name !== undefined && { name: attrs.name }),
            ...(attrs.private_action_runner_enroll_enabled !== undefined && {
                private_action_runner_enroll_enabled: attrs.private_action_runner_enroll_enabled
            }),
            ...(attrs.remote_config_read_enabled !== undefined && { remote_config_read_enabled: attrs.remote_config_read_enabled }),
            ...(attrs.status !== undefined && { status: attrs.status }),
            ...(attrs.used_in_last_24_hours !== undefined && { used_in_last_24_hours: attrs.used_in_last_24_hours })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
