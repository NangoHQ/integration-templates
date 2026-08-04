import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name for the new API key. Example: "Nango Integration Key"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            name: z.string(),
            key: z.string(),
            created_at: z.string().optional(),
            last4: z.string().optional(),
            modified_at: z.string().optional()
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    key: z.string(),
    created_at: z.string().optional()
});

const action = createAction({
    description: 'Create a new API key for this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/api-keys/#create-an-api-key
            endpoint: 'v2/api_keys',
            data: {
                data: {
                    type: 'api_keys',
                    attributes: {
                        name: input.name
                    }
                }
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape when creating the API key.',
                details: parsed.error.issues
            });
        }

        const providerData = parsed.data.data;

        return {
            id: providerData.id,
            name: providerData.attributes.name,
            key: providerData.attributes.key,
            ...(providerData.attributes.created_at !== undefined && { created_at: providerData.attributes.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
