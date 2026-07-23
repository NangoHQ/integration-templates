import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().min(1).describe('Policy name. Example: "RegistrySeedPolicy1"'),
    urls: z.array(z.string().min(1)).min(1).describe('Array of custom URL bypass entries to remove. Example: ["*.example.com"]')
});

const CustomBypassEntrySchema = z.object({
    name: z.string()
});

const GetUrlBypassResponseSchema = z.object({
    data: z.object({
        custom: z.array(CustomBypassEntrySchema)
    })
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
        const encodedPolicyName = encodeURIComponent(input.policyName);

        // The provider silently no-ops on names that aren't currently bypassed, so
        // look up the existing custom entries first to report only URLs actually removed.
        // https://inflight.dope.security/dope.apis/public-api-specification
        const getResponse = await nango.get({
            endpoint: `/v1/policies/${encodedPolicyName}/bypass/urls`,
            retries: 3
        });
        const existing = GetUrlBypassResponseSchema.parse(getResponse.data);
        const existingNames = new Set(existing.data.custom.map((entry) => entry.name));
        const deletedUrls = input.urls.filter((url) => existingNames.has(url));

        // https://inflight.dope.security/dope.apis/public-api-specification
        await nango.delete({
            endpoint: `/v1/policies/${encodedPolicyName}/bypass/urls`,
            data: {
                data: {
                    custom: {
                        urls: input.urls
                    }
                }
            },
            retries: 3
        });

        return {
            policyName: input.policyName,
            deletedUrls
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
