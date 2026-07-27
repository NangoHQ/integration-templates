import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address to verify. Example: "user@example.com"'),
    timeout: z.number().min(2).max(60).optional().describe('Timeout in seconds (2-60). Default: 20')
});

const ProviderResponseSchema = z
    .object({
        email: z.string(),
        quality: z.enum(['good', 'bad']),
        result: z.string(),
        resultcode: z.number(),
        subresult: z.string(),
        free: z.boolean().optional(),
        role: z.boolean().optional(),
        didyoumean: z.string().optional(),
        credits: z.number().optional(),
        executiontime: z.number().optional(),
        error: z.string().optional(),
        livemode: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    email: z.string(),
    quality: z.enum(['good', 'bad']),
    result: z.string(),
    resultcode: z.number(),
    subresult: z.string(),
    free: z.boolean().optional(),
    role: z.boolean().optional(),
    didyoumean: z.string().optional(),
    credits: z.number().optional(),
    executiontime: z.number().optional(),
    error: z.string().optional(),
    livemode: z.boolean().optional()
});

const action = createAction({
    description: 'Verify a single email address in real time.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.millionverifier.com/
        const response = await nango.get({
            endpoint: 'v3',
            params: {
                email: input.email,
                ...(input.timeout !== undefined && { timeout: String(input.timeout) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.error) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.error,
                email: input.email
            });
        }

        return {
            email: providerResponse.email,
            quality: providerResponse.quality,
            result: providerResponse.result,
            resultcode: providerResponse.resultcode,
            subresult: providerResponse.subresult,
            ...(providerResponse.free !== undefined && { free: providerResponse.free }),
            ...(providerResponse.role !== undefined && { role: providerResponse.role }),
            ...(providerResponse.didyoumean !== undefined && { didyoumean: providerResponse.didyoumean }),
            ...(providerResponse.credits !== undefined && { credits: providerResponse.credits }),
            ...(providerResponse.executiontime !== undefined && { executiontime: providerResponse.executiontime }),
            ...(providerResponse.error !== undefined && { error: providerResponse.error }),
            ...(providerResponse.livemode !== undefined && { livemode: providerResponse.livemode })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
