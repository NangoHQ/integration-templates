import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyId: z.string().describe('The unique ID of the policy to delete. Example: "00p14y5whkhX2J7ek698"')
});

const PolicySchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    status: z.string(),
    system: z.boolean().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    policyId: z.string()
});

const action = createAction({
    description: 'Delete a policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.policies.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedPolicyId = encodeURIComponent(input.policyId);

        // https://developer.okta.com/docs/reference/api/policy/#get-a-policy
        const getResponse = await nango.get({
            endpoint: `/api/v1/policies/${encodedPolicyId}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Policy ${input.policyId} not found.`
            });
        }

        const policy = PolicySchema.parse(getResponse.data);

        if (policy.system === true) {
            throw new nango.ActionError({
                type: 'invalid_request',
                message: `System policies cannot be deleted. Policy ${input.policyId} is a system policy.`
            });
        }

        if (policy.status === 'ACTIVE') {
            // https://developer.okta.com/docs/reference/api/policy/#deactivate-a-policy
            await nango.post({
                endpoint: `/api/v1/policies/${encodedPolicyId}/lifecycle/deactivate`,
                retries: 3
            });
        }

        // https://developer.okta.com/docs/reference/api/policy/#delete-a-policy
        await nango.delete({
            endpoint: `/api/v1/policies/${encodedPolicyId}`,
            retries: 3
        });

        return {
            success: true,
            policyId: input.policyId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
