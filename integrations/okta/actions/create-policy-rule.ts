import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyId: z.string().describe('Policy ID. Example: 00p14y5whkhX2J7ek698'),
    name: z.string().describe('Rule name. Example: New Sign-On Rule'),
    type: z.string().describe("Rule type corresponding to the parent policy's type. Example: SIGN_ON"),
    conditions: z.object({}).passthrough().optional().describe('Rule conditions object. Structure depends on policy type.'),
    actions: z.object({}).passthrough().optional().describe('Rule actions object. Structure depends on policy type.')
});

const ProviderRuleSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    status: z.string().optional(),
    conditions: z.record(z.string(), z.unknown()).optional(),
    actions: z.record(z.string(), z.unknown()).optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    system: z.boolean().optional()
});

const OutputSchema = ProviderRuleSchema;

const action = createAction({
    description: 'Create a rule under a policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.policies.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/policy/#create-a-rule
            endpoint: `/api/v1/policies/${encodeURIComponent(input.policyId)}/rules`,
            data: {
                type: input.type,
                name: input.name,
                ...(input.conditions !== undefined && { conditions: input.conditions }),
                ...(input.actions !== undefined && { actions: input.actions })
            },
            retries: 10
        });

        return ProviderRuleSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
