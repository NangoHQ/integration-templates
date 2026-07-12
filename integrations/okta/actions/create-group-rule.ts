import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Unique name for the group rule.'),
    expression_value: z.string().describe('Okta expression used to determine group membership. Example: String.stringContains(user.email, "@example.com")'),
    group_ids: z.array(z.string()).describe('List of group IDs to assign matching users to.')
});

const ProviderGroupRuleSchema = z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    conditions: z
        .object({
            expression: z
                .object({
                    type: z.string().optional(),
                    value: z.string().optional()
                })
                .optional()
        })
        .optional(),
    actions: z
        .object({
            assignUserToGroups: z
                .object({
                    groupIds: z.array(z.string()).optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    expression_value: z.string().optional(),
    group_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a group membership rule.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/groups/#add-group-rule
            endpoint: '/api/v1/groups/rules',
            data: {
                type: 'group_rule',
                name: input.name,
                conditions: {
                    expression: {
                        type: 'urn:okta:expression:1.0',
                        value: input.expression_value
                    }
                },
                actions: {
                    assignUserToGroups: {
                        groupIds: input.group_ids
                    }
                }
            },
            retries: 3
        });

        const providerRule = ProviderGroupRuleSchema.parse(response.data);

        if (!providerRule.id || !providerRule.name || !providerRule.status) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider response is missing required fields.'
            });
        }

        return {
            id: providerRule.id,
            name: providerRule.name,
            status: providerRule.status,
            ...(providerRule.conditions?.expression?.value !== undefined && {
                expression_value: providerRule.conditions.expression.value
            }),
            ...(providerRule.actions?.assignUserToGroups?.groupIds !== undefined && {
                group_ids: providerRule.actions.assignUserToGroups.groupIds
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
