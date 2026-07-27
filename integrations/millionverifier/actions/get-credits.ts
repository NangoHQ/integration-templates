import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderCreditsSchema = z.object({
    credits: z.number(),
    bulk_credits: z.number(),
    renewing_credits: z.number(),
    plan: z.number()
});

const OutputSchema = z.object({
    credits: z.number(),
    bulk_credits: z.number(),
    renewing_credits: z.number(),
    plan: z.number()
});

const action = createAction({
    description: 'Check the remaining single-verification and bulk credit balance.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.millionverifier.com/
            endpoint: '/v3/credits',
            retries: 3
        });

        const providerCredits = ProviderCreditsSchema.parse(response.data);

        return {
            credits: providerCredits.credits,
            bulk_credits: providerCredits.bulk_credits,
            renewing_credits: providerCredits.renewing_credits,
            plan: providerCredits.plan
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
