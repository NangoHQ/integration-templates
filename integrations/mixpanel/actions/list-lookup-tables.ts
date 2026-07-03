import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('The Mixpanel project_id, used to authenticate service account credentials. Example: "4040293"')
});

const ProviderLookupTableSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    status: z.string().optional(),
    results: z.array(ProviderLookupTableSchema).nullable().optional()
});

const OutputSchema = z.object({
    results: z.array(ProviderLookupTableSchema)
});

const action = createAction({
    description: 'List lookup tables.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.mixpanel.com/reference/lookup-tables
        const response = await nango.get({
            baseUrlOverride: 'https://api.mixpanel.com',
            endpoint: '/lookup-tables',
            params: {
                project_id: input.project_id
            },
            retries: 3
        });

        const data = response.data;
        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Mixpanel API'
            });
        }

        const parsed = ProviderResponseSchema.parse(data);

        return {
            results: parsed.results ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
