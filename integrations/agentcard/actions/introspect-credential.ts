import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    object: z.string(),
    organization_id: z.string(),
    mode: z.enum(['sandbox', 'live']),
    test_mode: z.boolean(),
    plan: z.string()
});

const OutputSchema = z.object({
    object: z.string(),
    organization_id: z.string(),
    mode: z.enum(['sandbox', 'live']),
    test_mode: z.boolean(),
    plan: z.string()
});

const action = createAction({
    description: 'Check which organization and mode (sandbox/live) the current platform token acts as.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.agentcard.sh/companies/api/reference/introspect
            endpoint: '/api/v2',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            object: providerResponse.object,
            organization_id: providerResponse.organization_id,
            mode: providerResponse.mode,
            test_mode: providerResponse.test_mode,
            plan: providerResponse.plan
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
