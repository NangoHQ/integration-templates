import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the RUM application. Example: "My Web App"'),
    type: z.enum(['browser', 'ios', 'android', 'flutter', 'react-native']).describe('Type of the RUM application.')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        attributes: z.object({
            application_id: z.string(),
            client_token: z.string(),
            api_key_id: z.union([z.string(), z.number()]),
            name: z.string(),
            type: z.string(),
            created_at: z.union([z.string(), z.number()]).optional(),
            updated_at: z.union([z.string(), z.number()]).optional(),
            org_id: z.number().optional()
        })
    })
});

const OutputSchema = z.object({
    application_id: z.string(),
    client_token: z.string(),
    api_key_id: z.union([z.string(), z.number()]),
    name: z.string(),
    type: z.string(),
    created_at: z.union([z.string(), z.number()]).optional(),
    updated_at: z.union([z.string(), z.number()]).optional()
});

const action = createAction({
    description: 'Create a new RUM application (registers a client_token for browser/mobile SDK instrumentation).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/rum/#create-a-rum-application
            endpoint: 'v2/rum/applications',
            data: {
                data: {
                    type: 'rum_application_create',
                    attributes: {
                        name: input.name,
                        type: input.type
                    }
                }
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const attrs = parsed.data.attributes;

        return {
            application_id: attrs.application_id,
            client_token: attrs.client_token,
            api_key_id: attrs.api_key_id,
            name: attrs.name,
            type: attrs.type,
            ...(attrs.created_at !== undefined && { created_at: attrs.created_at }),
            ...(attrs.updated_at !== undefined && { updated_at: attrs.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
