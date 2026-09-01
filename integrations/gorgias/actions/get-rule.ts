import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the automation rule to retrieve.')
    })
    .describe('Input for retrieving a single automation rule by its unique identifier.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the automation rule.'),
        name: z.string().describe('The name of the automation rule.'),
        description: z.string().nullable().optional().describe('The description of the automation rule.'),
        created_datetime: z.string().optional().describe('ISO 8601 timestamp when the rule was created.'),
        updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the rule was last updated.'),
        uri: z.string().optional().describe('The API URI of the rule resource.'),
        code: z.string().optional().describe('The rule logic expressed as code.'),
        code_ast: z.record(z.string(), z.unknown()).optional().describe('The parsed abstract syntax tree of the rule code.'),
        deactivated_datetime: z.string().nullable().optional().describe('ISO 8601 timestamp when the rule was deactivated, or null if active.'),
        event_types: z.string().nullable().optional().describe('The event types that trigger this rule.'),
        settings: z.unknown().optional().describe('Additional rule settings.'),
        priority: z.number().optional().describe('The priority of the rule.'),
        type: z.string().optional().describe('The type of the rule.')
    })
    .describe('Output representing a single automation rule, including its code and parsed AST.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single automation rule by ID from the Gorgias API.
 */
const action = createAction({
    description: 'Retrieve a single automation rule, including its code and parsed AST.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-rule
            endpoint: `/api/rules/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const rule = OutputSchema.parse(response.data);
        return rule;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
