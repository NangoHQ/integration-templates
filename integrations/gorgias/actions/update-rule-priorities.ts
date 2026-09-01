import { z } from 'zod';
import { createAction } from 'nango';

const PriorityItemSchema = z
    .object({
        id: z.number().describe('ID of the rule.'),
        priority: z.number().describe('New execution priority for the rule. Higher values are executed first.')
    })
    .describe('A rule ID and its new priority.');

const InputSchema = z
    .object({
        priorities: z.array(PriorityItemSchema).describe('List of rule priorities to update.')
    })
    .describe('Reorder the execution priority of multiple rules in one call.');

const ProviderRuleSchema = z.object({
    id: z.number(),
    code: z.string().nullable().optional(),
    code_ast: z.unknown().nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    deactivated_datetime: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    event_types: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    priority: z.number().nullable().optional(),
    settings: z.unknown().nullable().optional(),
    type: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional(),
    uri: z.string().nullable().optional()
});

const OutputRuleSchema = z
    .object({
        id: z.number().describe('ID of the rule.'),
        name: z.string().optional().describe('Name of the rule.'),
        priority: z.number().optional().describe('Execution priority of the rule. Higher values are executed first.'),
        event_types: z.string().optional().describe('Comma-separated list of event types that trigger the rule.'),
        description: z.string().optional().describe('Description of the rule.'),
        code: z.string().optional().describe('JavaScript logic of the rule.'),
        created_datetime: z.string().optional().describe('When the rule was created.'),
        updated_datetime: z.string().optional().describe('When the rule was last updated.'),
        deactivated_datetime: z.string().optional().describe('When the rule was deactivated, if applicable.'),
        type: z.string().optional().describe('Type of the rule.'),
        uri: z.string().optional().describe('URI of the rule.')
    })
    .describe('A rule with its updated priority.');

const OutputSchema = z.array(OutputRuleSchema).describe('List of rules with updated priorities.');

/**
 * @tags: [write]
 * @tagReason: Reorders the execution priority of multiple rules via a POST call.
 * @pitfalls: The response contains every rule in the account, not just the ones whose priorities were updated. Reordering rules changes their execution order and may affect automation behavior.
 */
const action = createAction({
    description: 'Reorder the execution priority of multiple rules in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['rules:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.gorgias.com/reference/update-rules-priorities
            endpoint: '/api/rules/priorities',
            data: {
                priorities: input.priorities
            },
            retries: 3
        });

        const providerRules = z.array(ProviderRuleSchema).parse(response.data);

        return providerRules.map((rule) => ({
            id: rule.id,
            ...(rule.name != null && { name: rule.name }),
            ...(rule.priority != null && { priority: rule.priority }),
            ...(rule.event_types != null && { event_types: rule.event_types }),
            ...(rule.description != null && { description: rule.description }),
            ...(rule.code != null && { code: rule.code }),
            ...(rule.created_datetime != null && { created_datetime: rule.created_datetime }),
            ...(rule.updated_datetime != null && { updated_datetime: rule.updated_datetime }),
            ...(rule.deactivated_datetime != null && { deactivated_datetime: rule.deactivated_datetime }),
            ...(rule.type != null && { type: rule.type }),
            ...(rule.uri != null && { uri: rule.uri })
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
