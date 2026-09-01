import { z } from 'zod';
import { createAction } from 'nango';

const ListRulesInputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Maximum number of rules to return per page.'),
        order_by: z.string().optional().describe('Sort order, e.g. "created_datetime:desc" or "updated_datetime:asc".'),
        search: z.string().optional().describe('Free-text search query to filter rules by name or content.')
    })
    .describe('Input parameters for listing automation rules.');

const ProviderRuleSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional(),
    deactivated_datetime: z.string().nullable().optional(),
    event_types: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    code_ast: z.record(z.string(), z.unknown()).nullable().optional(),
    priority: z.number().nullable().optional(),
    type: z.string().nullable().optional(),
    uri: z.string().nullable().optional()
});

const RuleSchema = z.object({
    id: z.number().describe('Unique rule identifier.'),
    name: z.string().describe('Display name of the automation rule.'),
    description: z.string().optional().describe('Human-readable description of what the rule does.'),
    created_datetime: z.string().optional().describe('ISO 8601 timestamp when the rule was created.'),
    updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the rule was last modified.'),
    deactivated_datetime: z.string().optional().describe('ISO 8601 timestamp when the rule was deactivated, if applicable.'),
    event_types: z.string().optional().describe('The event types that trigger this rule.'),
    code: z.string().optional().describe('The rule logic expressed as code.'),
    code_ast: z.record(z.string(), z.unknown()).optional().describe('The parsed abstract syntax tree of the rule code.'),
    priority: z.number().optional().describe('The priority of the rule.'),
    type: z.string().optional().describe('The type of the rule.'),
    uri: z.string().optional().describe('The API URI of the rule resource.')
});

const ListRulesOutputSchema = z
    .object({
        items: z.array(RuleSchema).describe('List of automation rules matching the query.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page, if more results exist.')
    })
    .describe('Paginated list of automation rules from the provider.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of automation rules from the provider API.
 */
const action = createAction({
    description: 'List automation rules, optionally searched.',
    version: '1.0.0',
    input: ListRulesInputSchema,
    output: ListRulesOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListRulesOutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/list-rules
            endpoint: '/api/rules',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.search !== undefined && { search: input.search })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            data: z.array(z.object({}).passthrough()),
            meta: z
                .object({
                    prev_cursor: z.string().nullable().optional(),
                    next_cursor: z.string().nullable().optional()
                })
                .optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((rawRule: unknown) => {
            const rule = ProviderRuleSchema.parse(rawRule);
            return {
                id: rule.id,
                name: rule.name,
                ...(rule.description != null && { description: rule.description }),
                ...(rule.created_datetime != null && { created_datetime: rule.created_datetime }),
                ...(rule.updated_datetime != null && { updated_datetime: rule.updated_datetime }),
                ...(rule.deactivated_datetime != null && { deactivated_datetime: rule.deactivated_datetime }),
                ...(rule.event_types != null && { event_types: rule.event_types }),
                ...(rule.code != null && { code: rule.code }),
                ...(rule.code_ast != null && { code_ast: rule.code_ast }),
                ...(rule.priority != null && { priority: rule.priority }),
                ...(rule.type != null && { type: rule.type }),
                ...(rule.uri != null && { uri: rule.uri })
            };
        });

        return {
            items,
            ...(providerResponse.meta?.next_cursor != null && { next_cursor: providerResponse.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
