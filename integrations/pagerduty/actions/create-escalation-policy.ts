import { z } from 'zod';
import { createAction } from 'nango';

const TargetSchema = z.object({
    id: z.string().describe('The ID of the target user or schedule.'),
    type: z.union([z.literal('user_reference'), z.literal('schedule_reference')]).describe('The type of target reference.')
});

const EscalationRuleSchema = z.object({
    escalation_delay_in_minutes: z.number().describe('The number of minutes before escalating to the next target.'),
    targets: z.array(TargetSchema).describe('Ordered list of targets for this escalation rule.')
});

const InputSchema = z
    .object({
        escalation_policy: z
            .object({
                type: z.literal('escalation_policy').describe('The type of resource being created.'),
                name: z.string().describe('The name of the escalation policy.'),
                escalation_rules: z.array(EscalationRuleSchema).describe('One or more escalation rules defining how and when to escalate.')
            })
            .describe('The escalation policy to create.')
    })
    .describe('Input for creating a PagerDuty escalation policy.');

const EscalationPolicySchema = z.object({
    id: z.string().describe('The unique ID of the escalation policy.'),
    type: z.string().describe('The type of resource.'),
    summary: z.string().nullish().describe('A short summary of the escalation policy.'),
    self: z.string().nullish().describe('The API URL of the escalation policy.'),
    html_url: z.string().nullish().describe('The PagerDuty web URL of the escalation policy.'),
    name: z.string().nullish().describe('The name of the escalation policy.'),
    escalation_rules: z
        .array(
            z.object({
                id: z.string().describe('The unique ID of the escalation rule.'),
                escalation_delay_in_minutes: z.number().describe('Minutes before escalating to the next target.'),
                targets: z
                    .array(
                        z.object({
                            id: z.string().describe('The ID of the target.'),
                            type: z.string().describe('The type of the target reference.'),
                            summary: z.string().nullish().describe('A short summary of the target.')
                        })
                    )
                    .describe('Ordered list of targets for this escalation rule.')
            })
        )
        .nullish()
        .describe('The escalation rules for this policy.'),
    services: z.array(z.unknown()).nullish().describe('Services associated with this escalation policy.'),
    num_loops: z.number().nullish().describe('Number of times to loop through the escalation rules.'),
    teams: z.array(z.unknown()).nullish().describe('Teams associated with this escalation policy.'),
    description: z.string().nullable().nullish().describe('A description of the escalation policy.'),
    on_call_handoff_notifications: z.string().nullish().describe('When on-call handoff notifications are sent.'),
    privilege: z.string().nullish().describe('The privilege level of the escalation policy.')
});

const OutputSchema = z
    .object({
        escalation_policy: EscalationPolicySchema.describe('The created escalation policy.')
    })
    .describe('Output of creating a PagerDuty escalation policy.');

/**
 * @tags: [write]
 * @tagReason: Creates a new escalation policy via POST.
 * @pitfalls: Escalation policy names must be unique within the account; a duplicate name returns HTTP 400.
 */
const action = createAction({
    description: 'Create an escalation policy with one or more escalation rules.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['escalation_policies.write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/7b1d83b7f17e9-create-an-escalation-policy
            endpoint: '/escalation_policies',
            data: input,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
