import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the personal access token. Example: "My Token"'),
    scopes: z.array(z.string()).optional().describe('Scopes to assign to the token. Example: ["dashboards_read", "monitors_read"]'),
    expires_at: z.string().optional().describe('Expiration date in ISO 8601 format. Example: "2026-12-31T23:59:59Z"')
});

const ProviderResponseSchema = z
    .object({
        data: z
            .object({
                id: z.string(),
                type: z.string(),
                attributes: z
                    .object({
                        name: z.string(),
                        scopes: z.array(z.string()),
                        expires_at: z.string().nullable().optional(),
                        last4: z.string().optional(),
                        created_at: z.string().optional(),
                        modified_at: z.string().optional()
                    })
                    .passthrough()
            })
            .passthrough()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    scopes: z.array(z.string()),
    expires_at: z.string().optional(),
    last4: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const action = createAction({
    description: 'Create a new personal access token.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/personal-access-tokens/
            endpoint: 'v2/personal_access_tokens',
            data: {
                data: {
                    type: 'personal_access_tokens',
                    attributes: {
                        name: input.name,
                        ...(input.scopes !== undefined && { scopes: input.scopes }),
                        ...(input.expires_at !== undefined && { expires_at: input.expires_at })
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            id: parsed.data.id,
            name: parsed.data.attributes.name,
            scopes: parsed.data.attributes.scopes,
            ...(parsed.data.attributes.expires_at != null && { expires_at: parsed.data.attributes.expires_at }),
            ...(parsed.data.attributes.last4 !== undefined && { last4: parsed.data.attributes.last4 }),
            ...(parsed.data.attributes.created_at !== undefined && { created_at: parsed.data.attributes.created_at }),
            ...(parsed.data.attributes.modified_at !== undefined && { modified_at: parsed.data.attributes.modified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
