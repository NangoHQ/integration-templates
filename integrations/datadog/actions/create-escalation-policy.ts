import { z } from 'zod';
import { createAction } from 'nango';

const StepTargetConfigSchema = z.object({
    schedule: z.object({
        position: z.enum(['previous', 'current', 'next'])
    })
});

const StepTargetSchema = z.object({
    id: z.string().describe('Target ID. Example: "00000000-0000-0000-0000-000000000000"'),
    type: z.enum(['users', 'schedules', 'teams']).describe('Target type'),
    config: StepTargetConfigSchema.optional()
});

const StepSchema = z.object({
    assignment: z.enum(['default', 'round-robin']).optional(),
    escalate_after_seconds: z.number().optional(),
    targets: z.array(StepTargetSchema)
});

const InputSchema = z.object({
    name: z.string().describe('Name of the escalation policy'),
    steps: z.array(StepSchema).describe('Escalation steps'),
    resolve_page_on_policy_end: z.boolean().optional(),
    retries: z.number().optional(),
    team_ids: z.array(z.string()).optional().describe('Team IDs to associate with the policy')
});

const ProviderPolicySchema = z.object({
    data: z.object({
        id: z.string(),
        type: z.literal('policies'),
        attributes: z
            .object({
                name: z.string(),
                resolve_page_on_policy_end: z.boolean().optional(),
                retries: z.number().optional()
            })
            .passthrough(),
        relationships: z
            .object({
                steps: z
                    .object({
                        data: z.array(
                            z.object({
                                id: z.string(),
                                type: z.literal('steps')
                            })
                        )
                    })
                    .optional(),
                teams: z
                    .object({
                        data: z.array(
                            z.object({
                                id: z.string(),
                                type: z.literal('teams')
                            })
                        )
                    })
                    .optional()
            })
            .optional()
    }),
    included: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('policies'),
    resolve_page_on_policy_end: z.boolean().optional(),
    retries: z.number().optional(),
    step_ids: z.array(z.string()).optional(),
    team_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a new On-Call escalation policy',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['on_call_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const attributes: Record<string, unknown> = {
            name: input.name,
            steps: input.steps.map((step) => ({
                ...(step.assignment !== undefined && { assignment: step.assignment }),
                ...(step.escalate_after_seconds !== undefined && { escalate_after_seconds: step.escalate_after_seconds }),
                targets: step.targets.map((target) => ({
                    id: target.id,
                    type: target.type,
                    ...(target.config !== undefined && { config: target.config })
                }))
            }))
        };

        if (input.resolve_page_on_policy_end !== undefined) {
            attributes['resolve_page_on_policy_end'] = input.resolve_page_on_policy_end;
        }

        if (input.retries !== undefined) {
            attributes['retries'] = input.retries;
        }

        const data: Record<string, unknown> = {
            type: 'policies',
            attributes
        };

        if (input.team_ids !== undefined && input.team_ids.length > 0) {
            data['relationships'] = {
                teams: {
                    data: input.team_ids.map((id) => ({
                        id,
                        type: 'teams'
                    }))
                }
            };
        }

        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/on-call/create-on-call-escalation-policy/
            endpoint: 'v2/on-call/escalation-policies',
            data: { data },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Datadog did not return a response body when creating the escalation policy.'
            });
        }

        const providerPolicy = ProviderPolicySchema.parse(response.data);

        return {
            id: providerPolicy.data.id,
            name: providerPolicy.data.attributes.name,
            type: 'policies',
            ...(providerPolicy.data.attributes.resolve_page_on_policy_end !== undefined && {
                resolve_page_on_policy_end: providerPolicy.data.attributes.resolve_page_on_policy_end
            }),
            ...(providerPolicy.data.attributes.retries !== undefined && {
                retries: providerPolicy.data.attributes.retries
            }),
            ...(providerPolicy.data.relationships?.steps !== undefined && {
                step_ids: providerPolicy.data.relationships.steps.data.map((s) => s.id)
            }),
            ...(providerPolicy.data.relationships?.teams !== undefined && {
                team_ids: providerPolicy.data.relationships.teams.data.map((t) => t.id)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
