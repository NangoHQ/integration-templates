import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('Policy name. Example: "RegistrySeedPolicy1"'),
    urls: z.array(z.string()).describe('Array of custom URL bypass entries to remove. Example: ["*.example.com"]')
});

const OutputSchema = z.object({
    policyName: z.string(),
    deletedUrls: z.array(z.string())
});

const action = createAction({
    description: 'Remove custom URL bypass entries from a policy by name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://inflight.dope.security/dope.apis/public-api-specification
        await nango.delete({
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/bypass/urls`,
            data: {
                data: {
                    custom: {
                        urls: input.urls
                    }
                }
            },
            retries: 10
        });

        return {
            policyName: input.policyName,
            deletedUrls: input.urls
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
