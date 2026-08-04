import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    service_account_id: z.string().describe('The ID of the service account. Example: "39886536-8f56-11f1-88dd-3619de0c3ef9"'),
    name: z.string().describe('Name of the access token. Example: "My Access Token"'),
    scopes: z.array(z.string()).describe('Array of scopes to grant the access token. Example: ["dashboards_read", "dashboards_write"]'),
    expires_at: z.string().optional().describe('Expiration date of the access token in ISO 8601 format. Example: "2025-12-31T23:59:59Z"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            created_at: z.string().nullable().optional(),
            expires_at: z.string().nullable().optional(),
            key: z.string().nullable().optional(),
            name: z.string(),
            public_portion: z.string().nullable().optional(),
            scopes: z.array(z.string())
        }),
        relationships: z
            .object({
                owned_by: z.object({
                    data: z.object({
                        id: z.string(),
                        type: z.string()
                    })
                })
            })
            .optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    scopes: z.array(z.string()),
    key: z.string().optional(),
    public_portion: z.string().optional(),
    created_at: z.string().optional(),
    expires_at: z.string().optional(),
    service_account_id: z.string()
});

const action = createAction({
    description: 'Create an OAuth-style access token for a service account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/service-accounts/#create-an-access-token-for-a-service-account
            endpoint: `v2/service_accounts/${encodeURIComponent(input.service_account_id)}/access_tokens`,
            data: {
                data: {
                    type: 'service_access_tokens',
                    attributes: {
                        name: input.name,
                        scopes: input.scopes,
                        ...(input.expires_at !== undefined && { expires_at: input.expires_at })
                    }
                }
            },
            retries: 1
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const attrs = parsed.data.attributes;
        const rel = parsed.data.relationships;

        return {
            id: parsed.data.id,
            type: parsed.data.type,
            name: attrs.name,
            scopes: attrs.scopes,
            ...(attrs.key != null && { key: attrs.key }),
            ...(attrs.public_portion != null && { public_portion: attrs.public_portion }),
            ...(attrs.created_at != null && { created_at: attrs.created_at }),
            ...(attrs.expires_at != null && { expires_at: attrs.expires_at }),
            service_account_id: rel?.owned_by.data.id ?? ''
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
