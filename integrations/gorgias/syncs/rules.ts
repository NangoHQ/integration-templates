import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderRuleSchema = z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    description: z.string().nullable().optional(),
    enabled: z.boolean().optional(),
    code: z.string(),
    code_ast: z.object({}).passthrough().nullable().optional(),
    order: z.number().optional(),
    created_datetime: z.string(),
    updated_datetime: z.string(),
    deleted_datetime: z.string().nullable().optional(),
    uri: z.string()
});

const RuleSchema = z
    .object({
        id: z.string().describe('Unique identifier of the rule.'),
        name: z.string().describe('Name of the automation rule.'),
        description: z.string().optional().describe('Description of what the rule does.'),
        enabled: z.boolean().optional().describe('Whether the rule is currently enabled and active.'),
        code: z.string().describe('The rule logic as a code string.'),
        code_ast: z.object({}).passthrough().optional().describe('Abstract syntax tree representation of the rule code.'),
        order: z.number().optional().describe('Execution order priority of the rule.'),
        created_datetime: z.string().describe('ISO 8601 timestamp when the rule was created.'),
        updated_datetime: z.string().describe('ISO 8601 timestamp when the rule was last updated.'),
        deleted_datetime: z.string().optional().describe('ISO 8601 timestamp when the rule was soft-deleted, if applicable.'),
        uri: z.string().describe('API URI of the rule resource.')
    })
    .describe('An automation rule in Gorgias.');

const sync = createSync({
    description: 'Sync automation rules.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Rule: RuleSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Rule');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-rules
            endpoint: '/api/rules',
            params: {
                order_by: 'created_datetime:desc'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const rules = pageResults.map((record) => {
                const parsed = ProviderRuleSchema.parse(record);

                return {
                    id: String(parsed.id),
                    name: parsed.name,
                    ...(parsed.description != null && { description: parsed.description }),
                    ...(parsed.enabled !== undefined && { enabled: parsed.enabled }),
                    code: parsed.code,
                    ...(parsed.code_ast != null && { code_ast: parsed.code_ast }),
                    ...(parsed.order !== undefined && { order: parsed.order }),
                    created_datetime: parsed.created_datetime,
                    updated_datetime: parsed.updated_datetime,
                    ...(parsed.deleted_datetime != null && { deleted_datetime: parsed.deleted_datetime }),
                    uri: parsed.uri
                };
            });

            if (rules.length > 0) {
                await nango.batchSave(rules, 'Rule');
            }
        }

        await nango.trackDeletesEnd('Rule');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
