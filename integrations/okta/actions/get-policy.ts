import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyId: z.string().describe('The unique identifier of the policy. Example: "00p14u78ldpLmNhTB698"')
});

const RuleSchema = z
    .object({
        id: z.string(),
        type: z.string().optional(),
        name: z.string().optional(),
        status: z.string().optional(),
        priority: z.number().optional(),
        system: z.boolean().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        conditions: z.object({}).passthrough().optional(),
        actions: z.object({}).passthrough().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        status: z.string().optional(),
        priority: z.number().optional(),
        system: z.boolean().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        conditions: z.object({}).passthrough().optional(),
        settings: z.object({}).passthrough().optional(),
        _embedded: z
            .object({
                rules: z.array(RuleSchema).optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.policies.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/policy/#get-a-policy
            endpoint: `/api/v1/policies/${encodeURIComponent(input.policyId)}`,
            params: {
                expand: 'rules'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Policy not found',
                policyId: input.policyId
            });
        }

        const policy = OutputSchema.parse(response.data);

        return policy;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
