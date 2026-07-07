import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    type: z.string().describe('Policy type. Example: "OKTA_SIGN_ON"'),
    name: z.string().describe('Policy name.'),
    description: z.string().optional().describe('Policy description.'),
    groupIds: z.array(z.string()).describe('Group IDs to include in the policy conditions.')
});

const ProviderPolicySchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    status: z.string(),
    conditions: z.record(z.string(), z.unknown()).optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    priority: z.number().optional(),
    system: z.boolean().optional(),
    active: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.string(),
    conditions: z.record(z.string(), z.unknown()).optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    priority: z.number().optional(),
    system: z.boolean().optional(),
    active: z.boolean().optional()
});

const action = createAction({
    description: 'Create a policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.policies.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/policy/
            endpoint: '/api/v1/policies',
            data: {
                type: input.type,
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                conditions: {
                    people: {
                        groups: {
                            include: input.groupIds
                        }
                    }
                }
            },
            retries: 3
        });

        const providerPolicy = ProviderPolicySchema.parse(response.data);

        return {
            id: providerPolicy.id,
            type: providerPolicy.type,
            name: providerPolicy.name,
            ...(providerPolicy.description != null && { description: providerPolicy.description }),
            status: providerPolicy.status,
            ...(providerPolicy.conditions !== undefined && { conditions: providerPolicy.conditions }),
            ...(providerPolicy.created !== undefined && { created: providerPolicy.created }),
            ...(providerPolicy.lastUpdated !== undefined && { lastUpdated: providerPolicy.lastUpdated }),
            ...(providerPolicy.priority !== undefined && { priority: providerPolicy.priority }),
            ...(providerPolicy.system !== undefined && { system: providerPolicy.system }),
            ...(providerPolicy.active !== undefined && { active: providerPolicy.active })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
