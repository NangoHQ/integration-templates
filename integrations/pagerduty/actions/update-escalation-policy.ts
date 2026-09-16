import { z } from 'zod';
import { createAction } from 'nango';

const TargetInputSchema = z.object({
    id: z.string().describe('The ID of the target resource, such as a user or schedule.'),
    type: z.string().describe('The type of the target, for example "user_reference" or "schedule_reference".')
});

const RuleInputSchema = z.object({
    escalation_delay_in_minutes: z.number().describe('Number of minutes to wait before escalating to the next rule.'),
    targets: z.array(TargetInputSchema).describe('The ordered list of targets to notify for this rule.')
});

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the escalation policy to update.'),
        name: z.string().optional().describe('The new name for the escalation policy.'),
        description: z.string().nullable().optional().describe('The new description for the escalation policy. Pass null to clear the existing description.'),
        escalation_rules: z
            .array(RuleInputSchema)
            .optional()
            .describe('The complete set of escalation rules to apply. Replaces the existing rules when provided.')
    })
    .describe('Input to update an existing PagerDuty escalation policy.');

const TargetOutputSchema = z.object({
    id: z.string().describe('The ID of the target resource.'),
    type: z.string().describe('The type of the target resource.'),
    summary: z.string().optional().describe('A short summary of the target resource.')
});

const RuleOutputSchema = z.object({
    id: z.string().describe('The unique identifier of the escalation rule.'),
    escalation_delay_in_minutes: z.number().describe('Number of minutes to wait before escalating to the next rule.'),
    targets: z.array(TargetOutputSchema).describe('The ordered list of targets to notify for this rule.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the escalation policy.'),
        type: z.string().describe('The resource type, typically "escalation_policy".'),
        summary: z.string().optional().describe('A short summary of the escalation policy.'),
        name: z.string().describe('The name of the escalation policy.'),
        description: z.string().nullable().optional().describe('The description of the escalation policy.'),
        escalation_rules: z.array(RuleOutputSchema).describe('The ordered list of escalation rules for the policy.')
    })
    .describe('The updated PagerDuty escalation policy returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Sends a PUT request to modify an existing escalation policy on the provider.
 */
const action = createAction({
    description: "Update an escalation policy's name, description, or rules.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            escalation_policy: {
                type: string;
                name?: string;
                description?: string | null;
                escalation_rules?: Array<{
                    escalation_delay_in_minutes: number;
                    targets: Array<{ id: string; type: string }>;
                }>;
            };
        } = {
            escalation_policy: {
                type: 'escalation_policy'
            }
        };

        if (input.name !== undefined) {
            body.escalation_policy.name = input.name;
        }
        if (input.description !== undefined) {
            body.escalation_policy.description = input.description;
        }
        if (input.escalation_rules !== undefined) {
            body.escalation_policy.escalation_rules = input.escalation_rules;
        }

        // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1escalation_policies~1%7Bid%7D/put
        const response = await nango.put({
            endpoint: `/escalation_policies/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 10
        });

        const ProviderResponseSchema = z.object({
            escalation_policy: z.object({
                id: z.string(),
                type: z.string(),
                summary: z.string().optional(),
                name: z.string(),
                description: z.string().nullable().optional(),
                escalation_rules: z.array(
                    z.object({
                        id: z.string(),
                        escalation_delay_in_minutes: z.number(),
                        targets: z.array(
                            z.object({
                                id: z.string(),
                                type: z.string(),
                                summary: z.string().optional()
                            })
                        )
                    })
                )
            })
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const policy = parsed.escalation_policy;

        return {
            id: policy.id,
            type: policy.type,
            summary: policy.summary,
            name: policy.name,
            description: policy.description,
            escalation_rules: policy.escalation_rules.map((rule) => ({
                id: rule.id,
                escalation_delay_in_minutes: rule.escalation_delay_in_minutes,
                targets: rule.targets.map((target) => ({
                    id: target.id,
                    type: target.type,
                    summary: target.summary
                }))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
