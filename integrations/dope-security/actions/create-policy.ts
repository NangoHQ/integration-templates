import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    policyName: z.string().min(1).max(32).describe('The name of the policy to create. Max 32 characters, no special characters (#!@$%^*?./\\).')
});

const ProviderSuccessSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    message: z.string()
});

const action = createAction({
    description: 'Create a custom policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const invalidCharsRegex = /[#!@$%^*?./\\]/;
        if (input.policyName.trim() !== input.policyName) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'policyName must not have leading or trailing whitespace.'
            });
        }
        if (invalidCharsRegex.test(input.policyName)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'policyName contains invalid characters. Disallowed: #!@$%^*?./\\'
            });
        }

        const config: ProxyConfiguration = {
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}`,
            data: {},
            // Creating a policy is not documented as idempotent: replaying after a
            // successful create returns "Policy already exists" instead of Success.
            retries: 10
        };
        const response = await nango.post(config);

        const providerResponse = ProviderSuccessSchema.parse(response.data);

        return {
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
