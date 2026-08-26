import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the rule to update. Example: 1234'),
        name: z.string().optional().describe('The new name of the rule.'),
        code: z.string().optional().describe('The new logic of the rule as JavaScript code.'),
        description: z.string().nullable().optional().describe('The new description of the rule. Pass null to clear it.')
    })
    .describe('Input to update an existing rule.');

const ProviderRuleSchema = z.object({
    id: z.number(),
    name: z.string(),
    code: z.string(),
    description: z.string().nullable().optional(),
    event_types: z.string().optional(),
    priority: z.number().optional(),
    created_datetime: z.string().optional(),
    updated_datetime: z.string().optional(),
    deactivated_datetime: z.string().nullable().optional(),
    uri: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the updated rule.'),
        name: z.string().describe('The name of the updated rule.'),
        code: z.string().describe('The logic of the updated rule as JavaScript code.'),
        description: z.string().nullable().optional().describe('The description of the updated rule.'),
        event_types: z.string().optional().describe('A comma-separated list of events this rule executes on.'),
        priority: z.number().optional().describe('The execution priority of the rule. Higher values run first.'),
        created_datetime: z.string().optional().describe('When the rule was created.'),
        updated_datetime: z.string().optional().describe('When the rule was last updated.'),
        deactivated_datetime: z.string().nullable().optional().describe('When the rule was deactivated, if applicable.'),
        uri: z.string().optional().describe('The URI of the rule.')
    })
    .describe('The updated rule returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing rule via a PUT request to the provider.
 */
const action = createAction({
    description: "Update a rule's name, code, or description.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['rules:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.code !== undefined) {
            body['code'] = input.code;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }

        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-rule
            endpoint: `/api/rules/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        const providerRule = ProviderRuleSchema.parse(response.data);

        return {
            id: providerRule.id,
            name: providerRule.name,
            code: providerRule.code,
            description: providerRule.description,
            event_types: providerRule.event_types,
            priority: providerRule.priority,
            created_datetime: providerRule.created_datetime,
            updated_datetime: providerRule.updated_datetime,
            deactivated_datetime: providerRule.deactivated_datetime,
            uri: providerRule.uri
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
