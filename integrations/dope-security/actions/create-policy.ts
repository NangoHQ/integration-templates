import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    policyName: z.string().max(32).describe('The name of the policy to create. Max 32 characters, no special characters (#!@$%^*?./\\).')
});

const ProviderPolicySchema = z
    .object({
        policyName: z.string().optional(),
        updatedAt: z.string().optional(),
        sslInspection: z
            .object({
                state: z.string().optional(),
                inheritsFromBase: z.boolean().optional()
            })
            .optional(),
        clashCount: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    policyName: z.string().optional(),
    updatedAt: z.string().optional(),
    sslInspection: z
        .object({
            state: z.string().optional(),
            inheritsFromBase: z.boolean().optional()
        })
        .optional(),
    clashCount: z.number().optional()
});

const WrappedResponseSchema = z
    .object({
        data: ProviderPolicySchema
    })
    .passthrough();

const action = createAction({
    description: 'Create a custom policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const invalidCharsRegex = /[#!@$%^*?./\\]/;
        if (input.policyName.length > 32) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'policyName must be 32 characters or fewer.'
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
            retries: 1
        };
        const response = await nango.post(config);

        const wrapped = WrappedResponseSchema.safeParse(response.data);
        const providerPolicy = wrapped.success ? wrapped.data.data : ProviderPolicySchema.parse(response.data);

        return {
            ...(providerPolicy.policyName !== undefined && { policyName: providerPolicy.policyName }),
            ...(providerPolicy.updatedAt !== undefined && { updatedAt: providerPolicy.updatedAt }),
            ...(providerPolicy.sslInspection !== undefined && { sslInspection: providerPolicy.sslInspection }),
            ...(providerPolicy.clashCount !== undefined && { clashCount: providerPolicy.clashCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
